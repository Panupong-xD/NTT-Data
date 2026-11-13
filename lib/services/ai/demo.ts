import type { HealthRecord, MockDatabase } from "@/lib/types";
import type { AssistantReply } from "@/lib/services/patient-memory";

// Demo mode has no backend or model. Replies are rule-based summaries of the synthetic data in this browser.
export const DEMO_NOTICE = "AI จำลองสำหรับสาธิต ตอบจากกฎและข้อมูลตัวอย่างในเบราว์เซอร์ ไม่ได้เรียกโมเดล AI จริง และไม่ใช่คำแนะนำทางการแพทย์";
// Same pattern and wording as lambda-backend/chatHandler.ts so both modes behave alike for emergencies.
const emergency = /แน่นหน้าอก|เจ็บหน้าอก|หายใจไม่ออก|หมดสติ|ชัก|chest pain|can.?t breathe|unconscious/i;
const EMERGENCY_TEXT = "อาการที่ระบุอาจต้องได้รับความช่วยเหลือเร่งด่วน กรุณาติดต่อบริการฉุกเฉินในพื้นที่หรือไปห้องฉุกเฉินทันที อย่ารอคำตอบจาก AI ระบบนี้ไม่ได้ติดต่อทีมฉุกเฉินหรือแพทย์ให้คุณ";

type Food = { match: RegExp; name: string; calories: number; protein: number; carbs: number; fat: number; sugar: number; sodium: number; score: number; tips: string[] };
// Rough per-serving figures for common Thai dishes; shown to users as estimates only.
const FOODS: Food[] = [
  { match: /กะเพรา|kaprao|basil/i, name: "ข้าวผัดกะเพราหมูสับไข่ดาว", calories: 580, protein: 25, carbs: 65, fat: 24, sugar: 4, sodium: 900, score: 60, tips: ["ขอสั่งไม่เค็ม ลดน้ำปลาพริก", "ไข่ดาวเปลี่ยนเป็นไข่ต้มช่วยลดไขมัน", "เพิ่มผักข้างจานเพื่อชะลอน้ำตาล"] },
  { match: /ข้าวมันไก่|chicken rice/i, name: "ข้าวมันไก่", calories: 600, protein: 28, carbs: 70, fat: 22, sugar: 2, sodium: 1100, score: 55, tips: ["เลือกไก่ต้มไม่เอาหนัง", "ขอข้าวครึ่งจานหรือข้าวสวยแทนข้าวมัน", "จิ้มน้ำจิ้มแต่น้อยเพราะโซเดียมสูง"] },
  { match: /ส้มตำ|somtam|papaya/i, name: "ส้มตำไทย", calories: 120, protein: 3, carbs: 25, fat: 1, sugar: 12, sodium: 1300, score: 65, tips: ["สั่งหวานน้อย เค็มน้อย", "กินคู่กับไก่ย่างไม่ติดหนังเพื่อเพิ่มโปรตีน", "ระวังข้าวเหนียวปริมาณมาก"] },
  { match: /ผัดไทย|pad ?thai/i, name: "ผัดไทยกุ้งสด", calories: 550, protein: 18, carbs: 75, fat: 18, sugar: 20, sodium: 1200, score: 50, tips: ["ไม่เติมน้ำตาลบนโต๊ะ", "เพิ่มถั่วงอกและใบกุยช่าย", "แบ่งครึ่งจานถ้ามื้อก่อนหน้ากินแป้งเยอะ"] },
  { match: /ก๋วยเตี๋ยว|noodle/i, name: "ก๋วยเตี๋ยวน้ำใส", calories: 350, protein: 18, carbs: 50, fat: 8, sugar: 3, sodium: 1500, score: 60, tips: ["ซดน้ำซุปแต่น้อยเพราะโซเดียมสูง", "ไม่เติมน้ำตาลและน้ำปลา", "เลือกเส้นเล็กปริมาณพอดี"] },
  { match: /สลัด|salad|ผักต้ม/i, name: "สลัดผักอกไก่", calories: 250, protein: 25, carbs: 15, fat: 9, sugar: 5, sodium: 450, score: 85, tips: ["เลือกน้ำสลัดใสแทนน้ำสลัดครีม", "เป็นมื้อที่เหมาะกับแผนลดเค็มและหวาน"] },
  { match: /ข้าวผัด|fried rice/i, name: "ข้าวผัดหมู", calories: 520, protein: 15, carbs: 70, fat: 18, sugar: 3, sodium: 950, score: 55, tips: ["ขอข้าวน้อยและเพิ่มผัก", "ไม่เติมซอสปรุงรสเพิ่ม"] }
];
const DEFAULT_FOOD: Food = { match: /$^/, name: "อาหารจานเดียว (ตัวอย่าง)", calories: 500, protein: 20, carbs: 60, fat: 18, sugar: 5, sodium: 900, score: 60, tips: ["ระบุชื่อเมนูเพื่อให้ประมาณค่าได้ใกล้ขึ้น", "เน้นผักครึ่งจาน ลดเค็มและหวาน"] };

