"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, ArrowRight, ArrowUpRight, CalendarDays, ClipboardCheck, Users } from "lucide-react";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { ApprovalQueue } from "@/components/doctor/approval-queue";
import { CareIllustration, EmptyState, PatientAvatar, RiskPill, SectionHeading } from "@/components/doctor/ui";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { formatThaiDate } from "@/lib/utils";

export default function DoctorDashboardPage() {
  const { db } = useMockStore();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const highRisk = db.earlyWarnings.filter(w => w.level === "red" || w.level === "orange").sort((a,b) => b.score - a.score);
  const pendingConsent = db.consents.filter(c => c.status === "waiting").length;
  const notifications = db.notifications.filter(n => n.userRole === "doctor").sort((a,b) => b.date.localeCompare(a.date));
  const published = db.carePlans.filter(p => p.status === "published").length;
  return <DoctorShell title="ภาพรวมการดูแล" description="เริ่มต้นวันด้วยสิ่งที่สำคัญกับผู้ป่วยของคุณ" action={<span className="text-xs text-slate-400 flex items-center gap-2"><CalendarDays size={15} />{new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric" })}</span>}>
    <section className="doctor-hero"><div className="doctor-hero-content"><div className="doctor-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" />ดูแลต่อเนื่อง ใกล้ชิดกว่าเดิม</div><h2>ทุกข้อมูลเล็ก ๆ<br />ช่วยให้ดูแลได้ดีขึ้น</h2><p>{highRisk.length ? `มีผู้ป่วย ${highRisk.length} รายที่ควรติดตามเป็นพิเศษ` : "ภาพรวมพร้อมแล้ว มาดูความคืบหน้าของผู้ป่วยกัน"}</p><div className="doctor-hero-actions"><Link className="doc-button" href="/doctor/alerts">เริ่มติดตามผู้ป่วย <ArrowRight size={16} /></Link><Link className="doctor-text-link" href="/doctor/patients">ดูผู้ป่วยทั้งหมด <ArrowUpRight size={15} /></Link></div></div><CareIllustration /><svg aria-hidden="true" className="doctor-hero-wave" viewBox="0 0 1000 20" preserveAspectRatio="none"><path d="M0 12Q250-4 500 10T1000 4V20H0Z" fill="currentColor" /></svg></section>
    <div className="doctor-stats">{[{ label:"ผู้ป่วยทั้งหมด", value:db.patients.length, unit:"ราย", icon:Users },{ label:"ควรติดตามเป็นพิเศษ", value:highRisk.length, unit:"ราย", icon:Activity },{ label:"แผนที่ส่งต่อแล้ว", value:published, unit:"แผน", icon:ClipboardCheck },{ label:"ข้อเสนอรอพิจารณา", value:pendingCount ?? "—", unit:"รายการ", icon:ClipboardCheck }].map(stat => <div className="doctor-stat" key={stat.label}><div className="doctor-stat-caption"><stat.icon />{stat.label}</div><div className="doctor-stat-number">{stat.value}<small>{stat.unit}</small></div></div>)}</div>
    <div className="doctor-dashboard-columns"><div><section className="doctor-panel"><SectionHeading title="ผู้ป่วยที่ควรติดตามก่อน" detail="เรียงตามคะแนนความเสี่ยง"><Link className="doctor-text-link" href="/doctor/alerts">ดูทั้งหมด <ArrowUpRight size={15} /></Link></SectionHeading><div>{highRisk.slice(0,5).map((warning,i) => { const patient = db.patients.find(p => p.id === warning.patientId); if (!patient) return null; return <Link key={warning.id} href={`/doctor/patients?patient=${patient.id}`} className="doctor-list-row"><PatientAvatar name={patient.name} index={i} /><div className="doctor-list-copy"><b>{patient.name}</b><p>{warning.reason}</p></div><RiskPill level={warning.level} score={warning.score} /><ArrowUpRight size={16} className="doctor-row-arrow" /></Link>; })}{!highRisk.length && <EmptyState title="ไม่มีเคสที่ต้องติดตามเป็นพิเศษ" />}</div></section><ApprovalQueue onCount={setPendingCount} /></div>
    <div><section className="doctor-sticky-note"><h2>อย่าลืมติดตามคำขอเข้าถึง</h2><div className="doctor-note-count">{pendingConsent}<span>คำขอรอผู้ป่วยอนุมัติ</span></div><p>เข้าถึงข้อมูลสุขภาพได้เมื่อผู้ป่วยยินยอมแล้ว</p><Link className="doctor-text-link mt-4" href="/doctor/patients">ไปที่รายชื่อผู้ป่วย <ArrowUpRight size={15} /></Link></section><section className="doctor-panel"><SectionHeading title="ความเคลื่อนไหวล่าสุด" /><div className="doctor-timeline">{notifications.slice(0,5).map(item => <div key={item.id} className="doctor-timeline-item"><b>{item.title}</b><p>{item.message}</p><small>{db.patients.find(p => p.id === item.patientId)?.name} · {formatThaiDate(item.date)}</small></div>)}</div>{!notifications.length && <EmptyState title="ยังไม่มีความเคลื่อนไหวใหม่" />}</section></div></div>
  </DoctorShell>;
}
