# ตรวจความพร้อมตามกติกา NTT DATA

ตรวจวันที่ 23 ตุลาคม 2569 จาก PDF สรุปประชุมวันที่ 29 กันยายน 2569 จำนวน 5 หน้า
Release: `judging-ready-20261023-v1`.

เอกสารนี้แยกความสามารถที่มีในโค้ด ผลทดสอบแบบจำลอง และหลักฐานบน AWS ที่ทีมต้องเก็บจริง ไม่ใช่การรับรองคะแนนจากกรรมการ PDF ไม่ได้ระบุน้ำหนักคะแนนหรือสูตร cost ratio จึงไม่คำนวณคะแนนสมมติ

## ข้อกำหนดและจุดที่ยังต้องยืนยัน

| ข้อกำหนดใน PDF | สิ่งที่โครงการทำ | สถานะ/หลักฐานที่ยังต้องเก็บ |
| --- | --- | --- |
| Prototype ต้องต่อยอด Idea Proposal เดิมและตรงหนึ่งใน 5 หัวข้อ | Wellync เน้นการดูแลผู้ป่วยต่อเนื่องร่วมกับผู้ดูแลและแพทย์ | ยังไม่มี Proposal เดิมและรายชื่อโจทย์ฉบับเต็มใน repo ต้องเทียบชื่อโจทย์ กลุ่มผู้ใช้ และขอบเขตกับเอกสารที่ทีมส่ง ห้ามอ้างว่าตรวจแล้ว |
| Agentic Prototype deploy และทำงานบน AWS เท่านั้น | API Gateway, Lambda, Cognito/SES, private S3, DynamoDB, Bedrock; agent/tools รันใน backend Lambda | local demo ไม่ใช่หลักฐาน AWS; deploy release แล้วบันทึกหน้าจอ health revision และ workflow จริง |
| เฉพาะ us-east-1, ap-southeast-1, ap-southeast-7 | Rules ในสอง templates และ guard ใน scripts; runtime รับเฉพาะ native model IDs ไม่รับ inference profiles/endpoint ARN | ใช้ us-east-1 ตาม stack ปัจจุบัน; โมเดลแต่ละตัวอาจไม่ได้มีทุก region ที่กติกาอนุญาต |
| ห้าม Marketplace subscriptions ใช้ Native AWS Services | ไม่มี Marketplace resource/subscribe หรือ external model API; Converse ไป native foundation model ใน Bedrock | Qwen แบบ native model ID ต่างจาก Qwen endpoint ที่ provision ผ่าน Marketplace; ตรวจ IAM/model availability จริง |
| AWS account MFA และ Challenger Access | ใช้ SSO role ของผู้จัด ไม่เก็บ AWS keys ในเว็บ | ทีมต้องยืนยัน MFA ใน AWS Portal เอง; email OTP ของผู้ใช้ Wellync ไม่ใช่หลักฐาน AWS account MFA |
| ห้ามเข้าบัญชีทีมอื่น | scripts อ้างอิง outputs ของ stack; evidence collector ตรวจ account จาก STS กับ StackId | ไม่เรียก AssumeRole หรือสำรวจ resources ของทีมอื่น |
| งบ $350 รวมช่วงพัฒนาและค่า token/subscription ภายนอก | Serverless/arm64/on-demand, bounded agent, ไม่มี GPU/NAT/EC2/RDS/vector store หรือ LLM job ตามเวลา | ต้องแนบ actual Billing/เครดิตที่เหลือและค่าใช้จ่ายภายนอกที่ทีมใช้พัฒนาเอง; daily units ไม่ใช่ dollar cap |
| ผู้จัด alert 50/80/90/100% และ freeze ที่ 100% | ไม่แก้หรืออ้างว่าแอปสร้าง circuit breaker นี้เอง | ตรวจอีเมล/หน้า Billing ผู้จัด ห้ามทดสอบด้วยการใช้เครดิตจนหมด |
| ส่ง 25 ต.ค. 2569 เวลา 23:59; AWS อาจ freeze วันส่ง | source + prebuilt artifacts + ขั้นตอน deploy/verify | เก็บวิดีโอ/ภาพ/รายงานก่อน freeze; เผื่อส่ง 10–15 นาที รูปแบบส่งจริงต้องยึดอีเมลล่าสุดผู้จัด ซึ่ง PDF ยังไม่ระบุ |

CloudFront ไม่ได้เป็นข้อห้ามใน PDF แต่เป็นความต้องการของโครงการนี้ จึงคงสถาปัตยกรรมไม่มี CloudFront

AWS ระบุว่า Amazon และ Qwen ในรายการ native foundation models ไม่ใช้ Marketplace product keys: [Model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html). Native Qwen ID ที่อนุญาตคือ `qwen.qwen3-next-80b-a3b`: [Model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-qwen-qwen3-next-80b-a3b.html). ไม่เพิ่มสิทธิ์ Subscribe เพื่อเลี่ยงนโยบายผู้จัด

## ประเมิน 6 เกณฑ์ด้วยหลักฐาน

