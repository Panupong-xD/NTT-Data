import seed from "./medical-seed.json";
import {
  CarePlan,
  Caregiver,
  ConsentRequest,
  Doctor,
  EarlyWarning,
  HealthRecord,
  MockDatabase,
  NotificationItem,
  Patient,
  RiskLevel
} from "@/lib/types";
import { clamp } from "@/lib/utils";

const today = new Date("2026-07-11T08:00:00+07:00");

function isoDaysAgo(days: number) {
  const date = new Date(today);
  date.setDate(today.getDate() - days);
  return date.toISOString();
}

function riskTone(score: number): RiskLevel {
  if (score >= 76) return "red";
  if (score >= 58) return "orange";
  if (score >= 38) return "yellow";
  return "green";
}

export function evaluateEarlyWarning(records: HealthRecord[], patientId: string): EarlyWarning {
  const latest = records[records.length - 1];
  const last3 = records.slice(-3);
  const last7 = records.slice(-7);
  const bpTrend = last3[last3.length - 1].systolic - last3[0].systolic;
  const weightTrend = last7[last7.length - 1].weight - last7[0].weight;
  const skippedMeds = last7.filter((record) => !record.medicationTaken).length;
  const sleepDrop = last3[0].sleepHours - last3[last3.length - 1].sleepHours;
  const exerciseAverage = last7.reduce((sum, record) => sum + record.exerciseMinutes, 0) / last7.length;
  let score = 22;
  const contributors: string[] = [];

  if (bpTrend >= 8 || latest.systolic >= 145) {
    score += 22;
    contributors.push("ความดันเพิ่มต่อเนื่องใน 3 วัน");
  }
  if (latest.bloodSugar >= 165) {
    score += 18;
    contributors.push("น้ำตาลหลังอาหารสูงกว่าช่วงเป้าหมาย");
  }
  if (weightTrend >= 1.2) {
    score += 14;
    contributors.push("น้ำหนักเพิ่มต่อเนื่องในสัปดาห์นี้");
  }
  if (skippedMeds >= 2) {
    score += 18;
    contributors.push("ลืมรับประทานยาหลายครั้ง");
  }
  if (sleepDrop >= 1.2 || latest.sleepHours < 5.5) {
    score += 10;
    contributors.push("ระยะเวลานอนลดลง");
  }
  if (exerciseAverage < 18) {
    score += 8;
    contributors.push("กิจกรรมทางกายลดลง");
  }

  score = clamp(Math.round(score), 0, 100);
  const level = riskTone(score);

  return {
    id: `warning-${patientId}`,
    patientId,
    level,
    score,
    reason: contributors.length ? contributors.join(" + ") : "ข้อมูลสุขภาพอยู่ในเกณฑ์คงที่",
    contributors: contributors.length ? contributors : ["ค่าความดัน น้ำตาล และกิจกรรมยังสมดุล"],
    doctorRecommendation:
      level === "red"
        ? "พิจารณานัดติดตามเร็วขึ้นและทบทวนยา"
        : level === "orange"
          ? "ติดตามค่าเช้า-เย็น 3 วันและประเมินแผนอาหาร"
          : "ติดตามตามรอบปกติ",
    patientRecommendation:
      level === "red"
        ? "วัดซ้ำ นั่งพัก และติดต่อทีมดูแลหากมีอาการผิดปกติ"
        : "ทำตามแผนดูแล ดื่มน้ำ และบันทึกข้อมูลให้ครบ",
    suggestedAction:
      level === "red" ? "แจ้งแพทย์และผู้ดูแลทันที" : level === "orange" ? "ส่งเตือนผู้ดูแล" : "เฝ้าระวังต่อเนื่อง",
    createdAt: isoDaysAgo(0)
  };
}

