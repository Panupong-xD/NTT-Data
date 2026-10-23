import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { verifyAssets } from './release-artifacts.mjs';

export function validateRelease(build, outputs, config, zip) {
  if (build.mode !== 'aws' || build.revision !== 'memory-agents-20261022-v1') throw new Error('Wrong release bundle');
  if (build.clientId !== outputs.CognitoClientId || build.domain !== outputs.CognitoDomain) throw new Error('Frontend belongs to a different Cognito client');
  if (config.Role !== outputs.BackendExecutionRoleArn || config.Environment?.Variables?.DYNAMODB_TABLE !== outputs.DynamoDBTableName) throw new Error('Backend configuration differs from the selected stack');
  if (config.Runtime !== 'nodejs22.x' || !config.Architectures?.includes('arm64')) throw new Error('This bundle expects the existing Node.js 22 arm64 backend');
  if (config.State !== 'Active' || config.LastUpdateStatus !== 'Successful') throw new Error('Backend is not ready for a code update');
  if (createHash('sha256').update(zip).digest('base64') !== build.backendSHA256) throw new Error('Backend artifact checksum mismatch');
}
export async function deploy(args) {
  const [stack, region = 'us-east-1', flag] = args;
  if (!stack || !['us-east-1', 'ap-southeast-1', 'ap-southeast-7'].includes(region) || flag && flag !== '--apply') throw new Error('Usage: node scripts/deploy-memory-update.mjs STACK REGION [--apply]');
  const aws = (...parts) => JSON.parse(execFileSync('aws', [...parts, '--region', region, '--output', 'json'], { encoding: 'utf8' }));
  const build = JSON.parse(readFileSync('out/wellync-build.json', 'utf8'));
  const stackData = aws('cloudformation', 'describe-stacks', '--stack-name', stack).Stacks[0];
  const outputs = Object.fromEntries(stackData.Outputs.map(item => [item.OutputKey, item.OutputValue]));
  const config = aws('lambda', 'get-function-configuration', '--function-name', outputs.BackendFunctionName);
  const zip = readFileSync('deployment/backend.zip');
  validateRelease(build, outputs, config, zip);
  verifyAssets('out', build);
  console.log(`Validated ${build.revision} for stack ${stack} in ${region}`);
  console.log(`AI configuration is preserved (${config.Environment?.Variables?.AI_ENABLED === 'true' ? 'enabled' : 'disabled'}); no IAM or CloudFormation changes.`);
  if (flag !== '--apply') { console.log('Read-only preflight passed. Add --apply to update the existing backend code and frontend.'); return; }
  // Optimistic concurrency prevents replacing a concurrent code/configuration update.
  aws('lambda', 'update-function-code', '--function-name', outputs.BackendFunctionName, '--revision-id', config.RevisionId, '--zip-file', 'fileb://deployment/backend.zip');
  execFileSync('aws', ['lambda', 'wait', 'function-updated-v2', '--function-name', outputs.BackendFunctionName, '--region', region], { stdio: 'inherit' });
  const updated = aws('lambda', 'get-function-configuration', '--function-name', outputs.BackendFunctionName);
  if (updated.CodeSha256 !== build.backendSHA256) throw new Error('Backend verification failed; frontend was not changed');
  const health = await fetch(`${outputs.ApiEndpoint}/api/health?verify=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!health.ok || (await health.json()).revision !== build.revision) throw new Error('Backend health revision differs; frontend was not changed');
  console.log(`Verified backend: ${build.revision}`);
  execFileSync(process.execPath, ['scripts/publish-frontend.mjs', stack, region, '--apply'], { stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/verify-frontend.mjs', stack, region], { stdio: 'inherit' });
  console.log('Memory and role agents release is deployed. Sign in and confirm one meal to test the shared context.');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  deploy(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
