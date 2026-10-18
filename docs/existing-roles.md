# ใช้ Lambda roles ที่สร้างผ่าน Console

เส้นทางนี้ใช้สำหรับบัญชีที่สร้าง Lambda ผ่าน Console ได้ แต่ CloudFormation อ่าน IAM role ไม่ผ่าน (`iam:GetRolePolicy`) และ Console อ่าน managed policy ไม่ผ่าน (`iam:GetPolicy`). การเพิ่มสิทธิ์อ่านโดยผู้ดูแลเป็นอีกทางเลือกที่ตรงไปตรงมา; เส้นทางนี้เป็นการทดสอบ deploy ด้วย execution roles ที่ได้รับอนุญาตและมีอยู่แล้วตามรูปแบบที่ AWS SAM รองรับ ไม่รับประกันว่าจะผ่าน `iam:PassRole`, Lambda concurrency quota หรือข้อจำกัดอื่นของบัญชี

## เตรียม roles สองตัว

- ใช้ role ของฟังก์ชันทดสอบที่สร้างแล้วสำหรับ backend ได้ หลังตรวจว่าเป็น role ที่ทีมสร้างสำหรับโปรเจคนี้และไม่มีการแชร์กับงานอื่นที่สำคัญ
- สร้างฟังก์ชันทดสอบอีกตัวผ่าน Lambda Console เช่น `wellync-frontend-role-test` โดยใช้ **Create default role / basic Lambda permissions** เพื่อให้ได้ role อีกตัวสำหรับ frontend
- ไม่ใช้ role เดียวร่วมกัน: frontend ต้องไม่เข้าถึง patient table หรือ Bedrock
- อ่าน Role ARN ของแต่ละตัวจาก Lambda API (อ่านอย่างเดียว ไม่เปลี่ยน IAM):

```bash
aws lambda get-function-configuration --function-name wellync-permission-test --region us-east-1 --query Role --output text
aws lambda get-function-configuration --function-name wellync-frontend-role-test --region us-east-1 --query Role --output text
```

อย่าลบ helper functions/roles ระหว่างตั้งค่าและ deploy ห้ามลบ execution roles หลังนำมาใช้กับแอปจริง

## อัปเดต source ใน CloudShell

ถ้าใช้ ZIP ชุดแรก ให้อัปโหลด `Wellync-existing-roles-update.zip` ผ่าน Actions -> Upload file แล้วแตกทับ source เดิม (patch มีเฉพาะ template/scripts/docs/tests):

```bash
unzip -o ~/Wellync-existing-roles-update.zip -d /tmp/wellync-deploy/Wellync
cd /tmp/wellync-deploy/Wellync/lambda-backend
sam validate --lint --template-file template-existing-roles.yaml
sam build --template-file template-existing-roles.yaml
```

ไฟล์ใหม่นี้ไม่มี `AWS::IAM::Role` หรือ `AWS::IAM::Policy` resources และฟังก์ชันทุกตัวระบุ `Role` เป็น parameter โดยตรง ไม่ใส่ SAM `Policies` ที่จะถูกละเลยเมื่อใช้ Role ที่มีอยู่

## Deploy แยก config

ใช้ชื่อ stack ใหม่ที่ยังไม่เคยสร้าง เช่น `wellync-ready`; stack เดิมที่ `ROLLBACK_COMPLETE` ต้องวางแผน cleanup/import แยก และ S3/DynamoDB/UserPool ที่ Retain ยังอยู่ อย่า deploy สร้างหลายรอบเพื่อแก้ IAM error เดิม

```bash
sam deploy --guided --config-file samconfig-existing.toml --stack-name wellync-ready --region us-east-1
```

- BackendExecutionRoleArn: ARN ของ backend role ที่อ่านมาจริง
- FrontendExecutionRoleArn: ARN ของ frontend role **อีกตัวหนึ่ง**
- CognitoDomainPrefix: ชื่อไม่ซ้ำ เช่น `wellync-ready-48217`
- AIEnabled: `false`
- Model/daily units: ค่าเดิม, VisionModel: ว่าง
- Confirm changes: `Y`; Disable rollback: `N`
- Save config: `Y`; ชื่อ config **`samconfig-existing.toml`** (ช่องชื่อไฟล์ไม่ใช่คำถาม Yes/No); environment: `default`

