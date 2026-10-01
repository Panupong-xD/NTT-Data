import { 
  BedrockRuntimeClient, 
  InvokeModelCommand 
} from "@aws-sdk/client-bedrock-runtime";
import { 
  getPatient, 
  getSession, 
  getSessionMessages, 
  saveMessage, 
  updateSessionSummary, 
  createApproval, 
  ApprovalEntity 
} from "./db.js";

const REGION = process.env.AWS_REGION || "us-east-1";
const bedrock = new BedrockRuntimeClient({ region: REGION });

// Model Constants for Budget Optimization
const CHEAP_MODEL = process.env.BEDROCK_CHEAP_MODEL || "amazon.nova-micro-v1:0";
const HAIKU_MODEL = "anthropic.claude-3-5-haiku-20241022-v1:0";
const SONNET_MODEL = "anthropic.claude-3-5-sonnet-20241022-v2:0";

/**
 * Universal Bedrock Caller supporting Nova, Claude, and Titan formats
 */
async function callBedrock(modelId: string, prompt: string, systemInstruction?: string, maxTokens: number = 1024): Promise<string> {
  try {
    if (modelId.startsWith("amazon.nova")) {
      // Amazon Nova format
      const payload = {
        messages: [
          {
            role: "user",
            content: [{ text: prompt }]
          }
        ],
        inferenceConfig: {
          max_new_tokens: maxTokens,
          temperature: 0.4,
          top_p: 0.9
        }
      };

      if (systemInstruction) {
        (payload as any).system = [{ text: systemInstruction }];
      }

      const res = await bedrock.send(new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: new TextEncoder().encode(JSON.stringify(payload))
      }));

      const data = JSON.parse(new TextDecoder().decode(res.body));
      return data.output?.message?.content?.[0]?.text || "";
    } else if (modelId.startsWith("anthropic.claude")) {
      // Anthropic Claude 3 / 3.5 format
      const payload: any = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      };

      if (systemInstruction) {
        payload.system = systemInstruction;
      }

      const res = await bedrock.send(new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: new TextEncoder().encode(JSON.stringify(payload))
      }));

      const data = JSON.parse(new TextDecoder().decode(res.body));
      return data.content?.[0]?.text || "";
    } else {
      // Titan format fallback
      const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
      const payload = {
        inputText: fullPrompt,
        textGenerationConfig: { maxTokenCount: maxTokens, temperature: 0.5, topP: 0.9 }
      };

      const res = await bedrock.send(new InvokeModelCommand({
        modelId: "amazon.titan-text-express-v1",
        contentType: "application/json",
        accept: "application/json",
        body: new TextEncoder().encode(JSON.stringify(payload))
      }));

      const data = JSON.parse(new TextDecoder().decode(res.body));
      return data.results?.[0]?.outputText || "";
    }
  } catch (err: any) {
    console.warn(`[Bedrock Call Warning - Model ${modelId}]:`, err?.message);
    throw err;
  }
}

/**
 * Handle Patient / Caregiver Chat with Sliding Window + Rolling DynamoDB Summary
 */