const avg = (rows: HealthRecord[], key: "systolic" | "diastolic" | "bloodSugar" | "sleepHours" | "exerciseMinutes") =>
  rows.length ? Math.round(rows.reduce((n, r) => n + r[key], 0) / rows.length * (key === "sleepHours" ? 10 : 1)) / (key === "sleepHours" ? 10 : 1) : undefined;
const trend = (now?: number, before?: number) => now === undefined || before === undefined ? "" : now > before + 2 ? " (สูงขึ้นจากช่วงก่อน)" : now < before - 2 ? " (ลดลงจากช่วงก่อน)" : " (ใกล้เคียงช่วงก่อน)";

function foodReply(prompt: string): string {
  const name = prompt.match(/เมนูอาหาร: "([^"]*)"/)?.[1] || "";
  const food = FOODS.find(f => f.match.test(name)) || DEFAULT_FOOD;
  return JSON.stringify({
    name: food.name, calories: `${food.calories} kcal`, protein: `${food.protein} g`, carbs: `${food.carbs} g`, fat: `${food.fat} g`,
    sugar: `${food.sugar} g`, sodium: `${food.sodium} mg`, score: `${food.score}/100`,
    recommendation: [...food.tips, "ค่าทั้งหมดเป็นค่าประมาณจากตารางตัวอย่างของ AI จำลอง"]
  });
}