function buildPatients(): Patient[] {
  return seed.patientNames.map((name, index) => ({
    id: `P-${String(index + 1).padStart(4, "0")}`,
    citizenId: `11037${String(2600000 + index * 137).padStart(8, "0")}`,
    name,
    age: 45 + (index % 24),
    gender: index % 2 === 0 ? "ชาย" : "หญิง",
    diagnosis: [seed.diagnoses[index % seed.diagnoses.length], seed.diagnoses[(index + 1) % seed.diagnoses.length]],
    allergies: [seed.allergies[index % seed.allergies.length]],
    medications: [seed.medications[index % seed.medications.length], seed.medications[(index + 1) % seed.medications.length]],
    doctorId: `D-${(index % 5) + 1}`,
    caregiverId: `C-${String(index + 1).padStart(4, "0")}`,
    hospital: seed.hospitals[index % seed.hospitals.length],
    healthScore: clamp(91 - index * 2 + (index % 4) * 3, 48, 94),
    email: index === 0 ? "patient@gmail.com" : `patient${index + 1}@gmail.com`,
    height: 165 + (index % 5) * 4,
    weight: 60 + (index % 6) * 3,
    occupation: ["ข้าราชการ", "พนักงานบริษัท", "ค้าขาย", "รับจ้างทั่วไป", "เกษตรกร", "แม่บ้าน"][index % 6]
  }));
}

function buildDoctors(): Doctor[] {
  return seed.doctorNames.map((name, index) => ({
    id: `D-${index + 1}`,
    name,
    specialty: ["อายุรกรรม", "ต่อมไร้ท่อ", "หัวใจ", "เวชศาสตร์ครอบครัว", "ไต"][index],
    hospital: seed.hospitals[index % seed.hospitals.length],
    email: index === 0 ? "doctor@gmail.com" : `doctor${index + 1}@hospital.test`
  }));
}

function buildCaregivers(patients: Patient[]): Caregiver[] {
  return patients.map((patient, index) => ({
    id: patient.caregiverId,
    name: seed.caregiverNames[index % seed.caregiverNames.length],
    patientId: patient.id,
    relationship: ["คู่สมรส", "บุตร", "พี่น้อง", "ญาติ", "ผู้ดูแลประจำ"][index % 5],
    email: index === 0 ? "caregiver@gmail.com" : `caregiver${index + 1}@family.test`,
    mcsiScore: clamp(8 + (index % 8) * 3, 7, 31)
  }));
}

function buildRecords(patients: Patient[]): HealthRecord[] {
  return patients.flatMap((patient, patientIndex) =>
    Array.from({ length: 30 }, (_, reverseDay) => {
      const day = 29 - reverseDay;
      const rise = patientIndex % 4 === 0 ? reverseDay * 0.55 : Math.sin(reverseDay / 4) * 4;
      const skipped = (reverseDay + patientIndex) % (patientIndex % 5 === 0 ? 5 : 11) === 0;
      return {
        id: `${patient.id}-R-${String(reverseDay + 1).padStart(2, "0")}`,
        patientId: patient.id,
        date: isoDaysAgo(day),
        systolic: Math.round(122 + (patientIndex % 8) * 3 + rise),
        diastolic: Math.round(76 + (patientIndex % 6) * 2 + rise / 2),
        bloodSugar: Math.round(112 + (patientIndex % 7) * 8 + Math.max(0, rise * 2)),
        heartRate: Math.round(70 + (patientIndex % 5) * 3 + Math.sin(reverseDay) * 5),
        weight: Number((62 + patientIndex * 0.8 + reverseDay * (patientIndex % 6 === 0 ? 0.07 : 0.01)).toFixed(1)),
        height: patient.height || (165 + (patientIndex % 5) * 4),
        sleepHours: Number((7.2 - (patientIndex % 5 === 0 ? reverseDay * 0.035 : 0) + Math.sin(reverseDay / 5) * 0.3).toFixed(1)),
        exerciseMinutes: Math.max(0, Math.round(34 - (patientIndex % 3) * 7 - (reverseDay % 6) * 2)),
        medicationTaken: !skipped,
        foodScore: clamp(82 - (patientIndex % 8) * 5 + (reverseDay % 5), 42, 94),
        waterGlasses: 5 + ((reverseDay + patientIndex) % 4),
        source: reverseDay % 6 === 0 ? "patient" : reverseDay % 5 === 0 ? "caregiver" : "device",
        confirmationStatus: reverseDay % 6 === 0 ? "pending" : "confirmed",
        note: reverseDay % 10 === 0 ? "เดินน้อยกว่าปกติและนอนดึก" : undefined
      } satisfies HealthRecord;
    })
  );
}

