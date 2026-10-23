# Deploy Wellync บน AWS

ใช้ region ที่ผู้จัดอนุญาต: `us-east-1`, `ap-southeast-1`, `ap-southeast-7`. Stack ปัจจุบันใช้ `us-east-1` ไม่มี CloudFront

## อัปเดต stack เดิมด้วย release ที่ build แล้ว

อัปโหลด `Wellync-judging-ready-20261023-v1.zip` เข้า CloudShell ใช้โฟลเดอร์ใน home เพื่อไม่สูญหายเมื่อ `/tmp` ถูกล้าง:

```bash
mkdir -p ~/wellync-final
unzip -o ~/Wellync-judging-ready-20261023-v1.zip -d ~/wellync-final
cd ~/wellync-final/Wellync
node scripts/deploy-memory-update.mjs wellync-ready us-east-1
node scripts/deploy-memory-update.mjs wellync-ready us-east-1 --apply
```

คำสั่งแรกเป็น preflight ไม่เปลี่ยน AWS คำสั่ง `--apply` อัปเดต code ใน backend Lambda เดิม รอพร้อม ตรวจ digest/health revision แล้วอัปโหลด static frontend ลง bucket ของ stack และตรวจ JS ที่ deploy ต้องตรง build ไม่ต้อง npm install/build ใน CloudShell สำหรับ prebuilt bundle นี้

ไม่เปลี่ยน Lambda environment variables, IAM, Cognito หรือ CloudFormation parameters; ค่า AI_ENABLED และโมเดลเดิมยังอยู่ หาก Bedrock เคย AccessDenied การอัปเดตโค้ดไม่แก้สิทธิ์นั้น ใช้ [existing roles](docs/existing-roles.md) และตรวจ policy ของโมเดลที่เลือก อย่าเพิ่ม Marketplace Subscribe หรือเปลี่ยน role ที่ใช้งานจริงโดยเดา

ระหว่างอัปเดตมีช่วง backend ใหม่/frontend เก่าได้ ถ้า script หยุดให้แก้ข้อผิดพลาดแล้วรันซ้ำ backend ต้องผ่านตรวจจึงจะ publish frontend การ sync ลบไฟล์เว็บเก่าใน dedicated frontend bucket แต่ไม่ลบ DynamoDB/records

## สร้างและ deploy จาก source

```bash
npm ci
npm --prefix lambda-backend ci
npm run check
npm run lint
npm run lint:security
sam validate --lint --template-file lambda-backend/template-existing-roles.yaml
cd lambda-backend
sam build --template-file template-existing-roles.yaml
sam deploy --guided --stack-name wellync-ready --region us-east-1
cd ..
node scripts/aws-config.mjs wellync-ready us-east-1
npm run build:aws
node scripts/publish-frontend.mjs wellync-ready us-east-1 --apply
node scripts/verify-frontend.mjs wellync-ready us-east-1
```

ใช้ existing-role template เมื่อต้องรักษาสิทธิ์แบบบัญชีทีมปัจจุบัน ระบุ dedicated roles ตาม [existing roles](docs/existing-roles.md) อย่าเปลี่ยน parameters เดิมโดยไม่ดู stack สำหรับบัญชีใหม่ที่อนุญาตสร้าง IAM ใช้ `template.yaml` แทน การสร้างบัญชี/assignments ข้อมูลสังเคราะห์ใช้ `scripts/provision-demo.mjs` หลังตรวจไฟล์ตามรูปแบบ `scripts/demo-users.example.json`; ต้องทำโดยผู้ดูแลที่มีสิทธิ์เท่านั้น ห้ามใช้ source flow และ prebuilt flow ปะปนกันโดยนำ manifest เก่ามาใช้

Email OTP ต้องเตรียม SES ตาม [email OTP](docs/email-otp.md). MFA สำหรับ AWS account ของผู้จัดเป็นคนละเรื่องกับ OTP ของผู้ใช้แอป

## ตรวจหลัง deploy

1. เปิด `/api/health` ต้องเห็น `judging-ready-20261023-v1` เมื่อ deploy prebuilt release นี้ แล้ว reload จาก origin และ sign in ใหม่
2. ยืนยันชื่ออาหาร 1 มื้อ จากนั้นถามข้อมูลอาหาร เปิด “ข้อมูลอ้างอิงและขั้นตอนของผู้ช่วย” ตรวจแหล่งข้อมูลและ tools จริง
3. ลองเตรียมร่าง follow-up ก่อนยืนยันต้องไม่ส่ง เมื่อยืนยันผู้ดูแลจึงเห็นใน inbox
4. ลองส่งต่อหมอเมื่อยังไม่มี consent ต้องถูกปฏิเสธ หลัง consent จึงอ่าน/ส่งต่อได้ ให้หมอตรวจและ publish แผนเอง
5. เปิดผู้ป่วยตรวจแผนใหม่ บันทึกผลและปิดเรื่อง ลองลบ/แก้มื้ออาหารและถามใหม่ ไม่ใช้ประวัติเก่าเป็นข้อเท็จจริง
6. ใช้ [บทสาธิตและวิธีเก็บหลักฐาน 6 เกณฑ์](docs/competition-readiness.md) เก็บวิดีโอและ Billing ก่อนผู้จัด freeze ระบบ

Smoke tests ที่เรียก Bedrock จริงมีค่าใช้งานตามโมเดล ไม่รับประกัน $0 ทดสอบเท่าที่จำเป็น ส่วน automated local tests ใช้ SDK stubs ไม่มีการเรียกโมเดลจริง
