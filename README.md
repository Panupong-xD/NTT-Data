# WELLYNC

ต้นแบบดูแลสุขภาพร่วมกันระหว่างผู้ป่วย ผู้ดูแล และแพทย์ สร้างด้วย Next.js 15, React 19 และ TypeScript

> **สถานะ (พ.ย. 2569):** AWS account ที่ผู้จัด NTT DATA ให้ใช้ในการแข่งขันถูกปิดแล้ว โหมด `aws` จึงไม่มี stack ให้เชื่อมต่อ ใช้โหมด `demo` แทน
> โค้ด AWS (`lambda-backend/`, SAM templates, `scripts/`, `docs/`) เก็บไว้ตามสภาพเป็นหลักฐานงานแข่งขัน เวอร์ชันที่ส่งประกวดคือ commit `56e2663` (release `judging-ready-20261023-v1`) และยัง deploy ซ้ำได้ตาม [DEPLOY.md](DEPLOY.md) หากมีบัญชี AWS

มี 2 โหมดแยกกัน:

- `demo`: ข้อมูลสังเคราะห์ใน browser ไม่ใช้ AWS ค่าเริ่มต้นใน `.env.example` ฟีเจอร์ AI (แชท สแกนอาหาร สแกนเครื่องวัด ร่างแผนของแพทย์) เป็น **AI จำลอง** ที่ตอบจากกฎและข้อมูลตัวอย่างในเบราว์เซอร์ (`lib/services/ai/demo.ts`) ไม่เรียกโมเดลจริง ไม่มีค่าใช้จ่าย และไม่ใช่คำแนะนำทางการแพทย์ ส่วนความจำผู้ป่วย/มื้ออาหาร/เคสติดตามมีเฉพาะโหมด aws
- `aws`: Cognito login + PKCE, API Gateway, Lambda, DynamoDB, private S3 และ optional Amazon Bedrock ไม่มี CloudFront และไม่ใช้ mock fallback เมื่อ service ล้มเหลว

```bash
npm ci
cp .env.example .env.local
npm run dev
```

โหมด demo ทดลองด้วย `patient@gmail.com`, `caregiver@gmail.com`, `doctor@gmail.com` และ password ใด ๆ เพื่อดู UI เท่านั้น ไม่ใช่ authentication ที่ใช้ deploy และห้ามใส่ข้อมูลผู้ป่วยจริง

## Deploy โหมด demo (ฟรี)

โหมด demo เป็น static export (`next.config.ts` ตั้ง `output: "export"`) ไม่ต้องมี server หรือ secret ใด ๆ

- Vercel: import repo นี้ ใช้ค่าเริ่มต้นของ Next.js ไม่ต้องตั้ง environment variable (ไม่ตั้ง `NEXT_PUBLIC_APP_MODE` = demo)
- หรือ `npm run build` แล้วนำโฟลเดอร์ `out/` ไปวางบน static host ใดก็ได้

CI (`.github/workflows/ci.yml`) รัน typecheck, tests ทั้ง frontend/backend, lint และ deployment invariants ทุกครั้งที่ push และเปิด PR

## Deploy AWS

ทำตาม [DEPLOY.md](DEPLOY.md) ตั้งแต่การสร้าง stack, build frontend ด้วย outputs ของบัญชีตัวเอง, สร้างบัญชี Cognito/ผูกข้อมูลตัวอย่าง จนถึง smoke test

อ่าน [ข้อจำกัดและการตรวจความพร้อม](docs/aws-readiness.md) และ [ผล validation](docs/validation.md) ก่อนใช้ ระบบนี้เป็น competition prototype ไม่ใช่ระบบสำหรับตัดสินใจทางคลินิกหรือระบบที่รับรอง PDPA/FHIR แล้ว

รอบส่งผลงาน: [ตรวจครบ 6 เกณฑ์ พร้อมบทสาธิตและวิธีวัดผล](docs/competition-readiness.md), [Architecture และ Agent Workflow](docs/architecture.md), [Shared patient memory](docs/patient-memory.md).

```bash
npm run check
npm run lint
npm run lint:security
sam validate --lint --template-file lambda-backend/template.yaml
```

AWS mode ไม่ให้เลือก role จากอีเมล และไม่ให้ผู้ใช้ทั่วไปสร้างบัญชีแพทย์เอง ข้อมูล clinical โหลดผ่าน API ที่ตรวจ patient assignment/consent บน server. AI ถูกปิดเป็นค่าเริ่มต้น ร่างและข้อเสนอ AI ต้องให้แพทย์ตรวจแล้ว publish แผนเอง

โค้ด AWS อยู่ใน `lambda-backend/`; scripts สำหรับ config/build/provision ข้อมูลสังเคราะห์อยู่ใน `scripts/`. ไม่มีการรับประกันค่าใช้จ่าย $0 ให้ใช้ Pricing Calculator/Billing ตาม region และ traffic จริง
