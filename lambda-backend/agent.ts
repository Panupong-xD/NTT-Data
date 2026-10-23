import { ConverseCommand, type Message, type Tool, type BedrockRuntimeClient, type ContentBlock } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import { listMeals, listCases, readFoodSummary, type patientContext } from "./memoryHandler.js";
import { authorizePatient, HttpError, type Identity } from "./security.js";
import { reserveAIUsage } from "./db.js";

type Context = Awaited<ReturnType<typeof patientContext>>;
export type EvidenceSource = { label: string; detail: string };
export type ActionDraft = { type: "follow-up"; title: string; note: string } | { type: "preference"; notes: string; expectedVersion: number } | { type: "care-plan"; summary: string };
export function contextPacket(context: Context, question: string) {
  const food = /อาหาร|เมนู|กิน|มื้อ|หวาน|เค็ม|โซเดียม|แคล|food|eat|meal|diet|nutrition/i.test(question);
  const health = /สุขภาพ|ความดัน|น้ำตาล|น้ำหนัก|นอน|ออกกำลัง|แนวโน้ม|อาการ|ดูแล|ติดตาม|health|blood|sleep|exercise|care|plan|follow|weight/i.test(question);
  const plan = context.plan;
  const packet = {
    profile: context.profile, preferences: context.preferences.notes,
    todayInBangkok: new Date(new Date(context.asOf).getTime() + 7 * 3600000).toISOString().slice(0, 10),
    activePlan: plan ? { id: plan.id, updatedAt: plan.updatedAt, summary: plan.summary.slice(0, 600),
      diet: food ? plan.diet.slice(0, 6).map((s: string) => s.slice(0, 200)) : undefined,
      exercise: health ? plan.exercise.slice(0, 4).map((s: string) => s.slice(0, 200)) : undefined,
      tasks: plan.tasks.slice(0, 8).map((t: any) => ({ id: t.id, title: t.title, status: t.status, pendingConfirm: t.pendingConfirm })) } : null,
    food: food ? { today: context.food.today, week: context.food.week, ...(/เดือน|month|30\s*วัน/i.test(question) ? { month: context.food.month } : {}) } : undefined,
    recentRecords: health ? context.recentRecords.slice(0, 3) : undefined,
    openCases: context.cases.slice(0, 3), scope: "สรุปเฉพาะข้อมูลที่บันทึก ไม่ใช่ทุกสิ่งที่ผู้ป่วยกินหรือทำ ค่าสารอาหารเป็นค่าประมาณ แผนฉบับย่ออาจไม่ครบ"
  };
  const text = JSON.stringify(packet);
  if (Buffer.byteLength(text) > 12000) throw new HttpError(413, "บริบทสุขภาพยาวเกินขอบเขต กรุณาให้ผู้ดูแลช่วยตรวจรายการข้อมูล");
  const sources: EvidenceSource[] = [{ label: "ข้อมูลสุขภาพพื้นฐาน", detail: "โรค ยา และการแพ้ที่บันทึกในระบบ ไม่รวมชื่อหรือข้อมูลติดต่อ" }];
  if (packet.preferences) sources.push({ label: "สิ่งที่ผู้ป่วยยืนยันให้จำ", detail: "ความต้องการในชีวิตประจำวัน แยกจากข้อมูลการรักษา" });
  if (packet.activePlan) sources.push({ label: "แผนดูแลที่ผ่านการตรวจแล้ว", detail: `ฉบับย่อ อัปเดต ${packet.activePlan.updatedAt}` });
  if (packet.food) for (const summary of Object.values(packet.food)) sources.push({ label: `สรุปอาหาร ${summary.days} วัน`, detail: `${summary.fromDate} ถึง ${summary.toDate}: บันทึก ${summary.recordedMeals} มื้อ ใน ${summary.recordedDays} วัน ค่าสารอาหารเป็นค่าประมาณ` });
  if (packet.recentRecords?.length) sources.push({ label: "บันทึกสุขภาพล่าสุด", detail: `${packet.recentRecords.length} รายการ โดยแสดงสถานะรอยืนยันหรือยืนยันแล้วให้โมเดลเห็น` });
  if (packet.openCases.length) sources.push({ label: "เรื่องที่กำลังติดตาม", detail: `${packet.openCases.length} เรื่องล่าสุด พร้อมสถานะ` });
  return { text, food, sources };
}
const spec = (name: string, description: string, properties: Record<string, any> = {}, required: string[] = []): Tool => ({ toolSpec: { name, description, inputSchema: { json: { type: "object", properties, required, additionalProperties: false } } } });
const stringField = (maxLength: number) => ({ type: "string", maxLength });
export const agentTools = (role: Identity["role"]): Tool[] => [
  spec("read_recent_meals", "อ่านมื้ออาหารที่ผู้ป่วยยืนยันจริง สูงสุด 6 มื้อ ระบุ day ถ้าถามเจาะจงวัน (YYYY-MM-DD เวลาไทย) หรือ days สำหรับย้อนหลัง 1 ถึง 30 วัน", { days: { type: "integer", minimum: 1, maximum: 30 }, day: { type: "string", minLength: 10, maxLength: 10 } }),
  spec("read_follow_ups", "อ่านสถานะและบันทึกล่าสุดของเรื่องติดตามร่วมกัน"),
  spec("read_food_summary", "อ่านสรุปอาหารย้อนหลัง 1 ถึง 365 วัน เมื่อคำถามต้องใช้ข้อมูลนานกว่า 30 วัน คืนเฉพาะสถิติ ไม่โหลดทุกมื้อเข้าโมเดล", { days: { type: "integer", minimum: 1, maximum: 365 } }, ["days"]),
  ...(role !== "doctor" ? [spec("prepare_follow_up", "เตรียมร่างขอให้ทีมช่วยติดตามเมื่อผู้ใช้ต้องการ ยังไม่ส่งหรือบันทึกจนผู้ใช้กดยืนยัน", { title: stringField(120), note: stringField(700) }, ["title", "note"])] : []),
  ...(role === "patient" ? [spec("prepare_preference", "เตรียมความชอบหรือข้อจำกัดชีวิตประจำวันที่ผู้ใช้ขอให้จำ ต้องกดยืนยัน ไม่ใช้เก็บยา โรค หรือการแพ้", { notes: stringField(500) }, ["notes"])] : []),
  ...(role === "doctor" ? [spec("prepare_care_plan", "เตรียมข้อความร่างสำหรับแพทย์ตรวจ ไม่เผยแพร่หรือเปลี่ยนการรักษา", { summary: stringField(1500) }, ["summary"])] : [])
];
const empty = z.object({}).strict();
export async function runAgent(client: BedrockRuntimeClient, identity: Identity, modelId: string, context: Context, messages: Message[], system: { text: string }[], deadline = Date.now() + 24000, requestId?: string) {
  const started = Date.now();
  const allowed = new Set(agentTools(identity.role).map(t => t.toolSpec!.name));
  const trace: { tool: string; status: string }[] = [];
  const sources: EvidenceSource[] = [];
  let draft: ActionDraft | undefined;
  let usedFood = false;
  let inputTokens = 0, outputTokens = 0;
  for (let round = 0; round < 2; round++) {
    await authorizePatient(identity, context.patientId);
    // Keep tool definitions with prior toolUse/toolResult blocks as required by
    // Converse providers. A second-round tool request is never executed.
    const tools = agentTools(identity.role);
    const roundSystem = round === 0 ? system : [...system, { text: "เครื่องมือรอบนี้จบแล้ว ห้ามเรียกเครื่องมือเพิ่ม ตอบจากผลที่มี หากข้อมูลไม่พอให้บอกตามจริง ร่างยังต้องให้ผู้ใช้ยืนยัน" }];
    const units = Buffer.byteLength(JSON.stringify({ system: roundSystem, messages, tools })) + 600;
    await reserveAIUsage(identity.sub, units, round === 0);
    const remaining = deadline - Date.now();
    if (remaining < 1000) throw new HttpError(504, "ผู้ช่วยใช้เวลานาน กรุณาลองคำถามที่สั้นลง");
    const result = await client.send(new ConverseCommand({ modelId, system: roundSystem, messages,
      toolConfig: { tools },
      inferenceConfig: { maxTokens: 600, temperature: 0.2 }
    }), { abortSignal: AbortSignal.timeout(Math.min(remaining, round === 0 ? 14000 : 10000)) });
    inputTokens += result.usage?.inputTokens || 0;
    outputTokens += result.usage?.outputTokens || 0;
    console.log(JSON.stringify({ event: "ai_usage", requestId, modelId, inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens, budgetUnits: units, agentRole: identity.role, modelCall: round + 1, stopReason: result.stopReason }));
    const output = result.output?.message;
    const requests = output?.content?.flatMap(block => block.toolUse ? [block.toolUse] : []) || [];
    if (!requests.length) {
      const text = output?.content?.map(block => block.text || "").join("").trim();
      if (!text || ["guardrail_intervened", "content_filtered"].includes(result.stopReason || "")) throw new HttpError(502, "AI could not return a usable answer");
      await authorizePatient(identity, context.patientId);
      const execution = { modelCalls: round + 1, toolCalls: trace.length, durationMs: Date.now() - started, requiresConfirmation: Boolean(draft) };
      console.log(JSON.stringify({ event: "agent_completed", requestId, modelId, agentRole: identity.role, ...execution }));
      return { text, actionDraft: draft, trace, sources, execution, usedFood, usage: { inputTokens, outputTokens }, stopReason: result.stopReason };
    }
    if (round !== 0 || requests.length > 3 || requests.some(t => !t.toolUseId) || new Set(requests.map(t => t.toolUseId)).size !== requests.length) throw new HttpError(502, "ผู้ช่วยขอทำงานเกินขอบเขต กรุณาลองใหม่");
    // Record only validated tool names, never the model's reasoning or arguments.
    console.log(JSON.stringify({ event: "agent_plan", requestId, agentRole: identity.role, tools: requests.map(t => allowed.has(t.name || "") ? t.name : "unavailable") }));
    messages.push(output!);
    const results: ContentBlock[] = [];
    for (const request of requests) {
      let value: unknown;
      let status: "success" | "error" = "success";
      try {
        if (!request.name || !allowed.has(request.name)) throw new Error("Tool not allowed for this role");
        switch (request.name) {
          case "read_recent_meals": {
            const args = z.object({ days: z.number().int().min(1).max(30).default(7), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).strict().parse(request.input);
            const data = await listMeals(identity, { patientId: context.patientId, days: String(args.days), day: args.day });
            usedFood = true;
            sources.push({ label: "มื้ออาหารที่ยืนยันแล้ว", detail: `${args.day || `ย้อนหลัง ${args.days} วัน`}: ส่ง ${Math.min(data.meals.length, 6)} มื้อ${data.meals.length > 6 || data.nextCursor ? " ยังมีรายการอื่น" : ""}` });
            value = { day: args.day, meals: data.meals.slice(0, 6).map(m => ({ id: m.id, eatenAt: m.eatenAt, name: m.name, portion: m.portion, nutrition: m.nutrition, source: m.source })), hasMore: data.meals.length > 6 || Boolean(data.nextCursor), scope: "สูงสุด 6 มื้อที่บันทึก ไม่ใช่อาหารทั้งหมด" }; break;
          }
          case "read_follow_ups": {
            empty.parse(request.input);
            const data = await listCases(identity, context.patientId, true);
            sources.push({ label: "บันทึกการติดตามร่วมกัน", detail: "สูงสุด 3 เรื่องที่ยังเปิด พร้อมบันทึกล่าสุดเรื่องละไม่เกิน 2 รายการ" });
            value = data.cases.filter(c => c.status !== "resolved").slice(0, 3).map(c => ({ id: c.id, title: c.title, status: c.status, notes: c.notes.slice(-2).map((n: any) => ({ role: n.role, text: n.text.slice(0, 250), date: n.date })) })); break;
          }
          case "read_food_summary": {
            const args = z.object({ days: z.number().int().min(1).max(365) }).strict().parse(request.input);
            const summary = await readFoodSummary(identity, context.patientId, args.days);
            value = summary; usedFood = true;
            sources.push({ label: `สรุปอาหารย้อนหลัง ${args.days} วัน`, detail: `${summary.fromDate} ถึง ${summary.toDate}: ${summary.recordedMeals} มื้อ ใน ${summary.recordedDays} วันที่มีบันทึก ส่งเฉพาะสรุป ไม่ใช่ประวัติทุกมื้อ` }); break;
          }
          case "prepare_follow_up": {
            if (draft) throw new Error("Only one draft per request");
            const args = z.object({ title: z.string().trim().min(1).max(120), note: z.string().trim().min(1).max(700) }).strict().parse(request.input);
            draft = { type: "follow-up", ...args }; value = { status: "draft_only", needsUserConfirmation: true }; break;
          }
          case "prepare_preference": {
            if (draft) throw new Error("Only one draft per request");
            const args = z.object({ notes: z.string().trim().min(1).max(500) }).strict().parse(request.input);
            draft = { type: "preference", notes: args.notes, expectedVersion: context.preferences.version }; value = { status: "draft_only", needsUserConfirmation: true }; break;
          }
          case "prepare_care_plan": {
            if (draft) throw new Error("Only one draft per request");
            const args = z.object({ summary: z.string().trim().min(1).max(1500) }).strict().parse(request.input);
            draft = { type: "care-plan", ...args }; value = { status: "draft_only", needsDoctorReviewAndPublication: true }; break;
          }
        }
      } catch (error) {
        if (error instanceof HttpError && error.status === 403) throw error;
        if (!(error instanceof z.ZodError) && !(error instanceof HttpError && error.status === 400) && !(error instanceof Error && ["Tool not allowed for this role", "Only one draft per request"].includes(error.message))) throw error;
        status = "error"; value = { error: "Invalid or unavailable tool request; no data was changed" };
      }
      trace.push({ tool: allowed.has(request.name || "") ? request.name! : "unavailable", status });
      results.push({ toolResult: { toolUseId: request.toolUseId!, status, content: [{ text: JSON.stringify(value) }] } });
    }
    messages.push({ role: "user", content: results });
  }
  throw new HttpError(502, "AI could not return a usable answer");
}
