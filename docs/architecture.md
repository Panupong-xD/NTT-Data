# Wellync architecture และ Agent workflow

ตรงกับ `judging-ready-20261023-v1`; ต้อง deploy/verify ก่อนอ้างว่าเป็นความสามารถใน AWS ปัจจุบัน

## AWS runtime

```mermaid
flowchart LR
    USER["Web browser: ผู้ป่วย / ผู้ดูแล / หมอ"]
    COG["Cognito: Email OTP + PKCE"]
    SES["SES: ส่ง OTP"]
    API["API Gateway HTTP API"]
    FE["Frontend Lambda"]
    S3[("Private S3: HTML / JS / ภาพประกอบ")]
    subgraph BACKEND["Backend Lambda เดิม"]
        AUTH["ตรวจ JWT / assignment / consent"]
        DATA["API ข้อมูลและการยืนยัน"]
        AGENT["Bounded Agent Orchestrator"]
        TOOLS["Read tools / Draft tools ตามบทบาท"]
        AUTH --> DATA
        AUTH --> AGENT
        AGENT <--> TOOLS
    end
    DB[("DynamoDB: clinical / meals / daily summaries / follow-ups / quotas")]
    MODEL["Bedrock: native chat model"]
    VISION["Bedrock: Nova Lite image analysis"]
    LOG["CloudWatch: sanitized execution / usage logs"]
    USER <--> COG
    COG --> SES
    USER --> API
    API -->|public web routes| FE
    FE --> S3
    API -->|JWT protected API| AUTH
    DATA <--> DB
    DATA -->|single image-analysis call| VISION
    AGENT <--> MODEL
    TOOLS <--> DB
    BACKEND -.-> LOG
```

IAM กำหนดสิทธิ์ของแต่ละ service ไม่ใช่จุดผ่านของข้อมูล Frontend/Backend เป็นคนละ API integration ไม่ใช่ Lambda เรียกต่อกัน S3 ไม่เก็บภาพอาหารต้นฉบับ Chat กับภาพไม่มี external model provider API หรือ Marketplace endpoint

## การทำงานของ Agent หนึ่งคำขอ

```mermaid
flowchart TD
    A["คำขอ + JWT"] --> B["ยืนยันตัวตน บทบาท assignment และ consent"]
    B --> C["เลือกบริบทล่าสุด: แผนที่ผ่านตรวจ / preferences / สรุปที่เกี่ยวข้อง"]
    C --> Q["จอง quota ก่อนเรียกโมเดล"]
    Q --> D["โมเดลประเมินคำขอและเลือก tools ที่มีสิทธิ์"]
    D --> E{"ต้องใช้ tool หรือไม่"}
    E -->|ไม่ต้อง| F["ตอบจากบริบทที่ส่งให้"]
    E -->|ต้องใช้| G["ตรวจ schema และสิทธิ์ / เรียกสูงสุด 3 tools"]
    G --> H["คืน tool results ให้โมเดล / จอง quota รอบสอง"]
    H --> I["โมเดลตอบหรือเตรียมร่าง / ห้ามวน tools ต่อ"]
    F --> J["ตรวจสิทธิ์อีกครั้ง / ส่งคำตอบพร้อม sources และ execution"]
    I --> J
    J --> K{"มีร่างสำคัญหรือไม่"}
    K -->|มี| L["ผู้ใช้หรือหมอตรวจและยืนยันผ่าน API แยก"]
    K -->|ไม่มี| M["จบคำขอ"]
    L --> N["ตรวจสิทธิ์และ version อีกครั้ง / บันทึก DynamoDB"]
```

Planning คือการเลือกข้อมูล/เครื่องมือให้เหมาะกับคำขอ ไม่ใช่การแสดง hidden chain of thought คำถามที่บริบทพร้อมแล้วจบใน 1 model call คำถามที่ใช้ tools ไม่เกิน 2 calls; การรอคนยืนยันไม่เปิด Lambda หรือโมเดลค้างไว้

## วงจรผู้ใช้ทั้งสามบทบาท

```mermaid
flowchart TD
    P["ผู้ป่วยยืนยันมื้ออาหาร / บันทึกสุขภาพ"] --> MEM["ข้อมูลและสรุปกลางตามสิทธิ์"]
    MEM --> PA["Patient Agent: ตอบตามบริบท / เตรียมร่างขอให้ช่วย"]
    PA --> PC["ผู้ป่วยตรวจและยืนยัน"]
    PC --> CG["ผู้ดูแลอ่านเรื่องเดียวกัน / Agent ช่วยจัดข้อมูล"]
    CG --> CC["ผู้ดูแลเพิ่มบันทึกและกดส่งต่อหมอ"]
    CC --> CON["ตรวจ consent ของผู้ป่วย"]
    CON --> DOC["Doctor Agent: อ่านหลักฐาน / ร่างแผน"]
    DOC --> DR["หมอตรวจ แก้ และเผยแพร่แผนเอง"]
    DR --> MEM
    DR --> FOLLOW["ผู้ป่วยและผู้ดูแลทำตามแผน / บันทึกผล / ปิดเรื่อง"]
```

เป็นสามบทบาทเชิงตรรกะใน backend เดียว ไม่มีสามโมเดลคุยกันใน background หรือ agent ที่ส่งข้อมูลข้ามผู้ป่วยเอง ผู้มีสิทธิ์ต้องเปิด inbox ในเว็บ ภาพนี้แสดงขอบเขตการทำงานร่วมกัน ไม่ได้แปลว่าทุกขั้นเรียกโมเดลเสมอ
