# AWS readiness review

## สิ่งที่แก้

| จุดเดิม | พฤติกรรมใหม่ |
|---|---|
| เลือก role จากอีเมลโดยไม่ตรวจ password | AWS mode ใช้ Cognito authorization code + PKCE; role และ patient assignment จาก DynamoDB ที่ admin provision |
| API เปิด public / CORS `*` | JWT access token + openid scope, role และ patient/consent checks; local dev CORS ระบุ origin |
| ผู้ใช้ส่ง patient/session/model/doctorId เอง | patient ต้องได้รับมอบหมาย; chat key มี verified Cognito subject; ไม่รับ model/doctorId/critical tier จาก client |
| DB/AI ล้มเหลวคืน clinical mock และ success | Fail closed, ไม่ปลอมผลลัพธ์; demo แยกผ่าน build mode |
| Scan ทุก approval, update เพิ่ม row สถานะใหม่ | Query partition ผู้ป่วยที่มี consent; status เปลี่ยนใน item เดิมด้วย condition `PENDING` |
| AI อาจอ้างว่าเปลี่ยนยา/แจ้งแพทย์แล้ว | ไม่ execute treatment; แพทย์ review และ publish แผนเอง; emergency heuristic ไม่อ้าง dispatch |
| ประวัติไม่จำกัดและเลือกโมเดลแพงได้ | จำกัด input/window/output, allowlist Nova, timeout และ atomic minute/user/global allowances |
| Files ไม่ได้ส่งเข้าโมเดลจริง | ส่ง image bytes ผ่าน Converse กับ vision model เมื่อ admin เปิด; ตรวจ MIME/magic/ขนาด |
| Next build ข้าม type errors, lint command ใช้ไม่ได้ | เปิด type check, ESLint flat config, backend/security tests และ SAM lint |
| Hardcoded API ของบัญชีเก่า | Build config มาจาก stack outputs; same-origin API |
| S3 + CloudFront ตาม README เก่า | HTTPS API Gateway -> static Lambda -> private S3; ไม่มี CloudFront |

## ขอบเขต prototype และข้อจำกัดที่ยังมี

- ไม่ได้ deploy หรือยืนยันสิทธิ์/quotas/model inference ในบัญชี AWS ของผู้ใช้ ต้องตรวจ smoke tests ใน DEPLOY.md หลังสร้าง stack
- ทดสอบ backend โดย mock AWS SDK เพื่อพิสูจน์ authorization/validation/atomic write intents ไม่ได้แทน integration/load test บน AWS จริง
- เป็น UI/contract ที่ใช้แนวคิด FHIR ยังไม่ได้เชื่อม HL7 FHIR server หรือรับรองมาตรฐานทางการแพทย์/PDPA
- Consent ตัดการเข้าถึงใน request ถัดไป ข้อมูลที่ผู้มีสิทธิ์ดูไปแล้วเรียกคืนไม่ได้; browser refresh scoped state ทุก 30 วินาทีและหยุดแสดงข้อมูลเมื่อ refresh ล้มเหลว
- Backend จำกัด 300 items/1 MB ต่อ patient query และไม่คืนข้อมูลบางส่วนเงียบ ๆ; ถ้าเกินจะตอบ 413 ต้องเพิ่ม pagination/archive ก่อนขยายขนาด
- State mutations ใช้ schema allowlist + role checks + optimistic version conditions; ไม่มี arbitrary JSON snapshot overwrite. Doctor clinical writes มี consent condition ใน transaction
- Draft care plans เก็บใน memory ของแท็บ ยังไม่ persist; publish เท่านั้นจึงเขียน shared data. ไม่ส่งร่าง AI ให้ patient อัตโนมัติ
- Clinical observations/plans ที่ publish แล้วเป็นข้อมูลระบบกลาง, chat/ภาพไม่ถูกเก็บใน localStorage ใน AWS mode. Token อยู่ sessionStorage 15 นาที จึงยังต้องจัดการ XSS; CSP ยังอนุญาต inline scripts/styles สำหรับ Next static hydration
- ข้อเสนอ AI มี confidence=0 เพราะยังไม่มี calibration; ไม่ควรตีความเป็นความมั่นใจทางคลินิก ไม่มี diagnosis, automatic medication changes หรือ emergency dispatch
- ไม่มี AgentCore/Bedrock Agents managed planner หรือ external tools: workflow เป็น Lambda orchestration (authorize -> scoped context -> quota -> model -> pending review -> doctor publish). ควรสาธิตตามความสามารถจริง ไม่เรียกว่า autonomous clinical agent
- ยังไม่มี Bedrock Guardrails, malware scanning, clinical red-team evaluation, immutable clinical audit trail หรือ automated retention/deletion workflow สำหรับการใช้จริง
- ภาพ JPEG/PNG เพียง 1 ภาพ, 500 KB; frontend resize 800px ภาพอ่านค่า/อาหารยังต้องยืนยันผล; ไม่รับ PDF/document upload ใน AI endpoint
- Rate limits/units ลดความเสี่ยงค่าใช้จ่าย ไม่ใช่ dollar hard cap และไม่มี frontend public-traffic budget breaker; monitor AWS Billing/ผู้จัดและปิด AI เมื่อจำเป็น
- User pool MFA optional สำหรับ prototype; AWS account MFA บังคับตามผู้จัด. สำหรับจริงต้องทบทวน app MFA, session policy และ BFF/HttpOnly cookies
- Cognito self-sign-up ปิดไว้ การเพิ่ม/เปลี่ยน doctor/caregiver assignment ต้อง admin ตรวจและ provision เอง
- SSE-S3 และ DynamoDB managed encryption + PITR เปิดอยู่; ไม่มี customer-managed KMS keys ใน prototype เพื่อลดค่าใช้จ่ายและการจัดการ key

