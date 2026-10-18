# Validation record - 17 October 2026 (Asia/Bangkok)

## Passed locally

- `npm run check`: TypeScript frontend + 16 existing health/calendar tests + 23 backend/security tests (39 tests total).
- `npm run lint`: no errors or warnings after fixing the remaining hook dependencies, camera cleanup and minor lint errors.
- `npm run lint:security`: deployment invariants (no CloudFront resource, JWT/scope, no wildcard runtime resource/CORS, no bypassed type errors).
- `npm run build`: all routes exported in demo mode.
- `node scripts/build-aws.mjs /tmp/wellync-build.aws.env`: all routes exported in AWS mode; every asset below the 4 MB response budget; build manifest generated. **Used placeholder Cognito configuration for build verification only. Run aws-config and build:aws with your stack outputs before upload.**
- `sam validate --lint --template-file lambda-backend/template.yaml`: valid SAM/CloudFormation schema, including Cognito/API routes and IAM resources.
- Full `sam build`: both Lambda artifacts compiled successfully using the Makefile; network/cache permissions were needed for local npm ci, no AWS resource was created.
- IAM Policy Autopilot 0.3.0 baseline analysis of all four files containing runtime SDK calls. Resource scoping/optional-feature exclusions described in aws-readiness.md.
- Production dependency audit: `npm audit --omit=dev` and `npm --prefix lambda-backend audit --omit=dev` both report **0 vulnerabilities** at the time of this check. Next.js updated to 15.5.28 and PostCSS 8.5.30; nested PostCSS override applied in lockfile.
- Tracked-file pattern scan found no AWS access key/private key/OpenAI secret patterns. This is a limited pattern scan, not a guarantee that all secrets have been found.
- Browser: demo login -> patient home -> health records page rendered without console errors; AWS static export showed Cognito login without demo account shortcuts; unauthenticated `/patient/health/` redirected to login.

## Backend/security scenarios

Unauthenticated/ID-token rejection, unprovisioned identities, malformed JSON, foreign patient/session access, doctor consent, emergency shortcut without model invocation, scoped chat history/TTL, budget reservation before inference, quota exhaustion, DB errors without fabricated records/success, explicit review decisions, conditional review replay protection, caregiver consent denial, patient medication/assignment protection, patient self-confirm denial, immutable confirmed measurements, treatment-task field restrictions, draft publication rejection, masked doctor state before consent, invalid images, static path traversal, nested export routing, stale snapshot rejection, atomic consent decisions, consent condition during publication/review and consent-request notifications before clinical access.

AWS SDK calls are mocked in these tests; assertions inspect the actual commands/transaction conditions. They do not prove behavior of live Cognito, IAM, DynamoDB, API Gateway, Bedrock or the organization's SCPs.

## Still requires checking

- No AWS deployment, live Cognito login, email delivery, account provisioning, live Bedrock inference, IAM/SCP/quota checks, or mobile physical-camera test was performed.
- No account-aware CloudFormation change set/service pre-deployment validation was run. Review a change set and run DEPLOY.md smoke tests in the intended account.
- `cfn-guard` and `guardpycfn` are absent. The additional compliance scan was **not run**, pending permission to install a temporary tool. The CloudFormation skill requires explicit permission before installation. SAM schema validation and project security tests passed; they are separate from a Guard rules evaluation.
- Full development dependency audit reports **7 high-severity entries** in the existing Tailwind 3 / ESLint glob dependency chain (`braces`, `chokidar`, `micromatch`, `fast-glob` and dependents). The installed registry version of braces has no patched release listed; npm's suggested fixes require replacing/downgrading major tooling. Production dependencies are clean, but this development-tool risk remains. Do not process untrusted glob patterns or external CSS projects with these tools; plan a separate Tailwind/tooling upgrade with visual regression testing.
- No measured monthly cost or clinical validation. Budget units are conservative allowances, not dollar/token hard caps; verify actual tokens and Billing under realistic traffic.
- Browser AWS export tests used placeholder Cognito config and checked the local static UI/redirect only. They did not authenticate against a real user pool.

## Existing-role deployment follow-up

- Added `template-existing-roles.yaml` derived from the main template; two required, separate execution-role ARN parameters; no IAM role/policy resources.
- Added a policy-file generator using exact account/region/table/bucket/function outputs; does not modify IAM. AI permission is omitted while AIEnabled=false.
- SAM lint passed for both templates. Offline SAM translation (with a fixture S3 CodeUri to model packaging) confirms zero IAM roles and direct role-parameter references for both external-role Lambda functions.
- Four additional tests cover policy boundaries, disabled/enabled AI, foreign/shared roles and template synchronization. Root tests now 20; backend tests unchanged at 23.
- Live external-role deployment, the full existing role permissions/trust/tags and iam:PassRole remain unverified. Provided role ARN alone is insufficient to assert runtime access.

## Email OTP follow-up (2026-10-17)

- Added opt-in Cognito Essentials/EMAIL_OTP with SES DEVELOPER sender, managed login v2 and default branding, keeping code+PKCE, openid scopes, pool identity and distinct execution roles. Existing password flow remains default until SES preflight and stack update.
- Added read-only sanitized backend/SES diagnostics and deploy-config preparation that preserves existing role/domain/AI parameters and checks sandbox recipient verification.
- Patient partition loads now omit the sort-key condition when no prefix is requested; empty key operands are not sent to DynamoDB. Added regression coverage and safe request ID on 503. Actual cause of the user's live 503 still requires CloudWatch output.
- Passed root typecheck/lint/23 tests, backend build/24 tests, deployment invariants, SAM lint for both templates, offline SAM translation with OTP false and true (no managed IAM roles), AWS-mode Next static export (27 pages, OTP label).
- No live AWS update, OTP delivery, SES permissions/service-linked role, account tier update or Bedrock invocation verified locally. cfn-guard remains unavailable.
