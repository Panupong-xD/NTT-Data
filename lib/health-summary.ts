import type { EarlyWarning, HealthRecord, MockDatabase, RiskLevel } from "./types";
import { bloodPressureStatus, glucoseStatus } from "./health-status";

function riskTone(score: number): RiskLevel {
  if (score >= 76) return "red";
  if (score >= 58) return "orange";
  if (score >= 38) return "yellow";
  return "green";
}

// A transparent prototype index, not a validated clinical risk score.
// Health and risk use one calculation: health = 100 - risk.
export function evaluateEarlyWarning(records: HealthRecord[], patientId: string): EarlyWarning {
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const latest = ordered.at(-1);
  const last3 = ordered.slice(-3);
  const last7 = ordered.slice(-7);
  const contributors: string[] = [];
  let score = latest ? 10 : 0;

  if (latest) {
    const bpTrend = latest.systolic - last3[0].systolic;
    if (bloodPressureStatus(latest)?.tone === "attention") {
      score += latest.systolic >= 145 ? 22 : 14;
      contributors.push("ความดันล่าสุดสูงกว่าเป้าหมาย");
    }
    if (last3.length >= 3 && bpTrend >= 8) {
      score += 8;
      contributors.push("ความดันเพิ่มขึ้นใน 3 บันทึกล่าสุด");
    }
    const sugar = glucoseStatus(latest.bloodSugar, latest.bloodSugarTiming);
    if (sugar?.tone === "attention" || sugar?.tone === "low") {
      score += 18;
      contributors.push(`${sugar.label}${latest.bloodSugarTiming === "before-meal" ? "ก่อนอาหาร" : latest.bloodSugarTiming === "after-meal" ? "หลังอาหาร" : ""}`);
    }
    if (last7.length >= 7 && latest.weight - last7[0].weight >= 1.2) {
      score += 14;
      contributors.push("น้ำหนักเพิ่มใน 7 บันทึกล่าสุด");
    }
    if (last7.filter(record => !record.medicationTaken).length >= 2) {
      score += 18;
      contributors.push("ลืมรับประทานยาหลายครั้ง");
    }
    if ((last3.length >= 3 && last3[0].sleepHours - latest.sleepHours >= 1.2) || latest.sleepHours < 5.5) {
      score += 10;
      contributors.push("ระยะเวลานอนลดลง");
    }
    if (last7.reduce((sum, record) => sum + record.exerciseMinutes, 0) / last7.length < 18) {
      score += 8;
      contributors.push("กิจกรรมทางกายลดลง");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = riskTone(score);
  return {
    id: `warning-${patientId}`, patientId, level, score,
    reason: !latest ? "ยังไม่มีบันทึกสุขภาพ" : contributors.length ? contributors.join(" + ") : "ไม่พบค่าสูงกว่าเป้าหมายจากข้อมูลที่ใช้ประเมิน",
    contributors,
    doctorRecommendation: level === "red" ? "พิจารณานัดติดตามเร็วขึ้นและทบทวนยา" : level === "orange" ? "ติดตามค่าเช้า-เย็น 3 วันและประเมินแผนอาหาร" : "ติดตามตามรอบปกติ",
    patientRecommendation: level === "red" ? "วัดซ้ำ นั่งพัก และติดต่อทีมดูแลหากมีอาการผิดปกติ" : "ทำตามแผนดูแล ดื่มน้ำ และบันทึกข้อมูลให้ครบ",
    suggestedAction: level === "red" ? "แจ้งแพทย์และผู้ดูแลทันที" : level === "orange" ? "ส่งเตือนผู้ดูแล" : "เฝ้าระวังต่อเนื่อง",
    createdAt: latest?.date || ""
  };
}

export function syncHealthSummaries(db: MockDatabase): MockDatabase {
  let changed = false;
  const assessments = new Map(db.patients.map(patient => {
    const records = db.healthRecords.filter(record => record.patientId === patient.id);
    return [patient.id, { warning: records.length ? evaluateEarlyWarning(records, patient.id) : undefined }];
  }));
  const patients = db.patients.map(patient => {
    const warning = assessments.get(patient.id)?.warning;
    const healthScore = warning ? 100 - warning.score : null;
    if (patient.healthScore === healthScore) return patient;
    changed = true;
    return { ...patient, healthScore };
  });
  const earlyWarnings = db.earlyWarnings.filter(warning => {
    const keep = !!assessments.get(warning.patientId)?.warning;
    if (!keep) changed = true;
    return keep;
  }).map(warning => {
    const next = assessments.get(warning.patientId)!.warning!;
    if (JSON.stringify(warning) === JSON.stringify(next)) return warning;
    changed = true;
    return next;
  });
  for (const { warning } of assessments.values()) {
    if (warning && !earlyWarnings.some(existing => existing.patientId === warning.patientId)) {
      changed = true;
      earlyWarnings.push(warning);
    }
  }
  return changed ? { ...db, patients, earlyWarnings } : db;
}