| เกณฑ์ | ความพร้อมของโค้ด | สิ่งที่ต้องสาธิต/แนบ |
| --- | --- | --- |
| 1. Problem Clarity | ผู้ป่วยบันทึกข้อมูลแยกส่วน ผู้ดูแลต้องรวบรวม และหมอขาดบริบทระหว่างการติดตาม; ใช้ shared context พร้อมกำหนดสิทธิ์ | อธิบายผู้ป่วยโรคเรื้อรังที่มีผู้ดูแลและแพทย์ประจำ ปัญหาการเล่าซ้ำ/ข้อมูลกระจัดกระจายเป็นสมมติฐานที่ต้องยืนยันกับผู้ใช้ ไม่อ้างสถิติความเร่งด่วนที่ไม่ได้วิจัย; แนบ Proposal เดิมและ [workflow](architecture.md) |
| 2. Agentic Capabilities | โมเดลเลือก tools จากเป้าหมายและบทบาท server; รับ tool results แล้วตอบหรือเตรียมร่าง มีขอบเขตการทำงาน | สาธิตคำขอที่ต้องอ่านข้อมูลนอก packet แล้วเตรียมร่าง เปิดส่วน “ข้อมูลอ้างอิงและขั้นตอน” ให้เห็น tools จริง; `agent_plan` log บันทึกชื่อ tools ที่เลือก ไม่ใช่ chain of thought |
| 3. Creativity & Feasibility | วงจรอาหาร → บริบท → คำขอช่วยเหลือ → ผู้ดูแล → หมอ → แผนที่ใช้ตอบครั้งถัดไป อยู่บน AWS เดิม | เดินครบ 3 บทบาทและแสดงข้อมูลที่เพิ่งบันทึกจริง ไม่เปิดหลายแชทที่ไม่เชื่อมกัน; ยืนยัน release/hash บน AWS |
| 4. Agentic Behavior & Safety | role/assignment/consent checks, validated tools, foreign IDs ถูกปฏิเสธ, unknown nutrition เป็น null, limits/timeouts; emergency shortcut | ทดลองไม่มี consent, prompt ขอข้อมูลคนอื่น, ค่าสารอาหารไม่ทราบ และข้อมูลถูกแก้/ลบ; ผล local stubs ไม่รับรองคุณภาพภาษา/ความปลอดภัยของโมเดลจริง |
| 5. Responsible AI & HITL | เห็นแหล่งข้อมูลที่ส่งประกอบคำตอบ tools และสถานะร่าง; ผู้ป่วยยืนยันอาหาร/preferences/follow-up; หมอตรวจและ publish เอง | ก่อนกดยืนยัน แสดงว่ายังไม่เกิด record/case/แผนใหม่ แล้วกดยืนยันและเปิดอีกบทบาทให้เห็นผล; แหล่งข้อมูลไม่ใช่คำรับรองว่าคำตอบถูกต้อง |
| 6. Business or Social Value | ลดการรวบรวมข้อมูลซ้ำ มีเรื่องติดตามและผลลัพธ์ร่วมกัน; มีวิธีเก็บเวลางาน token latency success และ review | ต้องวัดก่อน/หลังด้วยงานและข้อมูลสังเคราะห์เดียวกัน แนบจำนวนตัวอย่าง ความผิดพลาด เวลาแก้ร่าง และ Billing จริง ยังห้ามอ้างว่าประหยัด X% หรือผลสุขภาพดีขึ้นแล้ว |

การมีชื่อบริการ “Agent” ใน architecture ไม่ใช่หลักฐานเกณฑ์ 2 หลักฐานคือ model-selected tools + scoped data + ผลลัพธ์ต่อเนื่อง + human approval ที่รันจริง PDF ไม่ได้กำหนดให้ต้องใช้ Bedrock Agents/AgentCore โดยเฉพาะ

## บทสาธิต 5–7 นาที

ใช้ข้อมูลสังเคราะห์เท่านั้น เปิดคนละ browser profile สำหรับแต่ละบทบาท หรือ sign out ระหว่างบัญชี

1. แสดง API `/api/health` ว่า revision ตรง release และอธิบายปัญหา/กลุ่มผู้ใช้ใน 30 วินาที
2. ผู้ป่วยบันทึกชื่ออาหารเอง 1 มื้อโดยไม่เรียก AI หรือวิเคราะห์ภาพแล้วตรวจชื่อ/ปริมาณและกดบันทึก มื้อจะเข้าประวัติหลังยืนยันเท่านั้น
3. ถาม “ช่วยดูมื้ออาหารที่ฉันบันทึกช่วงนี้ แล้วเตรียมเรื่องให้ผู้ดูแลช่วยจัดอาหาร” เปิดรายการแหล่งข้อมูลและ tools โมเดลอาจใช้สรุปที่มีอยู่แล้วโดยไม่เรียก read tool จึงไม่บังคับให้เรียกเพิ่มเพื่อโชว์ หากต้องพิสูจน์ retrieval ให้ถามรายละเอียดมื้อเมื่อวาน หรือสรุป 60 วัน และแสดงวันที่มีบันทึกจริง
4. ตรวจร่างแล้วกดยืนยันส่งให้ผู้ดูแล เปิดผู้ดูแลให้เห็นเรื่องเดียวกัน เพิ่มข้อมูลการติดตาม และส่งต่อหมอภายใต้ consent ของผู้ป่วย
5. หมอเปิดเรื่อง ตรวจแหล่งข้อมูล ใช้ผู้ช่วยร่างแผน ตรวจและแก้ แล้วกดอนุมัติ/เผยแพร่ในหน้าแผนดูแล การตอบว่า “ให้ติดตามต่อ” ใน case ไม่ได้เผยแพร่แผนโดยอัตโนมัติ
6. ผู้ป่วยเปิดแผนใหม่ ถามคำถามที่เกี่ยวข้องให้เห็นวันที่แผนล่าสุด บันทึกผลและปิดเรื่องด้วยคน
7. แสดง safety หนึ่งกรณีและรายงานวัดผลจริง ห้ามเรียกว่าระบบวินิจฉัย/ปรับยาอัตโนมัติ ส่งแจ้งเตือนภายนอก หรือพิสูจน์ผลสุขภาพทางคลินิกแล้ว

