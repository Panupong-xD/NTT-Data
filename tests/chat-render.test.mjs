import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// Exercise the actual component with React hooks/SSR; UI decorations and network
// calls are stubbed so the regression needs no browser or AWS credentials.
const dataUrl = s => `data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const react = JSON.stringify(import.meta.resolve('react'));
const ui = dataUrl(`import {createElement} from ${react};
  const box=({children})=>createElement('div',null,children);
  export const Button=box, Input=box, HealthCharm=box;
  export const Loader2=box,Send=box,CheckCircle2=box,ChevronDown=box;
  export const MarkdownRenderer=({content})=>createElement('p',null,content);
  export const AssistantDraftCard=box;
  export const toast={success(){},info(){}};
  export const isAwsMode=true;
  export async function askAI(){throw new Error('No network in render test');}
  export async function askAssistant(){throw new Error('No network in render test');}
  export async function submitAgentAction(){}
`);
let source = readFileSync(new URL('../components/chat/mock-chat.tsx', import.meta.url), 'utf8');
source = source.replace(/^import .*?from "@\/lib\/types";\n/m, '');
source = source.replace(/from "(?:lucide-react|sonner|@\/[^"\n]+)"/g, `from "${ui}"`);
source = `import * as React from ${react};\n` + source.replace('from "react"', `from ${react}`);
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React}}).outputText;
const { MockChat } = await import(dataUrl(compiled));
test('AI tab renders for new AWS users without chat history', () => {
  for (const seedMessages of [undefined, null, []]) {
    for (const mode of ['patient', 'caregiver']) {
      const html = renderToStaticMarkup(createElement(MockChat, {title: 'ผู้ช่วย AI', mode, seedMessages}));
      assert.ok(html.includes('ผู้ช่วย AI'));
      assert.ok(html.includes(mode === 'patient' ? 'วันนี้ควรดูแลตัวเองยังไง?' : 'ช่วยจัดตารางดูแล'));
    }
  }
});
test('existing chat messages still render', () => {
  const html = renderToStaticMarkup(createElement(MockChat, {title: 'AI', mode: 'patient', seedMessages: [{id:'one', role:'assistant', content:'Existing message', time:'09:00'}]}));
  assert.ok(html.includes('Existing message'));
});
