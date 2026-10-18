// Read-only AWS preflight; writes a separate deploy config, never changes the user pool.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function otpDeployConfig(stack, region, sender) {
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(sender)) throw new Error("Use a verified SES email identity as sender");
  if (!['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'].includes(stack.StackStatus)) throw new Error("Stack must be stable before updating authentication");
  if (!['us-east-1', 'ap-southeast-1', 'ap-southeast-7'].includes(region) || !stack.StackId?.startsWith(`arn:aws:cloudformation:${region}:`)) throw new Error("Unexpected stack region");
  if (!/^[A-Za-z][A-Za-z0-9-]{0,127}$/.test(stack.StackName || '')) throw new Error("Invalid stack name");
  const names = ['BackendExecutionRoleArn', 'FrontendExecutionRoleArn', 'CognitoDomainPrefix', 'AIEnabled', 'BedrockModel', 'BedrockVisionModel', 'AIUserDailyUnits', 'AIGlobalDailyUnits'];
  const values = Object.fromEntries((stack.Parameters || []).filter(p => names.includes(p.ParameterKey)).map(p => [p.ParameterKey, p.ParameterValue]));
  for (const name of names) if (typeof values[name] !== 'string' || /[\r\n'"\\]/.test(values[name])) throw new Error(`Missing or invalid existing stack parameter: ${name}`);
  const account = stack.StackId.split(':')[4];
  for (const name of names.slice(0, 2)) if (!values[name].startsWith(`arn:aws:iam::${account}:role/`)) throw new Error("Execution roles must belong to this stack account");
  if (values.BackendExecutionRoleArn === values.FrontendExecutionRoleArn) throw new Error("Use separate execution roles");
  // Preserve every existing setting, including the explicit decision to keep AI disabled.
  values.EmailOtpEnabled = 'true'; values.CognitoSenderEmail = sender;
  const overrides = Object.entries(values).map(([key, value]) => `${key}="${value}"`).join(' ');
  return `version = 0.1\n[default.global.parameters]\nregion = ${JSON.stringify(region)}\n[default.deploy.parameters]\nstack_name = ${JSON.stringify(stack.StackName)}\nresolve_s3 = true\ns3_prefix = ${JSON.stringify(stack.StackName)}\nconfirm_changeset = true\ndisable_rollback = false\nfail_on_empty_changeset = false\nparameter_overrides = ${JSON.stringify(overrides)}\n`;
}

function main() {
  const [name, region, sender, usersFile = '/tmp/wellync-demo-users.json'] = process.argv.slice(2);
  if (!name || !region || !sender) throw new Error('Usage: node scripts/prepare-email-otp.mjs STACK REGION SES_SENDER [USERS_JSON]');
  const aws = (...args) => JSON.parse(execFileSync('aws', [...args, '--region', region, '--output', 'json'], {encoding: 'utf8'}));
  const stack = aws('cloudformation', 'describe-stacks', '--stack-name', name).Stacks[0];
  const config = otpDeployConfig(stack, region, sender);
  const users = JSON.parse(readFileSync(usersFile, 'utf8'));
  const recipients = ['patient', 'caregiver', 'doctor'].map(role => users[role]);
  if (recipients.some(v => typeof v !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) throw new Error('Provide all three recipient emails in USERS_JSON');
  const ses = aws('sesv2', 'get-account');
  if (ses.SendingEnabled !== true) throw new Error('SES sending is not enabled; check SES account status before deploying OTP');
  const identities = new Set(ses.ProductionAccessEnabled === true ? [sender] : [sender, ...recipients]);
  for (const email of identities) {
    const identity = aws('sesv2', 'get-email-identity', '--email-identity', email);
    if (identity.VerifiedForSendingStatus !== true) throw new Error(`Verify this SES identity first: ${email}`);
  }
  const file = resolve('lambda-backend/samconfig-otp.toml');
  writeFileSync(file, config, {mode: 0o600});
  console.log(`SES preflight passed. Created ${file}. No AWS configuration was changed.`);
  console.log('Keep the existing stack. Build template-existing-roles.yaml, then deploy its built template with this config. Reject resource replacements.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
