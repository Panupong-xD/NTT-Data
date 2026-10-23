import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeEvents, validateAccount } from '../scripts/judging-evidence.mjs';
import { measure } from '../scripts/measure-workflow.mjs';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('evidence counts actual usage without equating missing logs, HTTP success or byte allowances to savings', () => {
  const event = (id, row) => ({ eventId: id, message: `timestamp INFO ${JSON.stringify(row)}` });
  const one = event('1', { event: 'ai_request', status: 200, durationMs: 500, content: 'PRIVATE_HEALTH' });
  const result = summarizeEvents([one, one, event('2', { event: 'ai_request', status: 503, durationMs: 1000 }),
    event('3', { event: 'ai_usage', modelId: 'amazon.nova-micro-v1:0', inputTokens: 200, outputTokens: 50, budgetUnits: 999999 }),
    event('4', { event: 'ai_usage', modelId: 'amazon.nova-micro-v1:0' }),
    event('5', { event: 'agent_completed', modelCalls: 2, toolCalls: 1, requiresConfirmation: true })], true);
  assert.equal(result.requests.observed, 2); assert.equal(result.requests.successRate, 0.5);
  assert.equal(result.requests.p95DurationMs, 1000); assert.equal(result.agents.withTools, 1);
  assert.equal(result.byModel['amazon.nova-micro-v1:0'].inputTokens, 200);
  assert.equal(result.byModel['amazon.nova-micro-v1:0'].responsesWithTokenUsage, 1);
  assert.equal(result.cost.billedUSD, null); assert.equal(result.truncated, true);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_HEALTH'));
  assert.equal(summarizeEvents([]).requests.successRate, null);
  const stack = { StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/example/id' };
  assert.doesNotThrow(() => validateAccount(stack, { Account: '123456789012' }, 'us-east-1'));
  assert.throws(() => validateAccount(stack, { Account: '999999999999' }, 'us-east-1'));
});

test('paired task measurement includes human review and failed tasks without inventing benefits', () => {
  const rows = [{ taskId: 'doctor-1', role: 'doctor', baselineSeconds: 120, assistedSeconds: 90, completed: true, review: 'edited' },
    { taskId: 'patient-1', role: 'patient', baselineSeconds: 40, assistedSeconds: 80, completed: false, review: 'rejected' }];
  const result = measure(rows);
  assert.equal(result.completionRate, 0.5); assert.equal(result.completedTaskSeconds.reductionPercent, 25);
  assert.equal(result.review.edited, 1); assert.equal(result.review.rejected, 1);
  assert.equal(measure([{ ...rows[0], assistedSeconds: 180 }]).completedTaskSeconds.reductionPercent, -50);
  assert.throws(() => measure([...rows, rows[0]])); assert.throws(() => measure([]));
});

const react = JSON.stringify(import.meta.resolve('react'));
const source = readFileSync(new URL('../components/health/agent-evidence.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(`import * as React from ${react};\n${source}`, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
const { AgentEvidence } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('evidence UI shows the actual long-range source and blocked tools without fake confidence', () => {
  const html = renderToStaticMarkup(createElement(AgentEvidence, { reply: { contextSource: { asOf: '2026-10-23T06:00:00Z', revision: 'one', sources: [{ label: 'สรุปอาหารย้อนหลัง 365 วัน', detail: 'มีบันทึก 40 วัน ไม่ใช่ทุกมื้อ' }] }, trace: [{ tool: 'unavailable', status: 'error' }], execution: { modelCalls: 2, toolCalls: 1, durationMs: 1000, requiresConfirmation: true } } }));
  assert.ok(html.includes('365 วัน')); assert.ok(html.includes('ไม่เปลี่ยนข้อมูล')); assert.ok(html.includes('ต้องให้คนตรวจ'));
  assert.ok(!html.includes('0.94')); assert.ok(!html.includes('จาก 7 วันล่าสุด'));
});
