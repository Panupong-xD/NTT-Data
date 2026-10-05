"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { CalendarDays, Check, ClipboardList, Dumbbell, Edit3, Loader2, Pill, Plus, Save, Sparkles, Utensils, X, Heart } from "lucide-react";
import { toast } from "sonner";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { EmptyState, PatientAvatar, planStatusLabel, SearchField, SectionHeading } from "@/components/doctor/ui";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { publishCarePlan } from "@/lib/services/mock-store";
import { askAI } from "@/lib/services/ai/client";
import { CarePlan } from "@/lib/types";
import { formatThaiDate } from "@/lib/utils";

const categories = [{ key:"medication", label:"ยา", icon:Pill },{ key:"diet", label:"อาหาร", icon:Utensils },{ key:"exercise", label:"การออกกำลังกาย", icon:Dumbbell },{ key:"measurement", label:"การวัดค่า", icon:ClipboardList },{ key:"followUp", label:"การติดตาม", icon:CalendarDays },{ key:"lifestyle", label:"การใช้ชีวิต", icon:Heart }] as const;
type Fields = { summary: string } & Record<(typeof categories)[number]["key"], string>;
const emptyFields: Fields = { summary:"", medication:"", diet:"", exercise:"", measurement:"", followUp:"", lifestyle:"" };
function fieldsOf(plan?: CarePlan): Fields { return plan ? { summary:plan.summary, ...Object.fromEntries(categories.map(c => [c.key, plan[c.key].join("\n")])) } as Fields : { ...emptyFields }; }
function arraysOf(fields: Fields) { return Object.fromEntries(categories.map(c => [c.key, fields[c.key].split("\n").map(s => s.trim()).filter(Boolean)])) as Pick<CarePlan,"medication"|"diet"|"exercise"|"measurement"|"followUp"|"lifestyle">; }
function PlanFields({ fields, onChange }: { fields: Fields; onChange: (fields: Fields) => void }) { return <div className="doctor-form-grid"><label className="doctor-field wide"><span>สรุปแผนดูแล</span><textarea rows={3} value={fields.summary} onChange={e => onChange({ ...fields, summary:e.target.value })} placeholder="คำแนะนำหลักที่อยากให้ผู้ป่วยนำไปใช้" required /></label>{categories.map(c => <label className="doctor-field" key={c.key}><span>{c.label}</span><textarea rows={2} value={fields[c.key]} onChange={e => onChange({ ...fields, [c.key]:e.target.value })} placeholder="หนึ่งคำแนะนำต่อหนึ่งบรรทัด" /></label>)}</div>; }
export default function DoctorCarePlansPage() {
  const { db, setDb } = useMockStore();
  const [selectedId, setSelectedId] = useState(db.carePlans[0]?.id || "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [rewriting, setRewriting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPatient, setCreatePatient] = useState(db.patients[0]?.id || "");
  const [createFields, setCreateFields] = useState<Fields>(fieldsOf(db.carePlans.find(p => p.patientId === createPatient)));
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("patient"); const plan = db.carePlans.find(p => p.patientId === id); if (plan) setSelectedId(plan.id); }, []);
  const selected = db.carePlans.find(p => p.id === selectedId);
  const patient = db.patients.find(p => p.id === selected?.patientId);
  const plans = db.carePlans.filter(p => (filter === "all" || (filter === "draft" ? p.status !== "published" : p.status === "published")) && `${db.patients.find(patient => patient.id === p.patientId)?.name} ${p.patientId}`.toLowerCase().includes(query.toLowerCase()));
  function saveEdit() {
    if (!selected || !fields.summary.trim()) { toast.error("กรุณาระบุสรุปแผนดูแล"); return; }
    setDb(current => ({ ...current, carePlans:current.carePlans.map(p => p.id === selected.id ? { ...p, ...arraysOf(fields), summary:fields.summary.trim(), status:"draft", updatedAt:new Date().toISOString() } : p) }));
    setEditing(false); toast.success("บันทึกร่างแผนแล้ว");
  }
  function saveCreate() {
    if (!createPatient || !createFields.summary.trim()) { toast.error("กรุณาเลือกผู้ป่วยและเขียนสรุปแผน"); return; }
    const existing = db.carePlans.find(p => p.patientId === createPatient);
    const plan: CarePlan = { ...(existing || { id:`PLAN-${Date.now()}`, tasks:[] }), patientId:createPatient, doctorId:db.doctors[0]?.id || "DOC-001", status:"draft", updatedAt:new Date().toISOString(), summary:createFields.summary.trim(), ...arraysOf(createFields) };
    setDb(current => ({ ...current, carePlans:existing ? current.carePlans.map(p => p.id === existing.id ? plan : p) : [...current.carePlans,plan] }));
    setSelectedId(plan.id); setEditing(false); setFilter("all"); setQuery(""); setCreateOpen(false); toast.success("บันทึกร่างแผนแล้ว");
  }
  async function rewrite() {
    if (!selected || !patient) return;
    setRewriting(true);
    try {
      const answer = await askAI(["ตอบเป็นภาษาไทย สรุปแผนดูแลที่บ้านสำหรับแพทย์ 1 ย่อหน้า ไม่เกิน 3 ประโยค", `ผู้ป่วย: ${patient.name}`, `การวินิจฉัย: ${patient.diagnosis.join(", ")}`, `ยา: ${patient.medications.join(", ")}`, `ร่างเดิม: ${selected.summary}`].join("\n"), undefined, { patientId:patient.id });
      if (!answer.trim()) throw new Error("ยังไม่ได้รับคำแนะนำ กรุณาลองอีกครั้ง");
      setDb(current => ({ ...current, carePlans:current.carePlans.map(p => p.id === selected.id ? { ...p, summary:answer, status:"draft", updatedAt:new Date().toISOString() } : p) }));
      toast.success("ปรับร่างแล้ว กรุณาตรวจสอบก่อนส่งต่อ");
    } catch (error) { toast.error(error instanceof Error ? error.message : "ปรับแผนไม่สำเร็จ"); }
    finally { setRewriting(false); }
  }
  return <DoctorShell title="แผนดูแล" description="เปลี่ยนคำแนะนำให้เป็นแผนที่ผู้ป่วยนำไปใช้ได้ง่าย" action={<button className="doc-button" disabled={rewriting || editing} onClick={() => setCreateOpen(true)}><Plus size={17} />เขียนแผนดูแล</button>}>
    <div className="doctor-master-detail"><aside className="doctor-directory"><SectionHeading title="แผนของผู้ป่วย"><span className="doctor-directory-count">{plans.length} แผน</span></SectionHeading><SearchField value={query} onChange={setQuery} /><div className="doctor-filter-chips">{[{ value:"all", label:"ทั้งหมด" },{ value:"draft", label:"รอส่ง" },{ value:"published", label:"ส่งแล้ว" }].map(f => <button key={f.value} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>{f.label}</button>)}</div><div className="doctor-directory-list">{plans.map((plan,i) => { const person = db.patients.find(p => p.id === plan.patientId); return <button key={plan.id} disabled={editing || rewriting} aria-pressed={selectedId === plan.id} className={`doctor-directory-item${selectedId === plan.id ? " selected" : ""}`} onClick={() => setSelectedId(plan.id)}><PatientAvatar name={person?.name || "ผู้ป่วย"} index={i} /><div><b>{person?.name || plan.patientId}</b><small>{plan.status === "published" ? "ส่งให้ผู้ป่วยแล้ว" : planStatusLabel(plan.status)} · {plan.patientId}</small></div></button>; })}{!plans.length && <EmptyState title="ไม่พบแผนดูแล" detail="ลองเปลี่ยนคำค้นหรือตัวกรอง" />}</div></aside>
      {selected && patient ? <article className="doctor-plan-paper"><div className="doctor-patient-header"><PatientAvatar name={patient.name} large index={1} /><div><h2>{patient.name}</h2><p>{patient.id} · อัปเดต {formatThaiDate(selected.updatedAt)}</p></div><span className={`doctor-status status-${selected.status === "published" ? "green" : "yellow"}`}>{planStatusLabel(selected.status)}</span></div>
        {editing ? <><PlanFields fields={fields} onChange={setFields} /><div className="doctor-form-actions"><button className="doc-button secondary" onClick={() => setEditing(false)}>ยกเลิก</button><button className="doc-button" onClick={saveEdit} disabled={!fields.summary.trim()}><Save size={15} />บันทึกร่าง</button></div></> : <><div className="doctor-plan-summary"><h3>แนวทางการดูแลที่บ้าน</h3><MarkdownRenderer content={selected.summary} /></div><div className="doctor-plan-sections">{categories.map(c => <section className="doctor-plan-section" key={c.key}><h3><c.icon />{c.label}</h3>{selected[c.key].filter(Boolean).length ? <ul>{selected[c.key].filter(Boolean).map((line,i) => <li key={i}>{line}</li>)}</ul> : <p>ยังไม่ได้ระบุคำแนะนำ</p>}</section>)}</div><div className="doctor-form-actions"><p>ตรวจสอบแผนก่อนส่งให้ผู้ป่วยและผู้ดูแล</p><button className="doc-button secondary small" disabled={rewriting} onClick={() => { setFields(fieldsOf(selected)); setEditing(true); }}><Edit3 size={14} />แก้ไข</button><button className="doc-button secondary small" disabled={rewriting} onClick={rewrite}>{rewriting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}ให้ผู้ช่วยปรับแผน</button><button className="doc-button small" disabled={rewriting || selected.status === "published"} onClick={() => { setDb(current => publishCarePlan(current,selected)); }}><Check size={14} />{selected.status === "published" ? "ส่งแผนแล้ว" : "อนุมัติและส่งแผน"}</button></div></>}
      </article> : <section className="doctor-panel"><EmptyState title="ยังไม่มีแผนดูแล" detail="เริ่มเขียนคำแนะนำสำหรับผู้ป่วยของคุณ" /></section>}</div>
      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}><Dialog.Portal><Dialog.Overlay className="doctor-modal-overlay" /><Dialog.Content className="doctor-modal"><Dialog.Title>เขียนแผนดูแล</Dialog.Title><Dialog.Description className="doctor-modal-description">บันทึกเป็นฉบับร่างก่อนส่งต่อให้ผู้ป่วย</Dialog.Description><Dialog.Close className="doctor-modal-close" aria-label="ปิดแบบฟอร์ม"><X size={20} /></Dialog.Close><label className="doctor-field"><span>ผู้ป่วย</span><select value={createPatient} onChange={e => { setCreatePatient(e.target.value); setCreateFields(fieldsOf(db.carePlans.find(p => p.patientId === e.target.value))); }}>{db.patients.map(p => <option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select></label>{db.carePlans.some(p => p.patientId === createPatient) && <p className="text-xs text-sky-600 mb-5">มีแผนเดิม · บันทึกเพื่อปรับเป็นฉบับร่าง กิจกรรมและนัดหมายยังอยู่ครบ</p>}<PlanFields fields={createFields} onChange={setCreateFields} /><div className="doctor-form-actions"><Dialog.Close className="doc-button secondary">ยกเลิก</Dialog.Close><button className="doc-button" onClick={saveCreate} disabled={!createFields.summary.trim()}><Save size={15} />บันทึกร่าง</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </DoctorShell>;
}
