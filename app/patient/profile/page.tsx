"use client";

import Link from "next/link";
import { BellRing, Bluetooth, Building2, ShieldCheck, LogOut, HeartHandshake, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthPassport } from "@/components/health/health-passport";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMockStore } from "@/lib/hooks/use-mock-store";

export default function PatientProfilePage() {
  const { logout, user } = useAuth();
  const { db } = useMockStore();
  const patient = db.patients.find(item => item.email === user?.email) || db.patients[0];
  const caregiver = db.caregivers.find(item => item.patientId === patient.id);
  const consents = db.consents.filter(item => item.patientId === patient.id);
  const connections = [
    { icon: Building2, title: "โรงพยาบาลที่เชื่อมต่อ", text: patient.hospital },
    { icon: Bluetooth, title: "อุปกรณ์สุขภาพ", text: "เครื่องวัดความดัน · เครื่องชั่งน้ำหนัก · Smart Watch" },
    { icon: BellRing, title: "การแจ้งเตือนของคุณ", text: "ยา นัดหมาย และสุขภาพ", href: "/patient/notifications" },
    { icon: ShieldCheck, title: "สิทธิ์การเข้าถึงข้อมูล", text: `${consents.length} รายการ`, href: "/patient/notifications" }
  ];

  return <MobileShell role="patient" title="โปรไฟล์">
    <HealthPassport patient={patient} />
    <section className="px-1 py-3">
      <header className="mb-2"><h3 className="text-base font-bold text-slate-900">การเชื่อมต่อ</h3></header>
      <ul className="divide-y divide-slate-200/60">
        {connections.map(({ icon: Icon, title, text, href }) => {
          const content = <><Icon className="mt-1 h-5 w-5 shrink-0 text-sky-600" /><div className="min-w-0 flex-1"><h4 className="text-sm font-semibold text-slate-800">{title}</h4><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div>{href && <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />}</>;
          return <li key={title}>{href ? <Link href={href} className="flex min-h-14 gap-3 rounded-lg py-4 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">{content}</Link> : <div className="flex gap-3 py-4">{content}</div>}</li>;
        })}
      </ul>
    </section>
    <section className="flex items-start gap-3 rounded-2xl bg-sky-50/80 p-5">
      <HeartHandshake className="mt-1 h-6 w-6 shrink-0 text-sky-600" />
      <div><h3 className="text-xs font-medium text-slate-500">คนที่ช่วยดูแลคุณ</h3><p className="mt-1 text-base font-bold text-slate-800">{caregiver?.name || "ยังไม่มีผู้ดูแลที่เชื่อมต่อ"}</p>{caregiver && <p className="mt-1 text-sm leading-6 text-slate-500">{caregiver.relationship}</p>}</div>
    </section>
    <Button variant="ghost" className="min-h-12 w-full gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={logout}><LogOut className="h-4 w-4" />ออกจากระบบ</Button>
  </MobileShell>;
}
