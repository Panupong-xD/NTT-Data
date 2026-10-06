import type { HealthRecord } from "./types";

export type MetricStatus = { label: string; tone: "attention" | "low" | "good" | "neutral"; detail: string };
export type GlucoseTiming = NonNullable<HealthRecord["bloodSugarTiming"]>;
export const glucoseTimingLabels = { "before-meal": "ก่อนอาหาร", "after-meal": "หลังเริ่มอาหาร 1–2 ชม.", unknown: "ยังไม่ได้ระบุช่วงที่วัด" };

// General adult diabetes targets, not a diagnosis or an individual treatment goal.
// https://diabetes.org/living-with-diabetes/treatment-care/checking-your-blood-sugar
export function glucoseStatus(value: number | undefined, timing: GlucoseTiming = "unknown"): MetricStatus | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return undefined;
  if (value < 70) return { label: "น้ำตาลต่ำ", tone: "low", detail: "น้ำตาลต่ำกว่า 70 mg/dL ซึ่งต่ำกว่าช่วงอ้างอิงทั้งก่อนและหลังอาหาร" };
  if (timing === "unknown") return { label: "ดูช่วงที่วัด", tone: "neutral", detail: "ยังไม่ได้ระบุว่าวัดก่อนหรือหลังอาหาร จึงยังเทียบช่วงเป้าหมายไม่ได้ เลือกช่วงที่วัดเมื่อบันทึกครั้งถัดไป" };
  const target = timing === "before-meal" ? "80–130 mg/dL" : "ต่ำกว่า 180 mg/dL";
  const detail = `${glucoseTimingLabels[timing]} · เป้าหมายทั่วไปสำหรับผู้ใหญ่ที่เป็นเบาหวาน ${target} เป้าหมายเฉพาะของคุณอาจต่างออกไปตามที่แพทย์กำหนด`;
  if (timing === "before-meal" && value < 80) return { label: "ต่ำกว่าช่วงเป้าหมาย", tone: "low", detail };
  if (timing === "before-meal" ? value > 130 : value >= 180) return { label: "น้ำตาลสูง", tone: "attention", detail };
  return { label: "อยู่ในช่วงเป้าหมาย", tone: "good", detail };
}

export function bloodPressureStatus(record?: Pick<HealthRecord, "systolic" | "diastolic">): MetricStatus | undefined {
  if (!record || !Number.isFinite(record.systolic) || !Number.isFinite(record.diastolic) || record.systolic <= 0 || record.diastolic <= 0) return undefined;
  const high = record.systolic >= 130 || record.diastolic >= 80;
  return { label: high ? "สูงกว่าเป้าหมาย" : "ต่ำกว่า 130/80", tone: high ? "attention" : "neutral", detail: "เทียบเป้าหมายทั่วไปสำหรับผู้ใหญ่ที่เป็นเบาหวาน ต่ำกว่า 130/80 mmHg ตามเป้าหมายที่แสดงในหน้านี้ เป้าหมายเฉพาะของคุณอาจต่างออกไปตามที่แพทย์กำหนด" };
}
