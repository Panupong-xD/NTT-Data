import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

async function load(path, jsx = false) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace('from "react"', `from ${JSON.stringify(import.meta.resolve('react'))}`);
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022,
    jsx: jsx ? ts.JsxEmit.React : undefined
  } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { parseFoodAnalysis } = await load('../lib/food-analysis.ts');
const { MarkdownRenderer } = await load('../components/ui/markdown-renderer.tsx', true);
const food = { name: 'ข้าวกะเพราไข่ดาว', calories: '520 kcal', recommendation: 'ลดเครื่องปรุงเค็ม' };

test('food recommendations returned as an array render without crashing', () => {
  const parsed = parseFoodAnalysis(JSON.stringify({ ...food, recommendation: ['ลดเครื่องปรุงเค็ม', 'เพิ่มผัก'] }));
  const html = renderToStaticMarkup(createElement(MarkdownRenderer, { content: parsed.recommendation }));
  assert.ok(html.includes('<ul'));
  assert.ok(html.includes('เพิ่มผัก'));
  assert.equal(parsed.protein, 'ไม่ระบุ');
});

test('string recommendations and fenced JSON remain supported', () => {
  const parsed = parseFoodAnalysis('```json\n' + JSON.stringify(food) + '\n```');
  assert.equal(parsed.name, food.name);
  assert.equal(parsed.recommendation, food.recommendation);
  assert.equal(parsed.calories, food.calories);
});

test('numeric values stay displayable without inventing units or missing measurements', () => {
  const parsed = parseFoodAnalysis(JSON.stringify({ ...food, calories: 520, sodium: null, score: 75 }));
  assert.equal(parsed.calories, '520');
  assert.equal(parsed.score, '75');
  assert.equal(parsed.sodium, 'ไม่ระบุ');
});

test('malformed responses fail before entering render state', () => {
  for (const answer of [null, {}, 'not JSON', '[]', JSON.stringify({ ...food, name: {} }),
    JSON.stringify({ ...food, calories: { value: 520 } }),
    JSON.stringify({ ...food, recommendation: { tip: 'เพิ่มผัก' } }),
    JSON.stringify({ ...food, recommendation: ['เพิ่มผัก', {}] })]) {
    assert.throws(() => parseFoodAnalysis(answer));
  }
});

test('markdown renderer does not crash when a caller supplies non-text at runtime', () => {
  for (const content of [null, undefined, ['เพิ่มผัก'], { tip: 'เพิ่มผัก' }, 123]) {
    assert.equal(renderToStaticMarkup(createElement(MarkdownRenderer, { content })), '');
  }
  assert.ok(renderToStaticMarkup(createElement(MarkdownRenderer, { content: '**เพิ่มผัก**' })).includes('<strong'));
});
