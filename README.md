# WELLYNC

ต้นแบบดูแลสุขภาพร่วมกันระหว่างผู้ป่วย ผู้ดูแล และแพทย์ สร้างด้วย Next.js 15, React 19 และ TypeScript

มี 2 โหมดแยกกัน:

- `demo`: ข้อมูลสังเคราะห์ใน browser สำหรับทดลอง UI โดยไม่ใช้ AWS/AI ค่าเริ่มต้นใน `.env.example`
- `aws`: Cognito login + PKCE, API Gateway, Lambda, DynamoDB, private S3 และ optional Amazon Bedrock ไม่มี CloudFront และไม่ใช้ mock fallback เมื่อ service ล้มเหลว

```bash
npm ci
cp .env.example .env.local
npm run dev
```

โหมด demo ทดลองด้วย `patient@gmail.com`, `caregiver@gmail.com`, `doctor@gmail.com` และ password ใด ๆ เพื่อดู UI เท่านั้น ไม่ใช่ authentication ที่ใช้ deploy และห้ามใส่ข้อมูลผู้ป่วยจริง

## Deploy AWS

ทำตาม [DEPLOY.md](DEPLOY.md) ตั้งแต่การสร้าง stack, build frontend ด้วย outputs ของบัญชีตัวเอง, สร้างบัญชี Cognito/ผูกข้อมูลตัวอย่าง จนถึง smoke test

อ่าน [ข้อจำกัดและการตรวจความพร้อม](docs/aws-readiness.md) และ [ผล validation](docs/validation.md) ก่อนใช้ ระบบนี้เป็น competition prototype ไม่ใช่ระบบสำหรับตัดสินใจทางคลินิกหรือระบบที่รับรอง PDPA/FHIR แล้ว

```bash
npm run check
npm run lint
npm run lint:security
sam validate --lint --template-file lambda-backend/template.yaml
```

AWS mode ไม่ให้เลือก role จากอีเมล และไม่ให้ผู้ใช้ทั่วไปสร้างบัญชีแพทย์เอง ข้อมูล clinical โหลดผ่าน API ที่ตรวจ patient assignment/consent บน server. AI ถูกปิดเป็นค่าเริ่มต้น ร่างและข้อเสนอ AI ต้องให้แพทย์ตรวจแล้ว publish แผนเอง

โค้ด AWS อยู่ใน `lambda-backend/`; scripts สำหรับ config/build/provision ข้อมูลสังเคราะห์อยู่ใน `scripts/`. ไม่มีการรับประกันค่าใช้จ่าย $0 ให้ใช้ Pricing Calculator/Billing ตาม region และ traffic จริง
