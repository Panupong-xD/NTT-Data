import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  QueryCommand, 
  ScanCommand 
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.DYNAMODB_TABLE || "HealthcareAgentTable";

// Initialize low-level and document clients
const rawClient = new DynamoDBClient({ region: REGION });
export const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true }
});

// Fallback in-memory store for offline/local simulation
const memoryStore: Record<string, Record<string, any>> = {};

export interface PatientEntity {
  id: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string[];
  medications: string[];
  allergies: string[];
  targetBP: string;
  targetSugar: string;
  hospital: string;
}

export interface DoctorEntity {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
}

export interface SessionEntity {
  sessionId: string;
  patientId: string;
  runningSummary: string;
  turnCount: number;
  lastUpdated: string;
}

export interface MessageEntity {
  messageId: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  tokensUsed?: number;
}

export interface ApprovalEntity {
  actionId: string;
  patientId: string;
  patientName: string;
  type: "medication-change" | "urgent-visit" | "care-plan-update" | "alert-escalation";
  title: string;
  description: string;
  clinicalReason: string;
  suggestedAction: string;
  confidence: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

/**
 * 1. Get or Create Patient Profile
 */
export async function getPatient(patientId: string): Promise<PatientEntity | null> {
  const pk = `PATIENT#${patientId}`;
  const sk = "METADATA";

  try {
    const res = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk }
    }));
    return (res.Item as PatientEntity) || null;
  } catch (err) {
    console.warn(`[DynamoDB Fallback] getPatient:`, err);
    return memoryStore[pk]?.[sk] || {
      id: patientId,
      name: "สมชาย มีสุขภาพดี",
      age: 58,
      gender: "ชาย",
      diagnosis: ["เบาหวานชนิดที่ 2", "ความดันโลหิตสูง"],
      medications: ["Metformin 500mg", "Amlodipine 5mg"],
      allergies: ["Penicillin"],
      targetBP: "120/80 mmHg",
      targetSugar: "90-130 mg/dL",
      hospital: "โรงพยาบาลศูนย์สุขภาพอัจฉริยะ"
    };
  }
}

/**
 * 2. Get or Create Session with Rolling Summary
 */
export async function getSession(sessionId: string, patientId: string = "P-0001"): Promise<SessionEntity> {
  const pk = `SESSION#${sessionId}`;
  const sk = "METADATA";

  try {
    const res = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk }
    }));
    if (res.Item) return res.Item as SessionEntity;
  } catch (err) {
    console.warn(`[DynamoDB Fallback] getSession:`, err);
  }

  // Create default new session
  const newSession: SessionEntity = {
    sessionId,
    patientId,
    runningSummary: "",
    turnCount: 0,
    lastUpdated: new Date().toISOString()
  };

  await saveSession(newSession);
  return newSession;
}

export async function saveSession(session: SessionEntity): Promise<void> {
  const pk = `SESSION#${session.sessionId}`;
  const sk = "METADATA";

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: pk,
        SK: sk,
        ...session,
        entityType: "SESSION"
      }
    }));
  } catch (err) {
    console.warn(`[DynamoDB Fallback] saveSession:`, err);
    if (!memoryStore[pk]) memoryStore[pk] = {};
    memoryStore[pk][sk] = session;
  }
}

/**
 * 3. Sliding Window: Get last N messages (Default: 8 messages)
 */
export async function getSessionMessages(sessionId: string, limit: number = 8): Promise<MessageEntity[]> {
  const pk = `SESSION#${sessionId}`;

  try {
    const res = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": pk,
        ":skPrefix": "MSG#"
      },
      ScanIndexForward: false, // Descending by timestamp to get newest first
      Limit: limit
    }));

    const items = (res.Items || []) as MessageEntity[];
    return items.reverse(); // Return in chronological order
  } catch (err) {
    console.warn(`[DynamoDB Fallback] getSessionMessages:`, err);
    const msgs = Object.values(memoryStore[pk] || {})
      .filter((i) => i.SK?.startsWith("MSG#")) as MessageEntity[];
    return msgs.slice(-limit);
  }
}

/**
 * 4. Save Message
 */
export async function saveMessage(sessionId: string, message: Omit<MessageEntity, "sessionId">): Promise<void> {
  const pk = `SESSION#${sessionId}`;
  const sk = `MSG#${message.timestamp}#${message.messageId}`;

  const item: MessageEntity = {
    ...message,
    sessionId
  };

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: pk,
        SK: sk,
        ...item,
        entityType: "MESSAGE"
      }
    }));
  } catch (err) {
    console.warn(`[DynamoDB Fallback] saveMessage:`, err);
    if (!memoryStore[pk]) memoryStore[pk] = {};
    memoryStore[pk][sk] = { ...item, PK: pk, SK: sk };
  }
}

/**
 * 5. Update Running Summary on Session
 */
export async function updateSessionSummary(sessionId: string, newSummary: string, newTurnCount: number): Promise<void> {
  const pk = `SESSION#${sessionId}`;
  const sk = "METADATA";

  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
      UpdateExpression: "SET runningSummary = :summary, turnCount = :turnCount, lastUpdated = :now",
      ExpressionAttributeValues: {
        ":summary": newSummary,
        ":turnCount": newTurnCount,
        ":now": new Date().toISOString()
      }
    }));
  } catch (err) {
    console.warn(`[DynamoDB Fallback] updateSessionSummary:`, err);
    if (memoryStore[pk]?.[sk]) {
      memoryStore[pk][sk].runningSummary = newSummary;
      memoryStore[pk][sk].turnCount = newTurnCount;
      memoryStore[pk][sk].lastUpdated = new Date().toISOString();
    }
  }
}