function buildCarePlans(patients: Patient[]): CarePlan[] {
  return patients.map((patient, index) => ({
    id: `CP-${patient.id}`,
    patientId: patient.id,
    doctorId: patient.doctorId,
    status: index % 3 === 0 ? "draft" : "published",
    updatedAt: isoDaysAgo(index % 6),
    summary: "แผนดูแลที่บ้านเน้นควบคุมความดัน น้ำตาล และเพิ่มกิจกรรมแบบค่อยเป็นค่อยไป",
    medication: ["รับประทานยา Metformin 500 mg และ Amlodipine 5 mg หลังอาหารเช้า เวลา 08:00 น.", "ตรวจสอบอาการเวียนศีรษะหลังเริ่มยา Amlodipine"],
    diet: ["ลดเค็ม เลือกอาหารต้ม/นึ่ง", "แบ่งคาร์โบไฮเดรตเป็นมื้อเล็ก", "หลีกเลี่ยงเครื่องดื่มหวาน"],
    exercise: ["เดินเร็ว 20 นาที 5 วันต่อสัปดาห์", "ยืดเหยียดก่อนนอน 8 นาที"],
    measurement: ["วัดความดันเช้าและก่อนนอน", "บันทึกน้ำตาลหลังอาหาร 2 ชั่วโมง"],
    followUp: ["พบแพทย์ตามนัดใน 14 วัน", "ส่งรายงานก่อนวันนัด 1 วัน"],
    lifestyle: ["นอนก่อน 22:30 น.", "ดื่มน้ำ 6-8 แก้ว", "ฝึกหายใจช้า 3 นาทีเมื่อเครียด"],
    tasks: [
      {
        id: `${patient.id}-task-med`,
        title: "รับประทานยาเช้า",
        category: "medication",
        time: "08:00",
        detail: "Metformin 500 mg & Amlodipine 5 mg (หลังอาหาร)",
        status: "pending"
      },
      {
        id: `${patient.id}-task-bp`,
        title: "วัดความดัน",
        category: "measurement",
        time: "09:00",
        detail: "นั่งพัก 5 นาทีก่อนวัด",
        status: index % 2 === 0 ? "completed" : "pending"
      },
      {
        id: `${patient.id}-task-walk`,
        title: "เดินเร็ว",
        category: "exercise",
        time: "17:30",
        detail: "อย่างน้อย 20 นาที",
        status: "pending"
      },
      {
        id: `${patient.id}-task-diet`,
        title: "มื้อเย็นลดเค็ม",
        category: "diet",
        time: "18:30",
        detail: "เลือกผักครึ่งจาน",
        status: "pending"
      }
    ]
  }));
}