export function demoAssistant(db: MockDatabase, content: string, options: { patientId?: string; purpose?: "chat" | "analysis" } = {}, now = new Date()): AssistantReply {
  if (emergency.test(content)) return { text: EMERGENCY_TEXT };
  if (options.purpose === "analysis") {
    if (content.includes("เมนูอาหาร:")) return { text: foodReply(content) };
    // Vitals photo: a fixed sample reading; the page asks the user to check it before saving.
    return { text: JSON.stringify({ type: "blood_pressure", systolic: 128, diastolic: 82, heartRate: 76, bloodSugar: null, weight: null, confidence: "high" }) };
  }

  const patient = db.patients.find(p => p.id === options.patientId) || db.patients[0];
  if (!patient) return { text: "ยังไม่พบข้อมูลผู้ป่วยในโหมดสาธิต" };
  const records = db.healthRecords.filter(r => r.patientId === patient.id && r.confirmationStatus !== "rejected").sort((a, b) => a.date.localeCompare(b.date));
  const recent = records.slice(-7);
  const prior = records.slice(-14, -7);
  const plan = db.carePlans.filter(p => p.patientId === patient.id && p.status !== "draft").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const sys = avg(recent, "systolic"), dia = avg(recent, "diastolic"), sugar = avg(recent, "bloodSugar");
  const sources: { label: string; detail: string }[] = [{ label: "AI จำลอง (โหมดสาธิต)", detail: DEMO_NOTICE }];
  if (recent.length) sources.push({ label: "บันทึกสุขภาพล่าสุด", detail: `${recent.length} รายการล่าสุด เทียบกับ ${prior.length} รายการก่อนหน้า` });
  if (plan) sources.push({ label: "แผนดูแลที่ผ่านการตรวจแล้ว", detail: `อัปเดต ${plan.updatedAt.slice(0, 10)}` });
  const contextSource = { asOf: now.toISOString(), revision: "demo", planUpdatedAt: plan?.updatedAt, sources };

  if (/ร่าง/.test(content) && /แผนดูแล/.test(content)) {
    const summary = [
      `${patient.diagnosis.join(" และ ") || "ผู้ป่วยโรคเรื้อรัง"}: ความดันเฉลี่ย ${recent.length} ครั้งล่าสุด ${sys ?? "-"}/${dia ?? "-"} mmHg${trend(sys, avg(prior, "systolic"))} น้ำตาลเฉลี่ย ${sugar ?? "-"} mg/dL${trend(sugar, avg(prior, "bloodSugar"))}`,
      "แนะนำวัดความดันทุกเช้าก่อนอาหาร ลดอาหารเค็มและหวาน และเดินเร็ว 30 นาทีอย่างน้อย 5 วันต่อสัปดาห์",
      "คงการใช้ยาตามแผนเดิม ร่างนี้ไม่เสนอปรับยา ต้องให้แพทย์ตรวจก่อนเผยแพร่"
    ].join(" ");
    return { text: summary, actionDraft: { type: "care-plan", summary }, contextSource, trace: [], execution: { modelCalls: 0, toolCalls: 0, durationMs: 0, requiresConfirmation: true } };
  }

  const sections: string[] = [];
  const asked = (pattern: RegExp) => pattern.test(content);
  if (asked(/ความดัน|blood pressure|\bbp\b/i)) sections.push(`**ความดัน** เฉลี่ย ${recent.length} ครั้งล่าสุด ${sys ?? "-"}/${dia ?? "-"} mmHg${trend(sys, avg(prior, "systolic"))} เป้าหมายทั่วไปคือต่ำกว่า 130/80 mmHg\n${(plan?.measurement || []).map(m => `- ${m}`).join("\n")}`);
  if (asked(/น้ำตาล|เบาหวาน|glucose|sugar/i)) sections.push(`**น้ำตาล** เฉลี่ย ${sugar ?? "-"} mg/dL${trend(sugar, avg(prior, "bloodSugar"))} ควรระบุว่าวัดก่อนหรือหลังอาหารทุกครั้งเพื่อเทียบเป้าหมายได้ถูก`);
  if (asked(/อาหาร|กิน|มื้อ|เมนู|หวาน|เค็ม|food|meal|diet/i)) sections.push(`**อาหารตามแผน**\n${(plan?.diet.length ? plan.diet : ["ลดเค็ม ลดหวาน เน้นผักครึ่งจาน"]).map(d => `- ${d}`).join("\n")}`);
  if (asked(/ยา|medicine|medication/i)) sections.push(`**ยาที่บันทึกไว้**\n${patient.medications.map(m => `- ${m}`).join("\n") || "- ยังไม่มีรายการยา"}\nห้ามปรับหรือหยุดยาเอง หากมีอาการข้างเคียงให้ปรึกษาแพทย์`);
  if (asked(/นอน|ออกกำลัง|เดิน|sleep|exercise/i)) sections.push(`**การนอนและออกกำลังกาย** นอนเฉลี่ย ${avg(recent, "sleepHours") ?? "-"} ชม. ออกกำลังเฉลี่ย ${avg(recent, "exerciseMinutes") ?? "-"} นาทีต่อวัน\n${(plan?.exercise || []).map(e => `- ${e}`).join("\n")}`);
  if (asked(/เหนื่อย|เครียด|พัก|ท้อ|burnout|tired/i)) sections.push("**ดูแลใจผู้ดูแลด้วย**\n- แบ่งงานให้คนในบ้านช่วยอย่างน้อยหนึ่งอย่างต่อวัน\n- พักสั้น ๆ 10 นาทีระหว่างวัน\n- ลองทำแบบประเมินในหน้า \"อยากพักใจ\" และคุยกับทีมดูแลถ้ารู้สึกหนักต่อเนื่อง");
  if (asked(/วันนี้|ตาราง|แผน|ดูแล|today|plan|schedule/i) || !sections.length) {
    const pending = (plan?.tasks || []).filter(t => t.status === "pending").sort((a, b) => a.time.localeCompare(b.time));
    sections.push(`**สิ่งที่ควรทำวันนี้**\n${pending.map(t => `- ${t.time} ${t.title}`).join("\n") || "- ทำครบตามแผนแล้ว"}`);
    if (sys !== undefined && sections.length === 1) sections.push(`ภาพรวมล่าสุด: ความดันเฉลี่ย ${sys}/${dia} mmHg น้ำตาลเฉลี่ย ${sugar} mg/dL ถามเรื่องความดัน น้ำตาล อาหาร ยา หรือการนอนเพิ่มได้`);
  }
  return { text: sections.join("\n\n"), contextSource, trace: [], execution: { modelCalls: 0, toolCalls: 0, durationMs: 0, requiresConfirmation: false } };
}
