import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { otpDeployConfig } from '../scripts/prepare-email-otp.mjs';
const values = {BackendExecutionRoleArn: 'arn:aws:iam::000000000000:role/backend', FrontendExecutionRoleArn: 'arn:aws:iam::000000000000:role/frontend', CognitoDomainPrefix: 'keep-domain', AIEnabled: 'false', BedrockModel: 'amazon.nova-micro-v1:0', BedrockVisionModel: '', AIUserDailyUnits: '200000', AIGlobalDailyUnits: '2000000'};
const fixture = () => ({StackId: 'arn:aws:cloudformation:us-east-1:000000000000:stack/demo/id', StackName: 'demo', StackStatus: 'CREATE_COMPLETE', Parameters: Object.entries(values).map(([ParameterKey, ParameterValue]) => ({ParameterKey, ParameterValue}))});
test('OTP update preserves execution roles, domain, AI switch and budgets', () => {
  const config = otpDeployConfig(fixture(), 'us-east-1', 'sender@example.com');
  const encoded = config.split('\n').find(l => l.startsWith('parameter_overrides = ')).slice('parameter_overrides = '.length);
  const overrides = JSON.parse(encoded);
  for (const [key, value] of Object.entries(values)) assert.ok(overrides.includes(`${key}="${value}"`));
  assert.ok(overrides.includes('EmailOtpEnabled="true"'));
  assert.ok(overrides.includes('CognitoSenderEmail="sender@example.com"'));
  assert.ok(config.includes('confirm_changeset = true'));
});
test('OTP config rejects wrong region, unstable stack, invalid sender and incomplete parameters', () => {
  assert.throws(() => otpDeployConfig(fixture(), 'ap-southeast-1', 'sender@example.com'));
  assert.throws(() => otpDeployConfig({...fixture(), StackStatus: 'ROLLBACK_COMPLETE'}, 'us-east-1', 'sender@example.com'));
  assert.throws(() => otpDeployConfig(fixture(), 'us-east-1', 'sender@example.com\nInjected=true'));
  assert.throws(() => otpDeployConfig({...fixture(), Parameters: []}, 'us-east-1', 'sender@example.com'));
});
test('passwordless stays opt-in and uses OAuth code scopes with SES in the same account and region', () => {
  const t = readFileSync(new URL('../lambda-backend/template-existing-roles.yaml', import.meta.url), 'utf8');
  assert.match(t, /EmailOtpEnabled:\n    Type: String\n    Default: 'false'/);
  assert.ok(t.includes('UserPoolTier: !If [UseEmailOtp, ESSENTIALS, LITE]'));
  assert.ok(t.includes('EmailSendingAccount: DEVELOPER'));
  assert.ok(t.includes('ses:${AWS::Region}:${AWS::AccountId}:identity/${CognitoSenderEmail}'));
  assert.ok(t.includes('AllowedFirstAuthFactors: [PASSWORD, EMAIL_OTP]'));
  assert.ok(t.includes('AllowedOAuthFlows: [code]'));
  assert.ok(t.includes('AuthorizationScopes: [openid]'));
  assert.ok(t.includes('Condition: UseEmailOtp\n    DependsOn: UserPoolDomain'));
  assert.ok(!t.includes('Type: AWS::IAM::'));
});
