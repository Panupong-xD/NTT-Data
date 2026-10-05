"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { PatientAvatar, SectionHeading } from "@/components/doctor/ui";
import { useMockStore } from "@/lib/hooks/use-mock-store";

const defaultPreferences = { emailAlert:true, smsAlert:false, sys:"135", dia:"85", sugar:"140" };
export default function DoctorSettingsPage() {
  const { db, setDb } = useMockStore();
  const doctor = db.doctors[0];
  const [name, setName] = useState(doctor?.name || "");
  const [specialty, setSpecialty] = useState(doctor?.specialty || "");
  const [hospital, setHospital] = useState(doctor?.hospital || "");
  const [email, setEmail] = useState(doctor?.email || "");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const key = `wellync-doctor-preferences-${doctor?.id || "default"}`;
  useEffect(() => { try { const saved = localStorage.getItem(key); if (saved) setPreferences({ ...defaultPreferences, ...JSON.parse(saved) }); } catch { /* Use defaults when an older saved preference cannot be read. */ } }, [key]);
  const consentCount = db.consents.filter(c => c.doctorId === doctor?.id && c.status === "approved").length;
  function saveProfile(event: React.FormEvent) {
    event.preventDefault(); if (!doctor || !name.trim()) return;
    setDb(current => ({ ...current, doctors:current.doctors.map(d => d.id === doctor.id ? { ...d, name:name.trim(), specialty:specialty.trim(), hospital:hospital.trim(), email:email.trim() } : d) }));
    toast.success("บันทึกข้อมูลแพทย์แล้ว");
  }
  function savePreferences() {
    const limits = [preferences.sys,preferences.dia,preferences.sugar].map(Number);
    if (limits.some(v => !Number.isFinite(v) || v <= 0)) { toast.error("กรุณาระบุค่าตั้งต้นเป็นตัวเลขมากกว่า 0"); return; }
    try { localStorage.setItem(key,JSON.stringify(preferences)); toast.success("บันทึกการตั้งค่าต้นแบบบนอุปกรณ์นี้แล้ว"); }
    catch { toast.error("ยังบันทึกบนอุปกรณ์นี้ไม่ได้"); }
  }
  return <DoctorShell title="ตั้งค่าพื้นที่ของคุณ" description="จัดการข้อมูลแพทย์ และเลือกการแจ้งเตือนที่เหมาะกับคุณ">
    <div className="doctor-settings-layout"><form onSubmit={saveProfile} className="doctor-panel doctor-settings-profile"><div className="doctor-patient-header"><PatientAvatar name={doctor?.name || "แพทย์"} large /><div><h2>ข้อมูลแพทย์</h2><p>ข้อมูลที่ผู้ป่วยและผู้ดูแลใช้ติดต่อคุณ</p></div></div><div className="doctor-form-grid"><label className="doctor-field"><span>ชื่อ–นามสกุล</span><input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" /></label><label className="doctor-field"><span>อีเมลติดต่อ</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label className="doctor-field wide"><span>ความเชี่ยวชาญ</span><input value={specialty} onChange={e => setSpecialty(e.target.value)} /></label><label className="doctor-field wide"><span>โรงพยาบาล / สถาบัน</span><input value={hospital} onChange={e => setHospital(e.target.value)} /></label></div><div className="doctor-form-actions"><button className="doc-button" type="submit" disabled={!doctor || !name.trim()}><Save size={15} />บันทึกข้อมูล</button></div><div className="doctor-settings-note"><h3><ShieldCheck size={17} />สิทธิ์เข้าถึงข้อมูลผู้ป่วย</h3><p>ได้รับอนุญาตให้เข้าถึงข้อมูลแล้ว {consentCount} ราย</p><Link className="doctor-text-link mt-3" href="/doctor/patients">จัดการที่รายชื่อผู้ป่วย <ArrowUpRight size={15} /></Link></div></form>
    <div><section className="doctor-panel"><SectionHeading title="การแจ้งเตือน" detail="ตัวอย่างการตั้งค่าบนอุปกรณ์นี้"><Bell size={18} className="text-sky-400" /></SectionHeading>{[{ key:"emailAlert" as const, label:"อีเมล", detail:"สำหรับสัญญาณที่ควรติดตาม" },{ key:"smsAlert" as const, label:"ข้อความ SMS", detail:"สำหรับเคสที่มีความเสี่ยงสูง" }].map(item => <div className="doctor-toggle-row" key={item.key}><div><b>{item.label}</b><p>{item.detail}</p></div><button type="button" role="switch" aria-label={`แจ้งเตือนทาง${item.label}`} aria-checked={preferences[item.key]} className="doctor-switch" onClick={() => setPreferences(p => ({ ...p, [item.key]:!p[item.key] }))}><span /></button></div>)}<details className="mt-4"><summary><SlidersHorizontal size={16} />ค่าตั้งต้นการติดตาม</summary><p className="text-[11px] text-slate-400 leading-6 mb-4">ใช้เก็บตัวอย่างการตั้งค่า ยังไม่เปลี่ยนเกณฑ์ประเมินความเสี่ยงจริง</p>{[{ key:"sys" as const, label:"ความดันตัวบน (mmHg)" },{ key:"dia" as const, label:"ความดันตัวล่าง (mmHg)" },{ key:"sugar" as const, label:"น้ำตาลในเลือด (mg/dL)" }].map(item => <label className="doctor-field" key={item.key}><span>{item.label}</span><input type="number" min="1" value={preferences[item.key]} onChange={e => setPreferences(p => ({ ...p, [item.key]:e.target.value }))} /></label>)}</details><div className="doctor-form-actions"><button className="doc-button secondary" onClick={savePreferences}><Save size={15} />บันทึกการตั้งค่า</button></div></section><div className="doctor-settings-note"><p>การแจ้งเตือนในหน้านี้เป็นตัวอย่าง ยังไม่ส่งอีเมลหรือ SMS จริง</p></div></div></div>
  </DoctorShell>;
}