## Validation

ผลตรวจสุดท้ายของ session บันทึกใน `docs/validation.md` ใช้ `npm run check`, `npm run lint`, `npm run lint:security` และ `sam validate --lint --template-file lambda-backend/template.yaml` เมื่อต่อยอด

IAM baseline ตรวจด้วย IAM Policy Autopilot 0.3.0 จาก runtime SDK calls (`db.ts`, `stateHandler.ts`, `chatHandler.ts`, `staticHandler.ts`). ตัว analyzer เสนอ permissions เผื่อ optional features เช่น guardrail/tools, bearer tokens, KMS, object lock และ replication ซึ่งแอปไม่ได้ใช้ จึงไม่เพิ่ม permissions เหล่านั้น; จำกัด model ARN ใน region, table ARN และ frontend bucket ตามทรัพยากรจริง ไม่มี Scan. รันซ้ำได้โดยไม่ upload policies:

```bash
DISABLE_IAM_POLICY_AUTOPILOT_TELEMETRY=true uvx iam-policy-autopilot@0.3.0 generate-policies "$PWD/lambda-backend/db.ts" "$PWD/lambda-backend/stateHandler.ts" "$PWD/lambda-backend/chatHandler.ts" "$PWD/lambda-backend/staticHandler.ts" --region us-east-1 --service-hints dynamodb bedrock s3 --pretty
```

## หลักฐานให้กรรมการ

- Workflow: patient record -> caregiver confirmation -> consent -> doctor AI draft -> doctor review/publish -> patient sees approved plan
- Safety: foreign patient 403, no-consent 403, self-confirm denied, replay approval 409, model/DB unavailable does not fabricate success
- Cost: actual input/output token log, bounded history/output, quota failure 429, calculator export และ billing usage ช่วงทดสอบ
- Value: วัดเวลาร่างแผนก่อน/หลัง, เวลาที่แพทย์ใช้แก้ draft, สัดส่วนข้อเสนอที่แพทย์ reject/edit, จำนวนค่าวัดที่ caregiver ยืนยัน และต้นทุนต่อ completed workflow ห้ามอ้างผลที่ยังไม่ได้วัด

## AWS references

- [S3 website endpoints and HTTPS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html)
- [HTTP API JWT authorizers/scopes](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- [Bedrock Converse and token usage](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)
- [Amazon Nova model capabilities/IDs](https://docs.aws.amazon.com/nova/latest/userguide/)
