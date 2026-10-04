"use client";

import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { MockChat } from "@/components/chat/mock-chat";
import { useMockStore } from "@/lib/hooks/use-mock-store";

import { useAuth } from "@/lib/hooks/use-auth";

export default function CaregiverAiPage() {
  const { db } = useMockStore();
  const { user } = useAuth();
  const caregiver = db.caregivers.find(c => c.email === user?.email) || db.caregivers[0];
  const patient = db.patients.find((item) => item.id === caregiver.patientId) || db.patients[0];
  const records = db.healthRecords.filter((item) => item.patientId === patient.id);
  const latest = records[records.length - 1] || {
    systolic: 120,
    diastolic: 80,
    bloodSugar: 95,
    heartRate: 72,
    weight: patient.weight || 70,
    height: patient.height || 170,
    sleepHours: 7.5,
    confirmationStatus: "confirmed"
  };
  const plan = db.carePlans.find((item) => item.patientId === patient.id) || {
    id: `plan-${patient.id}`,
    patientId: patient.id,
    doctorId: "demo-doctor",
    status: "approved",
    updatedAt: new Date().toISOString(),
    summary: "ควบคุมอาหารเค็มและน้ำตาลอย่างสม่ำเสมอ ออกกำลังกายเบาๆ",
    medication: ["Metformin 500mg (เช้า-เย็น หลังอาหาร)", "Amlodipine 5mg (เช้า หลังอาหาร)"],
    diet: ["ลดคาร์โบไฮเดรตเชิงเดี่ยว ชา กาแฟหวาน", "เน้นโปรตีนไขมันต่ำ ผักต้ม"],
    exercise: ["เดินเร็ว 30 นาทีต่อวัน", "สัปดาห์ละ 3-5 วัน"],
    measurement: ["วัดความดันทุกเช้าก่อนทานอาหาร", "เจาะระดับน้ำตาลสัปดาห์ละ 2 ครั้ง"],
    followUp: ["พบแพทย์เพื่อประเมินผลในอีก 2 เดือน"],
    lifestyle: ["นอนหลับพักผ่อนให้เพียงพอ 7-8 ชั่วโมง", "ดื่มน้ำสะอาดวันละ 8 แก้ว"],
    tasks: []
  };
  return (
    <MobileShell role="caregiver" title="ผู้ช่วย AI">
      <MockChat
        title="เพื่อนช่วยดูแล"
        seedMessages={db.chatHistory.caregiver}
        mode="caregiver"
        context={`ผู้ดูแล ${caregiver.name}; ดูแล ${patient.name}; diagnosis ${patient.diagnosis.join(", ")}; care plan ${plan.summary}; BP ล่าสุด ${latest.systolic}/${latest.diastolic}; blood sugar ${latest.bloodSugar}; MCSI ${caregiver.mcsiScore}`}
      />
      <Link href="/caregiver/burnout" className="flex min-h-14 items-center gap-3 px-1"><HeartHandshake className="h-5 w-5 text-emerald-600"/><span className="flex-1 text-sm font-medium">อยากพักใจ แวะตรงนี้ได้</span><span className="text-sky-600">↗</span></Link>
    </MobileShell>
  );
}
