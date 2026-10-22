// Read-only: compare the deployed food page and renderer with this build.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const [stack, region = 'us-east-1'] = process.argv.slice(2);
if (!stack || !['us-east-1', 'ap-southeast-1', 'ap-southeast-7'].includes(region)) {
  throw new Error('Usage: node scripts/verify-frontend.mjs STACK REGION');
}
const data = JSON.parse(execFileSync('aws', ['cloudformation', 'describe-stacks', '--stack-name', stack, '--region', region, '--output', 'json'], { encoding: 'utf8' }));
const endpoint = data.Stacks[0].Outputs.find(item => item.OutputKey === 'ApiEndpoint')?.OutputValue;
if (!endpoint?.startsWith('https://')) throw new Error('Missing HTTPS frontend endpoint');
async function get(path) {
  const url = new URL(path, endpoint);
  url.searchParams.set('verify', String(Date.now()));
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Frontend returned HTTP ${response.status} for ${path}`);
  return response.text();
}
const html = await get('/patient/health/');
const localHtml = readFileSync('out/patient/health/index.html', 'utf8');
const rendererPattern = /src="([^" ]*\/580-[^" ]+\.js)"/;
const expected = localHtml.match(rendererPattern)?.[1];
if (!expected || html.match(rendererPattern)?.[1] !== expected) throw new Error('Deployed food page does not reference this build');
const actual = await get(expected);
const hash = text => createHash('sha256').update(text).digest('hex');
if (hash(actual) !== hash(readFileSync(`out${expected}`, 'utf8'))) throw new Error('Deployed renderer differs from this build');
console.log(`Verified food renderer: ${expected.split('/').pop()}`);
console.log('Deployed food page and renderer match this build.');
