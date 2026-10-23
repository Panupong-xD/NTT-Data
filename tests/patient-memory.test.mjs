import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { validateRelease } from '../scripts/deploy-memory-update.mjs';
import { verifyAssets, stageAssets } from '../scripts/release-artifacts.mjs';
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
let client = readFileSync(new URL('../lib/services/patient-memory.ts', import.meta.url), 'utf8');
client = client.replace('import { cloudRequest } from "./cloud-auth";', 'const cloudRequest = async () => { throw new Error("No network in tests"); };');
const { nutritionFromAnalysis } = await import(url(compile(client)));
const analysis = { name: 'อาหาร', calories: '500 kcal', protein: '20 g', carbs: '60 g', fat: '15 g', sugar: 'ไม่ทราบ', sodium: '0.7 g', score: 'ไม่ระบุ', recommendation: 'ตัวอย่าง' };
test('nutrition preserves unknowns, normalizes units and scales explicit portions', () => {
  const result = nutritionFromAnalysis(analysis, 0.5);
  assert.equal(result.calories, 250); assert.equal(result.sodium, 350); assert.equal(result.sugar, null);
  assert.equal(nutritionFromAnalysis({ ...analysis, protein: '500 mg' }, 1).protein, 0.5);
  for (const value of ['500–600 kcal', 'ประมาณ 500', 'unknown', '500 g']) assert.equal(nutritionFromAnalysis({ ...analysis, calories: value }, 1).calories, null);
  assert.ok(Object.values(nutritionFromAnalysis(analysis, null)).every(v => v === null));
});
test('release cannot update another stack or deploy a corrupt backend', () => {
  const zip = Buffer.from('synthetic code');
  const build = { mode: 'aws', revision: 'judging-ready-20261023-v1', clientId: 'client', domain: 'https://example.test', backendSHA256: createHash('sha256').update(zip).digest('base64') };
  const outputs = { CognitoClientId: 'client', CognitoDomain: build.domain, BackendExecutionRoleArn: 'role', DynamoDBTableName: 'table' };
  const config = { Role: 'role', Environment: { Variables: { DYNAMODB_TABLE: 'table', AI_ENABLED: 'true', BEDROCK_MODEL: 'current-model' } }, Runtime: 'nodejs22.x', Architectures: ['arm64'], State: 'Active', LastUpdateStatus: 'Successful' };
  const original = structuredClone(config);
  assert.doesNotThrow(() => validateRelease(build, outputs, config, zip));
  assert.deepEqual(config, original);
  assert.throws(() => validateRelease(build, { ...outputs, CognitoClientId: 'other' }, config, zip));
  assert.throws(() => validateRelease(build, outputs, { ...config, Role: 'other' }, zip));
  assert.throws(() => validateRelease(build, outputs, config, Buffer.from('wrong')));
  assert.throws(() => validateRelease({ ...build, revision: 'old' }, outputs, config, zip));
});

test('publishing a prebuilt release excludes obsolete files left by an older unzip', () => {
  const directory = mkdtempSync(join(tmpdir(), 'wellync-test-assets-'));
  let staged;
  try {
    writeFileSync(join(directory, 'index.html'), 'new page');
    writeFileSync(join(directory, 'old.js'), 'old asset');
    const build = { assets: { 'index.html': createHash('sha256').update('new page').digest('hex') } };
    writeFileSync(join(directory, 'wellync-build.json'), JSON.stringify(build));
    staged = stageAssets(directory, build);
    assert.deepEqual(readdirSync(staged.directory).sort(), ['index.html', 'wellync-build.json']);
    assert.throws(() => verifyAssets(directory, { assets: { '../secret': 'a'.repeat(64) } }));
    writeFileSync(join(directory, 'index.html'), 'changed');
    assert.throws(() => verifyAssets(directory, build));
  } finally { staged?.cleanup(); rmSync(directory, { recursive: true, force: true }); }
});

const react = JSON.stringify(import.meta.resolve('react'));
let source = readFileSync(new URL('../components/health/patient-memory.tsx', import.meta.url), 'utf8');
const stubs = url(`import {createElement} from ${react};
 const box=({children,...props})=>createElement('div',props,children);
 export default box; export const Button=({children,...props})=>createElement('button',props,children),Input=props=>createElement('input',props);
 export const isAwsMode=true; export const toast={success(){},error(){}};
 const no=()=>{throw new Error('No network in render test')};
 export const createFollowUp=no,getPatientContext=no,getMeals=no,getFollowUps=no,removeMeal=no,saveMeal=no,savePatientPreferences=no,updateFollowUp=no,nutritionFromAnalysis=no;
`);
source = source.replace(/from "(?:next\/link|sonner|@\/[^"\n]+)"/g, `from "${stubs}"`).replace('from "react"', `from ${react}`);
const { MealConfirmation, AssistantDraftCard } = await import(url(compile(`import * as React from ${react};\n${source}`)));
test('food analysis requires a visible confirmation before becoming a meal record', () => {
  const html = renderToStaticMarkup(createElement(MealConfirmation, { analysis, patientId: 'P-1', fromImage: true }));
  assert.ok(html.includes('บันทึกมื้อนี้')); assert.ok(html.includes('มื้อนี้คุณกินจริงใช่ไหม'));
  assert.ok(html.includes('ไม่เก็บรูปต้นฉบับ')); assert.ok(html.includes('ปริมาณที่กิน'));
});
test('agent proposals expose confirmation and never imply an already published care plan', () => {
  const preference = renderToStaticMarkup(createElement(AssistantDraftCard, { patientId: 'P-1', draft: { type: 'preference', notes: 'ชอบอาหารง่าย', expectedVersion: 0 } }));
  assert.ok(preference.includes('ยืนยันให้จำข้อมูลนี้'));
  const followUp = renderToStaticMarkup(createElement(AssistantDraftCard, { patientId: 'P-1', draft: { type: 'follow-up', title: 'ติดตาม', note: 'ขอช่วยดู' } }));
  assert.ok(followUp.includes('ยืนยันส่งให้ผู้ดูแล'));
  const carePlan = renderToStaticMarkup(createElement(AssistantDraftCard, { patientId: 'P-1', draft: { type: 'care-plan', summary: 'ร่าง' } }));
  assert.ok(carePlan.includes('ร่างนี้ยังไม่เปลี่ยนแผน'));
});
