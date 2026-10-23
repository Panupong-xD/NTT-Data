import type { AssistantReply } from "@/lib/services/patient-memory";

const toolLabels: Record<string, string> = {
  read_recent_meals: "อ่านมื้ออาหารที่ยืนยันแล้ว",
  read_food_summary: "อ่านสรุปอาหารย้อนหลัง",
  read_follow_ups: "อ่านเรื่องติดตามร่วมกัน",
  prepare_follow_up: "เตรียมร่างส่งให้ผู้ดูแล",
  prepare_preference: "เตรียมข้อมูลให้ผู้ป่วยยืนยันก่อนจำ",
  prepare_care_plan: "เตรียมร่างให้แพทย์ตรวจ",
  unavailable: "คำขอเครื่องมือที่ไม่ได้รับอนุญาต"
};
export function AgentEvidence({ reply }: { reply: Pick<AssistantReply, "contextSource" | "trace" | "execution"> }) {
  const { contextSource: source, execution } = reply;
  if (!source) return null;
  const sources = Array.isArray(source.sources) ? source.sources.slice(0, 12) : [];
  const trace = Array.isArray(reply.trace) ? reply.trace.slice(0, 3) : [];
  const date = new Date(source.asOf);
  return <details className="my-3 rounded-xl border border-sky-100 bg-white/70 p-3 text-xs leading-6 text-slate-600">
    <summary className="cursor-pointer font-medium text-sky-800">{source.stale ? "ข้อมูลเปลี่ยนแล้ว ถามใหม่เพื่อใช้ข้อมูลล่าสุด" : "ดูข้อมูลอ้างอิงและขั้นตอนของผู้ช่วย"}</summary>
    <p>ตรวจสิทธิ์และเลือกข้อมูลที่เกี่ยวข้องก่อนส่งให้ AI{Number.isNaN(date.getTime()) ? "" : ` · ข้อมูล ณ ${date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`}</p>
    {sources.length > 0 ? <ul className="my-2 list-disc space-y-1 pl-5">{sources.map((item, i) => <li key={i}><b>{item.label}</b> — {item.detail}</li>)}</ul> : <p>คำตอบจากเวอร์ชันก่อนหน้าไม่มีรายละเอียดแหล่งข้อมูล กรุณาถามใหม่</p>}
    {trace.length > 0 ? <><p className="font-medium">เครื่องมือที่ Agent เลือกและเรียก</p><ol className="list-decimal pl-5">{trace.map((item, i) => <li key={i}>{toolLabels[item.tool] || "เครื่องมือที่ไม่รองรับ"} · {item.status === "success" ? "สำเร็จ" : "ปฏิเสธคำขอ ไม่เปลี่ยนข้อมูล"}</li>)}</ol></> : <p>ตอบจากบริบทที่เตรียมไว้ โดยไม่เรียกเครื่องมือเพิ่มเติม</p>}
    {execution && <p className="mt-2">เรียกโมเดล {execution.modelCalls} ครั้ง · เครื่องมือ {execution.toolCalls} ครั้ง{execution.requiresConfirmation ? " · มีเพียงร่าง ต้องให้คนตรวจและยืนยันก่อนดำเนินการ" : ""}</p>}
    <p className="mt-2 text-slate-500">รายการนี้แสดงข้อมูลที่ส่งประกอบคำตอบและการเรียกเครื่องมือ ไม่ใช่หลักฐานว่าคำตอบทางสุขภาพถูกต้อง ค่าสารอาหารเป็นค่าประมาณ</p>
  </details>;
}
