// Read-only diagnostics. Prints configuration and sanitized error identifiers only.
import { execFileSync } from 'node:child_process';
const [stackName, region = 'us-east-1'] = process.argv.slice(2);
if (!stackName || !['us-east-1', 'ap-southeast-1', 'ap-southeast-7'].includes(region)) throw new Error('Usage: node scripts/diagnose-aws.mjs STACK REGION');
const aws = (...args) => JSON.parse(execFileSync('aws', [...args, '--region', region, '--output', 'json'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}));
function check(label, action) {
  try { console.log(JSON.stringify({check: label, result: action()}, null, 2)); }
  catch (e) { const code = /\(([^)]+)\) when calling/.exec(String(e.stderr || ''))?.[1]; console.log(JSON.stringify({check: label, error: code || 'CheckFailed'})); }
}
const stack = aws('cloudformation', 'describe-stacks', '--stack-name', stackName).Stacks[0];
const out = Object.fromEntries(stack.Outputs.map(o => [o.OutputKey, o.OutputValue]));
check('backend configuration', () => {
  const f = aws('lambda', 'get-function-configuration', '--function-name', out.BackendFunctionName);
  return {state: f.State, update: f.LastUpdateStatus, tableMatchesStack: f.Environment?.Variables?.DYNAMODB_TABLE === out.DynamoDBTableName, roleMatchesStack: f.Role === out.BackendExecutionRoleArn, aiEnabled: f.Environment?.Variables?.AI_ENABLED};
});
check('recent backend errors', () => {
  const result = aws('logs', 'filter-log-events', '--log-group-name', `/aws/lambda/${out.BackendFunctionName}`, '--start-time', String(Date.now() - 30 * 60000), '--filter-pattern', '"request_failed"', '--limit', '30', '--no-paginate');
  return (result.events || []).flatMap(e => {
    try {
      const value = JSON.parse(e.message.slice(e.message.indexOf('{')).trim());
      if (value.event !== 'request_failed') return [];
      return [{time: new Date(e.timestamp).toISOString(), requestId: value.requestId, errorType: value.errorType}];
    } catch { return []; }
  });
});
check('Cognito sign-in', () => {
  const p = aws('cognito-idp', 'describe-user-pool', '--user-pool-id', out.CognitoUserPoolId).UserPool;
  return {tier: p.UserPoolTier, firstFactors: p.Policies?.SignInPolicy?.AllowedFirstAuthFactors, emailSendingAccount: p.EmailConfiguration?.EmailSendingAccount || 'COGNITO_DEFAULT', mfa: p.MfaConfiguration};
});
check('SES readiness', () => {
  const a = aws('sesv2', 'get-account');
  return {sendingEnabled: a.SendingEnabled, productionAccess: a.ProductionAccessEnabled, sendQuota: a.SendQuota};
});
check('SES identities', () => aws('sesv2', 'list-email-identities').EmailIdentities?.map(i => ({identity: i.IdentityName, verified: i.VerifiedForSendingStatus})));
console.log('No AWS resources were changed. Error identifiers help diagnose the backend; OTP setup alone does not fix a database error.');
