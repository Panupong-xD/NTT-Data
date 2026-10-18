# เข้าด้วย Email OTP และแก้ error หลังล็อกอิน

OTP ยืนยันว่าเป็นเจ้าของอีเมลผ่าน Cognito Managed Login โดยยังใช้ authorization code + PKCE, access token อายุสั้น และสิทธิ์จาก DynamoDB เดิม ไม่เปิด API ด้วยอีเมลอย่างเดียว บัญชีผู้ใช้, sub, user pool, table และ execution roles เดิมต้องไม่ถูกแทนที่

## 1. วินิจฉัยก่อนเปลี่ยน AWS

จากโฟลเดอร์ Wellync ใน CloudShell:

```bash
node scripts/diagnose-aws.mjs wellync-ready us-east-1
```

คำสั่งนี้อ่าน configuration, error type/request ID ใน logs ย้อนหลัง 30 นาที และสถานะ SES เท่านั้น ไม่แก้ AWS ไม่แสดง token/password/ข้อมูลสุขภาพ หาก recent errors ว่าง ให้เปิดเว็บจนเจอปัญหาอีกครั้งแล้วรันใหม่ หาก AccessDenied ให้ตรวจสิทธิ์ตาม action ที่ขาด ไม่ขยายเป็น Administrator

`Service temporarily unavailable` คือ backend ส่ง 503 ไม่ได้แปลว่ารหัสผ่านผิด ต้องดู error type ก่อนแก้ (เช่น AccessDeniedException, ValidationException, ResourceNotFoundException) การเพิ่ม OTP ไม่แก้ database error ให้เอง เวอร์ชันนี้แสดงรหัสอ้างอิงบนหน้าจอเพื่อจับคู่กับ log และยังไม่เปิดเผย exception ดิบ

## 2. เตรียม SES ก่อนเปิด OTP

Email OTP ต้องใช้ Cognito Essentials หรือ Plus และ EmailConfiguration แบบ DEVELOPER ด้วย SES มีค่าใช้จ่ายตาม MAU และอีเมล ให้ตรวจ credit/account limits ของโครงการด้วย ใช้ us-east-1 และบัญชีเดียวกับ stack สำหรับ sender

เลือกอีเมลผู้ส่งที่ควบคุมได้ เช่น panupong.bunphat@gmail.com แล้วเปิด SES -> Verified identities -> Create identity -> Email address เพื่อยืนยันอีเมลนั้น กดลิงก์ในอีเมลยืนยันของ SES หาก SES ยังเป็น sandbox ต้องยืนยันอีเมลผู้รับทั้งสามใน SES ด้วย (การ verified ใน Cognito ไม่ได้ทำให้ SES verified) จึงทดลองกับผู้ใช้สามคนได้ โดยไม่จำเป็นต้องขอ production access สำหรับการทดลองนี้

DEVELOPER email อาจต้องให้ผู้ดูแลสร้าง service-linked role `AWSServiceRoleForAmazonCognitoIdpEmailService` หากบัญชียังไม่มีและผู้ deploy ไม่มี `iam:CreateServiceLinkedRole` ที่ถูกจำกัดให้บริการนี้ ไม่สร้าง/แก้ role ดังกล่าวเองใน template แบบ existing roles

## 3. สร้าง config อัปเดต stack เดิม

เมื่อ SES identities พร้อมแล้ว:

```bash
node scripts/prepare-email-otp.mjs wellync-ready us-east-1 panupong.bunphat@gmail.com
```

สคริปต์อ่าน stack ปัจจุบันและ SES, ตรวจ sender และผู้รับทั้งสามจาก `/tmp/wellync-demo-users.json` เมื่อยัง sandbox แล้วเขียน `lambda-backend/samconfig-otp.toml` เท่านั้น ไม่แก้ user pool เก็บค่า parameters เดิมทั้งหมด รวมสอง roles, domain, AI switch และงบ AI (ไม่เปิด AI อัตโนมัติ)

```bash
cd lambda-backend
sam build --template-file template-existing-roles.yaml
sam deploy --template-file .aws-sam/build/template.yaml --config-file "$PWD/samconfig-otp.toml"
```

Change Set ต้องเป็นการ Update stack เดิม โดย UserPool/UserPoolClient/UserPoolDomain ไม่มี replacement และเพิ่ม OtpLoginBranding เมื่อเปิด OTP หากมี replacement ของข้อมูล/บัญชี หรือมี IAM resource ให้ตอบ n แล้วตรวจ ห้ามลบ stack เพื่อแก้ OTP

## 4. อัปโหลด frontend ให้ตรงกับ auth mode

หลัง UPDATE_COMPLETE:

```bash
cd ..
node scripts/aws-config.mjs wellync-ready us-east-1
npm run build:aws
node scripts/publish-frontend.mjs wellync-ready us-east-1
node scripts/publish-frontend.mjs wellync-ready us-east-1 --apply
```

เปิด /login/ -> เข้าสู่ระบบด้วยรหัส OTP ทางอีเมล -> ใส่อีเมล -> เลือกรหัสทางอีเมลใน Managed Login -> กรอกรหัสที่ได้รับ คง password factor ใน pool เป็นทางเลือกสำรอง แต่หน้าเว็บชี้ไปใช้ OTP ไม่ส่งรหัสผ่านหรือ OTP เข้าแชต

อย่าลบหรือสร้างบัญชีเดิมใหม่เพราะ sub ใช้ผูกสิทธิ์ในฐานข้อมูล หากผู้ใช้เดิมยังติด FORCE_CHANGE_PASSWORD หรือ MFA ให้ตรวจสถานะ/flow ของบัญชีนั้นก่อนเปลี่ยน ห้ามปิดการตรวจ JWT หรือแก้ role จากอีเมลใน request

## 5. ตรวจผลจริงและเปิด AI แยก

ต้องทดสอบทั้งสามบทบาท, OTP ผิด/หมดอายุ, การขอรหัสใหม่, API ไม่มี token ต้องถูกปฏิเสธ, ผู้ป่วยอนุมัติ consent แล้วแพทย์จึงเห็นข้อมูล การตรวจ local ไม่ยืนยันว่า SES ส่งอีเมลหรือ backend ในบัญชีจริงทำงานแล้ว ให้แก้ 503 ก่อนเปิด AI

AIEnabled ยังคงค่าจาก stack เดิม (ปัจจุบัน false) เปิด Bedrock และสร้าง runtime policy ใหม่หลัง data flow ผ่านแล้วตาม DEPLOY.md ไม่ข้ามขอบเขตงบ token หรือสิทธิ์ข้อมูลของผู้ป่วย

อ้างอิง: [Cognito email settings และข้อกำหนด SES สำหรับ OTP](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html), [Choice-based sign-in](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flows-selection-sdk.html), [Managed login version](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpooldomain.html), [Managed login branding](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-managedloginbranding.html)