## วัดผลที่ทำได้ก่อนส่ง

| ตัวชี้วัด | วิธีวัดที่ไม่เพิ่ม LLM calls โดยไม่จำเป็น | ขอบเขต |
| --- | --- | --- |
| เวลาเตรียมข้อมูล/ร่างแผน | จับเวลากระบวนการเดิมและแบบมีผู้ช่วย ด้วยงานเดียวกัน รวมเวลาตรวจ/แก้/ยืนยัน | รายงาน sample size และ failures ไม่อ้างผลของผู้ป่วยจริง |
| งานครบวงจร | จำนวนเคสสังเคราะห์ที่ครบถึงผลติดตาม ÷ จำนวนที่เริ่ม | HTTP 200 ไม่เท่ากับงานสำเร็จ |
| Human review | จำนวน accepted / edited / rejected พร้อมเหตุผลในการสาธิต | ไม่ใช้ confidence ที่โมเดลแต่งขึ้น |
| latency/success/tools/tokens | `judging-evidence.mjs` อ่าน logs ช่วงที่ทดสอบ | มีเฉพาะช่วงที่ deploy logging รุ่นนี้แล้ว; missing log ไม่ได้แปลว่าใช้ฟรี |
| ค่าใช้จ่ายจริง/เครดิตเหลือ | ภาพ Billing/credit ผู้จัดพร้อมวันเวลา + รายการ subscription ภายนอกของทีม + Pricing Calculator สำหรับ 1 เดือน | token × ราคาเป็นเพียง inference estimate ไม่รวมบริการอื่น; ไม่ใช้เครดิตสุทธิหลังหัก promotions แทน gross usage โดยไม่อธิบาย |

จับเวลางานจริงแล้วสร้าง `workflow-times.json` ตาม schema นี้ โดยไม่ใส่ชื่อ/อีเมล/ข้อมูลสุขภาพ:

```json
[
  {
    "taskId": "doctor-01",
    "role": "doctor",
    "baselineSeconds": 120,
    "assistedSeconds": 90,
    "completed": true,
    "review": "edited"
  }
]
```

ตัวเลขในตัวอย่างเป็นตัวอย่างรูปแบบ ไม่ใช่ผลวัด Wellync ให้แทนด้วยเวลาจริงก่อนใช้:

```bash
node scripts/measure-workflow.mjs workflow-times.json
node scripts/judging-evidence.mjs wellync-ready us-east-1 24 judging-evidence.json
```

คำสั่งที่สองเป็น read-only อ่าน STS/CloudFormation/CloudWatch ไม่เรียก Bedrock ไม่เพิ่ม IAM ไม่อ่านข้อมูลผู้ป่วย ไม่อ่าน Billing อัตโนมัติ และไม่เขียนทับรายงานเดิม โดยจำกัด 10 หน้า หน้าไม่เกิน 1,000 events และแสดง `truncated` หากข้อมูลอาจไม่ครบ การอ่าน logs มีการใช้ API ตามปกติ จึงไม่รับประกันค่าใช้จ่ายศูนย์

## จุดที่โค้ดอย่างเดียวปิดไม่ได้

- Proposal เดิมและอีเมลแจ้งรูปแบบส่งล่าสุด: ทีมต้องเทียบเองหรือให้เอกสารมาเพิ่ม
- สิทธิ์ IAM/SCP, tool calling ของ model ในบัญชีนี้, OTP delivery, workflow ทั้งสามคน และ client UI หลัง deploy ต้องทดสอบบนบัญชีทีม
- ค่า Billing/เครดิตที่เหลือและผลก่อน/หลัง: ต้องเก็บจริง ห้ามใส่ตัวเลขประมาณเป็นผลลัพธ์ที่พิสูจน์แล้ว
- ยังไม่ใช่การรับรอง PDPA/FHIR/clinical validation หรือ immutable audit system
- เปิด case ไม่ได้ส่ง SMS/email/push ให้ทีมดูแลใน background; ต้องเปิด inbox ในเว็บ ไม่มีการเฝ้าระวังฉุกเฉินอัตโนมัติ
