"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ClipboardCheck, HeartPulse } from "lucide-react";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { ApprovalQueue } from "@/components/doctor/approval-queue";
import { DoctorTabs, DoctorTabContent, EmptyState, PatientAvatar, RiskPill, SectionHeading } from "@/components/doctor/ui";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { formatThaiDate } from "@/lib/utils";

export default function DoctorAlertsPage() {
  const { db } = useMockStore();
  const alerts = db.earlyWarnings.filter(w => w.level !== "green").sort((a,b) => b.score - a.score);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(alerts[0]?.id || "");
  const filtered = alerts.filter(w => filter === "all" || (filter === "high" ? w.level === "red" || w.level === "orange" : w.level === "yellow"));
  const selected = filtered.find(w => w.id === selectedId) || filtered[0];
  const patient = db.patients.find(p => p.id === selected?.patientId);
  const color = selected?.level === "red" ? "#d4928a" : selected?.level === "orange" ? "#dfb380" : "#d0bf7d";
  return <DoctorShell title="การติดตามผู้ป่วย" description="เห็นสัญญาณสำคัญ และเลือกดูแลเคสที่ต้องการความใส่ใจก่อน">
    <div className="doctor-alert-layout"><div><section className="doctor-panel"><SectionHeading title="สัญญาณที่ควรติดตาม" detail={`${alerts.length} รายการจากข้อมูลสุขภาพที่บันทึก`} /><DoctorTabs value={filter} onChange={setFilter} tabs={[{ value:"all", label:"ทั้งหมด" },{ value:"high", label:"ควรติดตามก่อน" },{ value:"watch", label:"เฝ้าระวัง" }]} label="กรองระดับความเสี่ยง"><DoctorTabContent value={filter} className="doctor-tab-content"><div>{filtered.map((warning,i) => { const p = db.patients.find(person => person.id === warning.patientId); return <button className={`doctor-warning-item${selected?.id === warning.id ? " selected" : ""}`} key={warning.id} aria-pressed={selected?.id === warning.id} onClick={() => setSelectedId(warning.id)}><div className="doctor-warning-item-header"><PatientAvatar name={p?.name || warning.patientId} index={i} /><div><b>{p?.name || warning.patientId}</b><small>{warning.patientId} · {formatThaiDate(warning.createdAt)}</small></div><RiskPill level={warning.level} /></div><p>{warning.reason}</p></button>; })}{!filtered.length && <EmptyState title="ไม่มีสัญญาณในกลุ่มนี้" detail="เลือกกลุ่มอื่นเพื่อดูรายการติดตาม" />}</div></DoctorTabContent></DoctorTabs></section><ApprovalQueue /></div>
      <aside className="doctor-panel doctor-alert-detail">{selected && patient ? <><SectionHeading title="รายละเอียดการติดตาม" /><div className="doctor-patient-header" style={{ marginBottom:0 }}><PatientAvatar name={patient.name} index={2} /><div><h2 style={{ fontSize:20 }}>{patient.name}</h2><p>{patient.id}</p></div></div><div className="doctor-risk-spot"><div className="doctor-risk-ring" style={{ background:`conic-gradient(${color} ${Math.min(100,Math.max(0,selected.score))}%, #f0f5f8 0)` }}><div style={{ color }}>{selected.score}<small>คะแนนจาก 100</small></div></div><div><RiskPill level={selected.level} /><p>ประเมินจากแนวโน้ม<br />ข้อมูลสุขภาพที่บันทึก</p></div></div><section className="doctor-recommendation"><h3><ClipboardCheck size={17} />แนวทางสำหรับแพทย์</h3><p>{selected.doctorRecommendation}</p></section><section className="doctor-recommendation"><h3><HeartPulse size={17} />สิ่งที่เสนอให้ติดตาม</h3><p>{selected.suggestedAction}</p><Link className="doc-button quiet" href={`/doctor/patients?patient=${patient.id}`}>เปิดข้อมูลผู้ป่วย <ArrowUpRight size={16} /></Link></section><details><summary>ปัจจัยที่ใช้ประเมิน</summary><ul className="list-disc pl-4 text-xs text-slate-500 leading-7">{selected.contributors.map((c,i) => <li key={i}>{c}</li>)}</ul><p className="text-xs text-slate-400 mt-4">คำแนะนำผู้ป่วย · {selected.patientRecommendation}</p></details></> : <EmptyState title="เลือกเคสเพื่อดูรายละเอียด" />}</aside>
    </div>
  </DoctorShell>;
}
