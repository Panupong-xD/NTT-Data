"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Search } from "lucide-react";
import { LiquidIndicator } from "@/components/mobile/liquid-indicator";
import { CarePlan, MockDatabase, RiskLevel } from "@/lib/types";

export function hasPatientAccess(db: MockDatabase, patientId: string) {
  return patientId === "P-0002" || db.consents.some(c => c.patientId === patientId && c.doctorId === db.doctors[0]?.id && c.status === "approved");
}
export function planStatusLabel(status: CarePlan["status"]) { return { draft:"ฉบับร่าง", approved:"พร้อมส่ง", published:"ส่งแล้ว" }[status]; }
export function PatientAvatar({ name, index = 0, large = false }: { name: string; index?: number; large?: boolean }) {
  const text = name.replace(/^(นาย|นางสาว|นาง|นพ\.|พญ\.)\s*/, "").slice(0, 1);
  return <span aria-hidden="true" className={`doctor-patient-avatar avatar-${index % 4}${large ? " avatar-large" : ""}`}>{text}</span>;
}
export function RiskPill({ level, score }: { level: RiskLevel; score?: number }) {
  const labels = { red: "ความเสี่ยงสูง", orange: "ควรติดตาม", yellow: "เฝ้าระวัง", green: "คงที่" };
  return <span className={`doctor-status status-${level}`}><i />{labels[level]}{score !== undefined && <b>{score}/100</b>}</span>;
}
export function SearchField({ value, onChange, placeholder = "ค้นหาชื่อ หรือรหัสผู้ป่วย" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="doctor-search"><Search size={18} /><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />{value && <button aria-label="ล้างคำค้น" onClick={() => onChange("")}>×</button>}</div>;
}
export function SectionHeading({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return <div className="doctor-section-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{children}</div>;
}
export function EmptyState({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return <div className="doctor-empty"><span className="doctor-empty-orbit" aria-hidden="true">✧</span><h3>{title}</h3>{detail && <p>{detail}</p>}{children}</div>;
}
export function DoctorTabs({ value, onChange, tabs, children, label = "มุมมองข้อมูล" }: { value: string; onChange: (value: string) => void; tabs: { value: string; label: string }[]; children?: React.ReactNode; label?: string }) {
  return <Tabs.Root value={value} onValueChange={onChange}><Tabs.List aria-label={label} className="doctor-segments" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0,1fr))` }}><div aria-hidden="true" className="doctor-segment-track"><LiquidIndicator index={Math.max(0, tabs.findIndex(t => t.value === value))} count={tabs.length} /></div>{tabs.map(t => <Tabs.Trigger key={t.value} value={t.value}>{t.label}</Tabs.Trigger>)}</Tabs.List>{children}</Tabs.Root>;
}
export const DoctorTabContent = Tabs.Content;
export function CareIllustration() {
  return <svg className="doctor-care-illustration" viewBox="0 0 300 220" fill="none" aria-hidden="true"><ellipse cx="166" cy="192" rx="98" ry="12" fill="#9dcbe7" fillOpacity=".2"/><path d="M52 112C12 53 78 7 137 33C218-8 291 53 263 106C301 160 221 198 173 165C103 218 24 173 52 112Z" fill="#ffffff" fillOpacity=".5"/><g transform="rotate(-9 133 115)"><rect x="65" y="48" width="122" height="141" rx="17" fill="#fff"/><rect x="100" y="38" width="53" height="22" rx="9" fill="#a8d9f2"/><path d="M85 124H105L117 103L130 142L143 116H166" stroke="#2698cd" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="M88 164H146M88 174H124" stroke="#d4eaf6" strokeWidth="5" strokeLinecap="round"/></g><g transform="rotate(12 218 143)"><rect x="182" y="108" width="76" height="74" rx="19" fill="#bce8dd"/><path d="M219 157L200 140C185 125 207 114 219 129C231 114 251 126 238 140L219 157Z" fill="#f9ffff"/></g><path d="M239 42V60M230 51H248" stroke="#fff" strokeWidth="4" strokeLinecap="round"/><circle cx="44" cy="155" r="6" fill="#aedace"/><circle cx="215" cy="81" r="4" fill="#79bfe3"/></svg>;
}