/**
 * 6. Human-in-the-Loop Approvals CRUD
 */
export async function createApproval(approval: ApprovalEntity): Promise<void> {
  const pk = `APPROVAL#${approval.actionId}`;
  const sk = `STATUS#${approval.status}`;

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: pk,
        SK: sk,
        ...approval,
        entityType: "APPROVAL"
      }
    }));
  } catch (err) {
    console.warn(`[DynamoDB Fallback] createApproval:`, err);
    if (!memoryStore[pk]) memoryStore[pk] = {};
    memoryStore[pk][sk] = { ...approval, PK: pk, SK: sk };
  }
}

export async function getApprovals(statusFilter?: "PENDING" | "APPROVED" | "REJECTED" | "ALL"): Promise<ApprovalEntity[]> {
  try {
    // Scan with FilterExpression on entityType = 'APPROVAL'
    const res = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "entityType = :etype",
      ExpressionAttributeValues: {
        ":etype": "APPROVAL"
      }
    }));

    let items = (res.Items || []) as ApprovalEntity[];
    if (statusFilter && statusFilter !== "ALL") {
      items = items.filter((item) => item.status === statusFilter);
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn(`[DynamoDB Fallback] getApprovals:`, err);
    // In-memory fallback with initial seed items
    const fallbackList: ApprovalEntity[] = [
      {
        actionId: "APP-001",
        patientId: "P-0001",
        patientName: "นาย สมชาย มีสุขภาพดี",
        type: "medication-change",
        title: "ปรับขนาดยาความดันโลหิต Amlodipine (10mg -> 5mg)",
        description: "AI ตรวจพบความดัน systolic ลดลงต่อเนื่อง 5 วันเฉลี่ย 108/68 mmHg แนะนำลดขนาดยาเพื่อป้องกันอาการหน้ามืด",
        clinicalReason: "ความดันโลหิตต่ำกว่าเกณฑ์ควบคุมอย่างต่อเนื่อง (Systolic < 110 mmHg)",
        suggestedAction: "ปรับลดขนาดยา Amlodipine จาก 10mg เป็น 5mg รับประทานวันละ 1 ครั้งหลังอาหารเช้า",
        confidence: 0.94,
        status: "PENDING",
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        actionId: "APP-002",
        patientId: "P-0002",
        patientName: "นาง สมศรี สดใส",
        type: "urgent-visit",
        title: "นัดหมายตรวจติดตามอาการระดับน้ำตาลพุ่งสูงฉุกเฉิน",
        description: "ตรวจพบระดับน้ำตาลหลังอดอาหารพุ่งเกิน 220 mg/dL สองวันติดต่อกัน",
        clinicalReason: "Hyperglycemia Risk Indicator",
        suggestedAction: "ออกใบนัดตรวจเลือด HbA1c ด่วนภายใน 48 ชั่วโมง",
        confidence: 0.91,
        status: "PENDING",
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    if (statusFilter && statusFilter !== "ALL") {
      return fallbackList.filter((item) => item.status === statusFilter);
    }
    return fallbackList;
  }
}

export async function updateApprovalStatus(
  actionId: string, 
  decision: "APPROVED" | "REJECTED", 
  reviewedBy: string = "DOC-001", 
  note?: string
): Promise<ApprovalEntity | null> {
  const pk = `APPROVAL#${actionId}`;
  const now = new Date().toISOString();

  try {
    // Read current approval
    const scanRes = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": pk }
    }));

    const currentItem = scanRes.Items?.[0] as ApprovalEntity | undefined;
    if (!currentItem) return null;

    const updated: ApprovalEntity = {
      ...currentItem,
      status: decision,
      reviewedAt: now,
      reviewedBy,
      reviewNote: note || (decision === "APPROVED" ? "แพทย์อนุมัติคำสั่งการรักษา" : "แพทย์ปฏิเสธคำสั่ง")
    };

    // Update with new status SK
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: pk,
        SK: `STATUS#${decision}`,
        ...updated,
        entityType: "APPROVAL"
      }
    }));

    return updated;
  } catch (err) {
    console.warn(`[DynamoDB Fallback] updateApprovalStatus:`, err);
    return {
      actionId,
      patientId: "P-0001",
      patientName: "นาย สมชาย มีสุขภาพดี",
      type: "medication-change",
      title: "ปรับขนาดยาความดันโลหิต Amlodipine (10mg -> 5mg)",
      description: "AI ตรวจพบความดันลดลงต่อเนื่อง",
      clinicalReason: "Blood Pressure Normalized",
      suggestedAction: "ปรับลดขนาดยา",
      confidence: 0.94,
      status: decision,
      createdAt: now,
      reviewedAt: now,
      reviewedBy,
      reviewNote: note || (decision === "APPROVED" ? "แพทย์อนุมัติ" : "แพทย์ปฏิเสธ")
    };
  }
}