function buildNotifications(patients: Patient[]): NotificationItem[] {
  const patient = patients[0];
  return [
    {
      id: "N-1",
      userRole: "patient",
      patientId: patient.id,
      title: "โรงพยาบาลขอเข้าถึงข้อมูล",
      message: "พญ. นฤมล ต้องการดูประวัติสุขภาพเพื่อปรับแผนดูแล",
      type: "hospital",
      date: isoDaysAgo(0),
      read: false
    },
    {
      id: "N-3",
      userRole: "caregiver",
      patientId: patient.id,
      title: "ค้างยืนยันสัญญาณชีพ",
      message: "สมชาย สุขใจ ได้เพิ่มข้อมูลวัดระดับน้ำตาลในเลือดใหม่ รอคุณตรวจสอบและกดยืนยัน",
      type: "caregiver",
      date: isoDaysAgo(0),
      read: false
    },
    {
      id: "N-3-1",
      userRole: "caregiver",
      patientId: patient.id,
      title: "วันนัดหมายพบแพทย์",
      message: `พรุ่งนี้เวลา 09:30 น. ${patient.name} มีนัดพบแพทย์ติดตามผลเบาหวาน ณ ${patient.hospital}`,
      type: "caregiver",
      date: isoDaysAgo(0),
      read: false
    },
    {
      id: "N-3-2",
      userRole: "caregiver",
      patientId: patient.id,
      title: "แจ้งเตือนสภาวะสุขภาพเฝ้าระวัง",
      message: "ระดับความดันโลหิตเฉลี่ยของ สมชาย สุขใจ สูงเกิน 135 mmHg ติดต่อกัน 3 วัน โปรดกระตุ้นให้คนไข้ทานยาตรงเวลา",
      type: "caregiver",
      date: isoDaysAgo(1),
      read: true
    },
    {
      id: "N-4",
      userRole: "doctor",
      patientId: patient.id,
      title: "การตรวจยืนยันกิจกรรมแผนดูแล",
      message: "ผู้ดูแล (วารี สุขใจ) ยืนยันผลการปฏิบัติตามแผนทานยาและออกกำลังกายของ สมชาย สุขใจ แล้ว",
      type: "care-plan",
      date: isoDaysAgo(0),
      read: false
    },
    {
      id: "N-5",
      userRole: "doctor",
      patientId: patients[1].id,
      title: "อนุมัติสิทธิ์เข้าถึงข้อมูลแล้ว",
      message: "กานดา มีสุข ได้กดยืนยันอนุมัติสิทธิ์ให้ท่านเข้าถึงประวัติสุขภาพและการเฝ้าระวังเรียบร้อยแล้ว",
      type: "hospital",
      date: isoDaysAgo(1),
      read: true
    },
    {
      id: "N-6",
      userRole: "doctor",
      patientId: patient.id,
      title: "รายงานการส่งข้อมูลคนไข้",
      message: "สมชาย สุขใจ ได้มีการอัปโหลดและซิงค์ข้อมูลตรวจวัดระดับความดันโลหิตและระดับน้ำตาลชุดใหม่",
      type: "warning",
      date: isoDaysAgo(2),
      read: true
    }
  ];
}

function buildConsents(patients: Patient[]): ConsentRequest[] {
  return [
    {
      id: "CONSENT-1",
      patientId: patients[0].id,
      doctorId: patients[0].doctorId,
      hospital: patients[0].hospital,
      reason: "ขอเข้าถึง EMR และข้อมูล home monitoring เพื่อปรับแผนดูแล",
      status: "waiting",
      date: isoDaysAgo(0)
    },
    {
      id: "CONSENT-2",
      patientId: patients[1].id,
      doctorId: patients[1].doctorId,
      hospital: patients[1].hospital,
      reason: "ติดตามผลหลังเปลี่ยนยา",
      status: "approved",
      date: isoDaysAgo(2)
    }
  ];
}

export function createMockDatabase(): MockDatabase {
  const patients = buildPatients();
  const doctors = buildDoctors();
  const caregivers = buildCaregivers(patients);
  const healthRecords = buildRecords(patients);
  const carePlans = buildCarePlans(patients);
  const earlyWarnings = patients.map((patient) =>
    evaluateEarlyWarning(
      healthRecords.filter((record) => record.patientId === patient.id),
      patient.id
    )
  );

  return {
    patients,
    doctors,
    caregivers,
    healthRecords,
    carePlans,
    notifications: buildNotifications(patients),
    consents: buildConsents(patients),
    earlyWarnings,
    chatHistory: {
      patient: [
        {
          id: "chat-p-1",
          role: "assistant",
          content: "วันนี้ความดันสูงขึ้นเล็กน้อย ลองวัดซ้ำหลังนั่งพัก 5 นาที และลดอาหารเค็มในมื้อเย็นนะคะ",
          time: "08:35"
        }
      ],
      caregiver: [
        {
          id: "chat-c-1",
          role: "assistant",
          content: "งานดูแลวันนี้มี 4 รายการ สำคัญที่สุดคือยืนยันค่าน้ำตาลและเตือนการเดินช่วงเย็นค่ะ",
          time: "08:40"
        }
      ]
    }
  };
}

export const mockDb = createMockDatabase();
