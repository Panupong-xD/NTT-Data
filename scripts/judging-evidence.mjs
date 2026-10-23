// Read-only AWS evidence. No model invocations, patient records or billing APIs.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const models = new Set(['amazon.nova-micro-v1:0', 'amazon.nova-lite-v1:0', 'qwen.qwen3-next-80b-a3b']);
const validNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const percentile = (numbers, fraction) => numbers.length ? [...numbers].sort((a, b) => a - b)[Math.max(0, Math.ceil(numbers.length * fraction) - 1)] : null;
export function summarizeEvents(events, truncated = false) {
  const requests = [], completed = [], usage = [];
  const ids = new Set();
  for (const event of events) {
    if (event.eventId && ids.has(event.eventId)) continue;
    if (event.eventId) ids.add(event.eventId);
    const message = String(event.message || '');
    let row;
    try { row = JSON.parse(message.slice(message.indexOf('{'))); } catch { continue; }
    if (!row || typeof row !== 'object') continue;
    if (row.event === 'ai_request' && Number.isInteger(row.status) && row.status >= 100 && row.status <= 599) requests.push(row);
    if (row.event === 'agent_completed' && validNumber(row.modelCalls) && validNumber(row.toolCalls)) completed.push(row);
    if (row.event === 'ai_usage') usage.push(row);
  }
  const byModel = {};
  for (const row of usage) {
    const model = models.has(row.modelId) ? row.modelId : 'other';
    const totals = byModel[model] ||= { responses: 0, responsesWithTokenUsage: 0, inputTokens: 0, outputTokens: 0 };
    totals.responses++;
    if (validNumber(row.inputTokens) && validNumber(row.outputTokens)) {
      totals.responsesWithTokenUsage++; totals.inputTokens += row.inputTokens; totals.outputTokens += row.outputTokens;
    }
  }
  const successful = requests.filter(row => row.status >= 200 && row.status < 300).length;
  const statuses = {};
  for (const row of requests) statuses[row.status] = (statuses[row.status] || 0) + 1;
  const durations = requests.map(row => row.durationMs).filter(validNumber);
  return {
    scope: 'Observed application logs only; HTTP success is not clinical correctness or a completed care workflow.',
    truncated,
    requests: { observed: requests.length, successful, successRate: requests.length ? successful / requests.length : null, statuses,
      medianDurationMs: percentile(durations, 0.5), p95DurationMs: percentile(durations, 0.95) },
    agents: { completed: completed.length, withTools: completed.filter(row => row.toolCalls > 0).length,
      modelCalls: completed.reduce((n, row) => n + row.modelCalls, 0), toolCalls: completed.reduce((n, row) => n + row.toolCalls, 0),
      draftsRequiringConfirmation: completed.filter(row => row.requiresConfirmation === true).length },
    byModel,
    cost: { billedUSD: null, reason: 'Token logs are not the AWS bill. Attach actual AWS Billing/credit evidence and calculator rates separately.' },
    limitations: ['No events means no evidence, not zero cost.', 'Failed calls or missing usage fields may still incur charges.', 'Logs are bounded and can be incomplete; no patient IDs, prompts or tool arguments are exported.', 'Before/after user task times must be measured separately.']
  };
}
export function validateAccount(stack, caller, region) {
  const match = /^arn:aws:cloudformation:([^:]+):(\d{12}):stack\//.exec(stack?.StackId || '');
  if (!match || match[1] !== region || match[2] !== caller?.Account) throw new Error('Stack must belong to the signed-in account and selected region');
}
export async function collect(args) {
  const [stackName, region = 'us-east-1', hoursText = '24', output = 'judging-evidence.json'] = args;
  const hours = Number(hoursText);
  if (!stackName || !['us-east-1', 'ap-southeast-1', 'ap-southeast-7'].includes(region) || !Number.isFinite(hours) || hours <= 0 || hours > 168 || !output.endsWith('.json')) throw new Error('Usage: node scripts/judging-evidence.mjs STACK REGION HOURS(1-168) OUTPUT.json');
  const aws = (...parts) => JSON.parse(execFileSync('aws', [...parts, '--region', region, '--output', 'json', '--no-cli-pager'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
  const caller = aws('sts', 'get-caller-identity');
  const stack = aws('cloudformation', 'describe-stacks', '--stack-name', stackName).Stacks[0];
  validateAccount(stack, caller, region);
  const outputs = Object.fromEntries(stack.Outputs.map(row => [row.OutputKey, row.OutputValue]));
  const functionName = outputs.BackendFunctionName;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(functionName || '')) throw new Error('Missing backend function output');
  const endTime = Date.now(), startTime = endTime - hours * 3600000;
  const events = [];
  let token;
  for (let page = 0; page < 10; page++) {
    const result = aws('logs', 'filter-log-events', '--log-group-name', `/aws/lambda/${functionName}`, '--start-time', String(startTime), '--end-time', String(endTime),
      '--filter-pattern', '{ ($.event = "ai_request") || ($.event = "ai_usage") || ($.event = "agent_completed") }', '--limit', '1000', '--no-paginate', ...(token ? ['--next-token', token] : []));
    events.push(...(result.events || []));
    const previous = token; token = result.nextToken;
    if (!token || token === previous) break;
  }
  const report = { generatedAt: new Date().toISOString(), region, from: new Date(startTime).toISOString(), to: new Date(endTime).toISOString(), ...summarizeEvents(events, Boolean(token)) };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(`Saved sanitized, read-only evidence to ${output}; ${report.requests.observed} observed API requests. No models invoked.`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) collect(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
