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
  const patient = db.patients.find((item) => item.id === caregiver?.patientId) || db.patients[0];
  if (!caregiver || !patient) return <MobileShell role="caregiver" title="ผู้ช่วย AI"><p role="status">ยังไม่พบข้อมูลผู้ป่วยที่ผูกกับบัญชีนี้ กรุณาติดต่อผู้ดูแลระบบ</p></MobileShell>;
  return (
    <MobileShell role="caregiver" title="ผู้ช่วย AI">
      <MockChat
        title="เพื่อนช่วยดูแล"
        seedMessages={db.chatHistory?.caregiver}
        patientId={patient.id}
        mode="caregiver"
      />
      <Link href="/caregiver/burnout" className="flex min-h-14 items-center gap-3 px-1"><HeartHandshake className="h-5 w-5 text-emerald-600"/><span className="flex-1 text-sm font-medium">อยากพักใจ แวะตรงนี้ได้</span><span className="text-sky-600">↗</span></Link>
    </MobileShell>
  );
}
