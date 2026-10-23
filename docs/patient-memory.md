# Shared patient context and bounded role agents

Release: `memory-agents-20261022-v1`.

## User journey

1. Patient analyzes a food photo or menu name, reviews the name and portion, and presses **บันทึกมื้อนี้**. Merely analyzing a photo does not record that it was eaten.
The patient can also save a typed menu name without calling AI; its nutrition remains unknown.

2. The food tab shows recorded meals and 7/30-day counts. A meal can be edited or deleted. Changing its identity/portion discards the previous nutrient estimates rather than reusing inappropriate values.
3. Chat selects relevant current profile, reviewed plan, explicit preferences, food aggregates and recent labeled readings. It can retrieve up to six meals, including a specific Bangkok calendar day.
4. A patient/caregiver can confirm a follow-up draft or submit a short request. Home pages show open follow-ups. The caregiver adds findings and forwards to the patient's physician only after patient consent exists.
5. The assigned physician reviews evidence in the patient page, requests more information or records a decision. Clinical plan publication remains a separate explicit action in the care-plan page. Published plans are used by subsequent context reads and ordinary patient/caregiver pages.
6. Patient/caregiver records the outcome and explicitly closes the follow-up. The model cannot publish a plan, change medication, confirm that food was eaten, send a case, or close a case by itself.

The profile page contains **สิ่งที่ระบบจำเกี่ยวกับฉัน**. Preferences are explicit, versioned, editable and clearable. They never overwrite clinical diagnosis, allergies or medication. Caregiver wellbeing check-ins and private conversations are not shared into patient context.

## Storage and retention

Uses the existing DynamoDB table and existing runtime permissions. No new AWS infrastructure is required.

| Partition | Data | Retention |
| --- | --- | --- |
| `MEALS#patientId` | Confirmed structured meals, keyed by Bangkok date and stable request ID | 90 days from the meal day |
| `MEMORY#patientId`, `DAY#date` | Meal count, counts by confirmed dish name, known-estimate counts and sums | 365 days |
| `MEMORY#patientId`, `PREFERENCES` | Patient-confirmed everyday preferences | Until edited/cleared |
| `MEMORY#patientId`, `HEAD` | Context revision and bounded active-case index | While account is in use |
| `FOLLOWUP#patientId` | Shared notes, author role, recipient, state and version | Open cases retained; closed cases expire after 30 days |
| Existing `CHAT#subject#patient#session` | Private chat turns with source revision | 30 days |

Images/Base64 are never accepted by the meal-storage schema or written into chat history. Image analysis still uses Bedrock and transient browser/request memory. App logs do not include image data, prompts or medical payloads. There is no new food-image S3 bucket.

TTL is asynchronous: expired data is excluded from reads before physical removal. App deletion/forgetting does not purge existing backup/PITR history; existing backup retention still applies. Individual meal edits are available during the 90-day detail window. Older daily summaries retain only aggregate information, not reconstructible individual meal history.

Meal, daily summary and revision are committed in one conditional transaction. An identical retry of initial confirmation returns the original meal. Stale versions return 409. Missing nutrient quantities remain null; zero is not substituted for missing estimates. Meal counts measure recorded meals, not all meals consumed. Frequency by dish name is exact-name grouping, not inferred ingredient/medical classification.

Limits: 20 meals per day, 20 simultaneous open follow-ups, bounded notes per case, 30 meals per API page. Meals and follow-ups are outside the existing `/api/state` patient snapshot, so adding meals does not consume its clinical-record limit. Existing clinical snapshot limits are unchanged; large historical clinical datasets still need a separate timeline/archive migration.

## Agent behavior and cost controls

The agent loop runs in the existing Lambda with Bedrock Converse tool calling. This release does not provision AgentCore Runtime, AgentCore Memory, Agents Classic, a vector store, or a Knowledge Base. The loop can later be hosted in AgentCore separately if desired and permitted by the account.

Role-specific tools:

- All roles: `read_recent_meals`, `read_follow_ups`, `read_food_summary`.
- Patient/caregiver: `prepare_follow_up`.
- Patient: `prepare_preference`.
- Doctor: `prepare_care_plan`.

Draft tools only prepare validated data for a visible confirmation card. Actual mutations go through authenticated, role-scoped APIs. Patient IDs are supplied by the server's verified context, never accepted from tool arguments. Physician consent is checked on reads, before model calls, before returning results and within physician/routing write transactions.

- At most two model calls and three tool executions per chat request. The second round cannot execute more tools. Tool definitions remain in the request for compatibility with prior Converse tool-use/result blocks.
- Common chat can finish in one model call. Food/device analysis explicitly uses a single model call without tools or chat-memory writes.
- Explicit max output: 600 tokens for chat, 800 for structured/image analysis.
- Patient context packet capped at 12,000 UTF-8 bytes. This is a byte cap, not an exact token count. Actual input/output tokens are logged per model response.
- Relevant 7/30-day aggregates, selected reviewed-plan sections, up to three recent labeled readings and up to two recent chat pairs are sent. Images and full historical records are not attached repeatedly.
- Longer-range questions can request up to 365 days of daily aggregates in a bounded paginated read; the model receives only the resulting summary, not all rows.
- No nightly LLM summarization, automatic chat-to-medical-memory extraction or model calls when opening dashboards.
- Existing daily user/global byte-unit budgets are reserved before every model call. The per-minute request limit counts one logical request, including its optional second call.
- Changing/deleting a meal, changing preferences/cases, changing a reviewed plan/profile/recent reading, or crossing Bangkok midnight invalidates incompatible stored chat context. Prior visible answers are marked stale when the page receives a local memory update.

No prompt caching is assumed. Model invocation permissions and tool support must already be available for the configured chat model; deployment does not change the model, AI switch or budgets.

## Deployment

The downloadable release includes source, built static frontend and `deployment/backend.zip`. From its `Wellync` directory:

```bash
node scripts/deploy-memory-update.mjs wellync-ready us-east-1 --apply
```

Without `--apply`, the script performs read-only preflight. It checks artifact digest, Cognito configuration, backend role/table/runtime and readiness. It conditionally updates only the existing Lambda code, waits, verifies AWS code digest and public health revision, then publishes frontend assets and compares deployed references/page code. Lambda environment variables, IAM, Cognito, DynamoDB definitions and CloudFormation parameters are preserved. The frontend bucket is dedicated to web assets and is synchronized with deletion of obsolete assets.

After deployment, reload from origin and sign in. Confirm one meal, ask about today's food, edit/delete it and ask again. Test one case through patient → caregiver → physician → follow-up → explicit closure. Use different browser profiles or sign out between the existing role accounts. Bedrock calls in this acceptance test consume normal model usage; local automated tests use stubs and do not invoke AWS models.

## Validation

Automated checks cover identity/consent isolation, transaction conflicts, duplicate confirmations, pagination, date boundaries, unknown nutrition, unit conversion, editing/deletion, preference versions, case handoffs, active-case bounds, role-scoped tools, bounded loops, stale-history invalidation, structured-analysis isolation, confirmation UI rendering, and deployment-artifact guards. Live AWS model behavior remains an acceptance check after deploying to the user's account.

References: [DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html), [Bedrock Converse](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html), [AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agents-tools-runtime.html).