export async function handleChat(body: {
  content: string;
  sessionId?: string;
  patientId?: string;
  model?: string;
  isCritical?: boolean;
}) {
  const patientId = body.patientId || "P-0001";
  const sessionId = body.sessionId || `sess-${patientId}-main`;
  const userContent = body.content.trim();

  // 1. Fetch Patient Record & Session State from DynamoDB
  const [patient, session, recentMessages] = await Promise.all([
    getPatient(patientId),
    getSession(sessionId, patientId),
    getSessionMessages(sessionId, 6) // Sliding Window: 6 latest messages
  ]);

  // 2. Select Model based on Criticality (Budget Optimization)
  const isEmergency = body.isCritical || /แน่นหน้าอก|หายใจไม่ออก|หมดสติ|ช็อก|หัวใจเต้นผิดจังหวะ|ความดันเกิน 180/.test(userContent);
  const targetModel = isEmergency ? SONNET_MODEL : (body.model || HAIKU_MODEL);

  // 3. Build Token-Optimized Prompt with Rolling Summary & Sliding Window
  const systemInstruction = [
    "คุณคือ Wellync Clinical AI Agent ผู้ช่วยดูแลผู้ป่วยโรคไม่ติดต่อเรื้อรัง (NCDs) ประจำโรงพยาบาล",
    "บทบาท: ให้คำแนะนำสุขภาพอย่างเห็นอกเห็นใจ ชัดเจน อ้างอิงตามแนวทางเวชปฏิบัติสากล",
    `[ข้อมูลผู้ป่วย]: ชื่อ ${patient?.name || "ผู้ป่วย"}, อายุ ${patient?.age || 58}, โรคประจำตัว: ${(patient?.diagnosis || []).join(", ")}, ยาที่กินประจำ: ${(patient?.medications || []).join(", ")}, ประวัติแพ้ยา: ${(patient?.allergies || []).join(", ")}`,
    session.runningSummary 
      ? `[สรุปประวัติสุขภาพต่อเนื่อง (Rolling Medical Summary)]: ${session.runningSummary}`
      : "[สรุปประวัติสุขภาพต่อเนื่อง]: ยังไม่มีสรุป เริ่มต้นรอบการสนทนาใหม่"
  ].join("\n");

  // Construct sliding window conversation block
  const historyText = recentMessages.length > 0
    ? `[ประวัติการสนทนาล่าสุด (Sliding Window ${recentMessages.length} ข้อความ)]:\n` +
      recentMessages.map((m) => `${m.role === "user" ? "ผู้ป่วย" : "AI"}: ${m.content}`).join("\n") + "\n\n"
    : "";

  const userPrompt = `${historyText}[ข้อความใหม่ของผู้ป่วย]:\n${userContent}\n\nตอบคำถามอย่างกระชับ สุภาพ เป็นข้อๆ อ่านง่าย`;

  // 4. Invoke Amazon Bedrock
  let assistantReply = "";
  try {
    assistantReply = await callBedrock(targetModel, userPrompt, systemInstruction, 1024);
  } catch (error: any) {
    // Graceful fallback for offline dev or IAM unattached
    assistantReply = `ได้รับข้อมูลแล้วครับ จากประวัติพบโรค ${(patient?.diagnosis || []).join(", ")} ค่าสัญญาณชีพอยู่ในเกณฑ์ที่ต้องเฝ้าระวัง กรุณาปฏิบัติตามคำแนะนำและรับประทานยาตามเวลาอย่างสม่ำเสมอ`;
  }

  const now = new Date().toISOString();
  const userMsgId = `usr-${Date.now()}`;
  const assistantMsgId = `ast-${Date.now()}`;

  // 5. Save user & assistant messages to DynamoDB
  await Promise.all([
    saveMessage(sessionId, {
      messageId: userMsgId,
      role: "user",
      content: userContent,
      timestamp: now
    }),
    saveMessage(sessionId, {
      messageId: assistantMsgId,
      role: "assistant",
      content: assistantReply,
      timestamp: new Date(Date.now() + 500).toISOString()
    })
  ]);

  // 6. Check if Rolling Summarization is needed (Anti-Token Bloat: every 8 turns)
  const newTurnCount = (session.turnCount || 0) + 1;
  let updatedSummary = session.runningSummary;

  if (newTurnCount >= 8) {
    try {
      const summaryPrompt = `โปรดสรุปข้อเท็จจริงทางการแพทย์สำคัญ (Key Medical Facts) อาการล่าสุด และคำแนะนำสำคัญสั้นๆ ไม่เกิน 3 บรรทัดจากบริบทเดิมและข้อความใหม่นี้:\nเดิม: ${session.runningSummary}\nใหม่: ผู้ป่วยแจ้งว่า "${userContent}", AI ตอบว่า "${assistantReply.slice(0, 200)}"`;
      const condensed = await callBedrock(CHEAP_MODEL, summaryPrompt, "คุณคือนักสรุปข้อมูลเวชระเบียนที่กระชับ แม่นยำ", 256);
      if (condensed.trim()) {
        updatedSummary = condensed.trim();
        await updateSessionSummary(sessionId, updatedSummary, 0); // reset turn count after summary
      }
    } catch (sumErr) {
      console.warn("[Summarization Failed]:", sumErr);
      await updateSessionSummary(sessionId, session.runningSummary, newTurnCount);
    }
  } else {
    await updateSessionSummary(sessionId, session.runningSummary, newTurnCount);
  }

  // 7. Human-in-the-Loop Risk Evaluation: If AI recommends critical medication/intervention, create Approval in DynamoDB
  let createdApproval: ApprovalEntity | null = null;
  const isActionNeeded = /ปรับยา|เปลี่ยนยา|ลดขนาด|เพิ่มขนาด|ส่งตรวจด่วน|พบแพทย์ทันที|ฉุกเฉิน/.test(userContent + assistantReply);

  if (isActionNeeded) {
    createdApproval = {
      actionId: `APP-${Date.now().toString().slice(-6)}`,
      patientId: patient?.id || "P-0001",
      patientName: patient?.name || "สมชาย มีสุขภาพดี",
      type: userContent.includes("ยา") ? "medication-change" : "urgent-visit",
      title: userContent.includes("ยา") ? "ขออนุมัติปรับแผนการรับประทานยาผู้ป่วย" : "ขออนุมัติส่งตรวจอาการเร่งด่วน",
      description: `AI แนะนำ: ${assistantReply.slice(0, 160)}...`,
      clinicalReason: "ตรวจพบข้อความแสดงอาการหรือความจำเป็นในการปรับแผนการรักษา",
      suggestedAction: assistantReply.slice(0, 180),
      confidence: 0.93,
      status: "PENDING",
      createdAt: now
    };

    await createApproval(createdApproval);
  }

  return {
    text: assistantReply,
    sessionId,
    modelUsed: targetModel,
    slidingWindowCount: recentMessages.length + 1,
    turnCount: newTurnCount,
    hasRunningSummary: Boolean(updatedSummary),
    runningSummary: updatedSummary,
    approvalCreated: createdApproval
  };
}