ก่อนยืนยัน Change Set ต้องไม่มี IAM Role/Policy ที่จะถูกสร้างหรือแก้ไข แล้วตรวจชื่อ stack/region/Role ARNs ก่อนตอบ `y`. ถ้าเจอ IAM permission denied ใหม่ ให้หยุดและส่ง error ให้ผู้ดูแล ไม่ขยายสิทธิ์เป็น Administrator

การสร้าง stack สำเร็จด้วย role พื้นฐาน **ยังไม่หมายความว่าเว็บ/ฐานข้อมูลทำงานแล้ว** เพราะ role ที่สร้างผ่าน Console อาจมีเพียงสิทธิ์ logs ของ helper function

## เตรียม runtime policies หลัง stack สำเร็จ

จาก repository root ใน CloudShell (หลัง build backend ให้ `cd ..`):

```bash
node scripts/existing-role-policies.mjs wellync-ready us-east-1
```

คำสั่งนี้อ่าน CloudFormation outputs/parameters และสร้างไฟล์ JSON ใน `/tmp/wellync-role-policies` เท่านั้น **ไม่แก้ไข IAM**. จะได้ policy ของแต่ละ role พร้อม Role ARN/ชื่อ role ที่ต้องใช้:

- Backend: Get/Put/Query/Update/Delete/ConditionCheck เฉพาะ table ของ stack และเขียน logs เฉพาะ backend log group
- Frontend: GetObject/ListBucket เฉพาะ frontend bucket และเขียน logs เฉพาะ frontend log group ไม่มี clinical database/AI permissions
- Bedrock permission ไม่ถูกเพิ่มถ้า `AIEnabled=false`. เมื่อเปิด AI ต้อง regenerate policy แล้วให้ผู้มีสิทธิ์ตรวจ/ติดตั้งก่อนเรียกโมเดล; จำกัด ARN ของโมเดล native ใน region เดียวกัน

ให้ผู้มีสิทธิ์ตรวจ policy เดิม/trust policy/tags ของ role และ JSON ที่สร้างก่อนเพิ่มเป็น inline policy ผ่าน IAM workflow ที่บัญชีอนุญาต ไม่แก้ trust ให้บุคคลอื่นหรือ role ของทีมอื่น ไม่เปลี่ยน permission set ของ `ChallengerAccess` เอง ถ้าอ่าน/แก้ IAM ไม่ได้ ให้ผู้จัดดำเนินการส่วนนี้

Generator สร้างสิทธิ์เพิ่มให้แอปเท่านั้น ไม่ได้อ่านหรือยืนยันว่า permissions เดิมของ role ไม่มีสิทธิ์อื่น และไม่ถอด policy ของ helper function อัตโนมัติ หลังติดตั้ง policies แล้วจึงทำ frontend upload, account provisioning และ smoke tests ตาม DEPLOY.md โดยเปลี่ยนชื่อ stack เป็นชื่อที่ใช้จริง

## การดูแลไฟล์

`template.yaml` เป็น source สำหรับแบบสร้าง roles ใน stack. เมื่อแก้ template ให้รัน:

```bash
node scripts/prepare-existing-roles.mjs
```

แล้วตรวจทั้งสอง template ด้วย SAM lint. Unit test ตรวจว่าไฟล์ existing-role ตรงกับ source และไม่สร้าง IAM resources. การแปล SAM แบบ offline ตรวจเพิ่มเติมแล้วว่า existing-role variant มี Lambda สองตัวที่อ้าง Role parameters โดยตรงและไม่มี IAM Role หลัง transform

อ้างอิง: [SAM Role และพฤติกรรม Policies](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html), [AWS อธิบายการใช้ execution roles ที่เตรียมไว้](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-permissions-cloudformation.html)

## บัญชีที่จอง Lambda concurrency ไม่ได้

หาก AWS แจ้งว่า reserved concurrency ทำให้ unreserved concurrency ต่ำกว่าขั้นต่ำ ให้ใช้ template ล่าสุดซึ่งไม่ได้กำหนด `ReservedConcurrentExecutions` และ build ใหม่ก่อน deploy ค่าเริ่มต้น AI ยังคงปิด และ API throttling/โควตา AI ยังมีผล การใช้ส่วนกลางไม่ได้จำกัด concurrency ต่อฟังก์ชัน หาก stack อยู่ `ROLLBACK_COMPLETE` ต้องจัดการ stack ที่ล้มเหลวก่อนสร้างใหม่; S3, DynamoDB และ Cognito ที่มี Retain จะยังคงอยู่และต้องตรวจแยกต่างหาก
