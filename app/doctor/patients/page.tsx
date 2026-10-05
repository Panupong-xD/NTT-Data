"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpRight, Check, FileText, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { DoctorTabs, DoctorTabContent, EmptyState, hasPatientAccess, PatientAvatar, SearchField, SectionHeading } from "@/components/doctor/ui";
import { DoctorHealthChart } from "@/components/doctor/health-chart";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { createDoctorRequest, publishCarePlan } from "@/lib/services/mock-store";
import { askAI } from "@/lib/services/ai/client";
import { formatThaiDate } from "@/lib/utils";

const tabs = [{ value:"summary", label:"ข้อมูลสำคัญ" },{ value:"monitoring", label:"แนวโน้ม" },{ value:"timeline", label:"บันทึกสุขภาพ" },{ value:"careplan", label:"แผนดูแล" }];
export default function DoctorPatientsPage() {
  const { db, setDb } = useMockStore();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(db.patients[0]?.id || "");
  const [tab, setTab] = useState("summary");
  const [draft, setDraft] = useState(db.carePlans.find(p => p.patientId === selectedId)?.summary || "");
  const [rewriting, setRewriting] = useState(false);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("patient"); if (id && db.patients.some(p => p.id === id)) { setSelectedId(id); setDraft(db.carePlans.find(p => p.patientId === id)?.summary || ""); } }, []); // Read the initial deep link without coupling selection to navigation.
  const selected = db.patients.find(p => p.id === selectedId);
  const patients = db.patients.filter(p => `${p.id} ${p.citizenId} ${p.name}`.toLowerCase().includes(query.toLowerCase()));
  const records = db.healthRecords.filter(r => r.patientId === selectedId).sort((a,b) => a.date.localeCompare(b.date));
  const latest = records.at(-1);
  const plan = db.carePlans.find(p => p.patientId === selectedId);
  const approved = hasPatientAccess(db, selectedId);
  const consent = db.consents.find(c => c.patientId === selectedId && c.doctorId === db.doctors[0]?.id);
  function choose(id: string) { setSelectedId(id); setDraft(db.carePlans.find(p => p.patientId === id)?.summary || ""); setTab("summary"); }
  async function rewrite() {
    if (!selected || !approved || !plan) return;
    setRewriting(true);
    try {
      const answer = await askAI(["ตอบเป็นภาษาไทยในรูปแบบแผนดูแลที่บ้านสำหรับแพทย์ แบ่งหัวข้อยา อาหาร การออกกำลัง การวัดค่า การติดตาม และการใช้ชีวิต", `ผู้ป่วย: ${selected.name}`, `Diagnosis: ${selected.diagnosis.join(", ")}`, `Medication: ${selected.medications.join(", ")}`, `ข้อมูลล่าสุด: ${latest ? `BP ${latest.systolic}/${latest.diastolic}, Blood Sugar ${latest.bloodSugar}, Sleep ${latest.sleepHours}, Exercise ${latest.exerciseMinutes} นาที` : "ยังไม่มีบันทึก"}`, `ร่างเดิม: ${draft}`].join("\n"), undefined, { patientId: selected.id });
      if (!answer.trim()) throw new Error("ยังไม่ได้รับคำแนะนำ กรุณาลองอีกครั้ง");
      setDraft(answer);
    } catch (error) { toast.error(error instanceof Error ? error.message : "ยังปรับแผนไม่ได้ กรุณาลองอีกครั้ง"); }
    finally { setRewriting(false); }
  }
  return <DoctorShell title="ผู้ป่วยของคุณ" description="เลือกผู้ป่วย เพื่อดูข้อมูลและติดตามการดูแลได้ในที่เดียว">
    <div className="doctor-master-detail"><aside className="doctor-directory"><SectionHeading title="รายชื่อผู้ป่วย"><span className="doctor-directory-count">{patients.length} ราย</span></SectionHeading><SearchField value={query} onChange={setQuery} placeholder="ค้นหาชื่อ รหัส หรือเลขบัตร" /><div className="doctor-directory-list">{patients.map((p,i) => <button key={p.id} className={`doctor-directory-item${p.id === selectedId ? " selected" : ""}`} aria-pressed={p.id === selectedId} onClick={() => choose(p.id)} disabled={rewriting}><PatientAvatar name={p.name} index={i} /><div><b>{p.name}</b><small>{p.id} · {p.age} ปี</small></div><span className={`access-dot${hasPatientAccess(db,p.id) ? "" : " locked"}`} title={hasPatientAccess(db,p.id) ? "เข้าถึงข้อมูลได้" : "ยังไม่ได้รับอนุญาต"} /></button>)}{!patients.length && <EmptyState title="ไม่พบผู้ป่วย" detail="ลองค้นหาด้วยชื่อหรือรหัสอื่น" />}</div></aside>
    {selected ? <section className="doctor-panel doctor-patient-detail"><div className="doctor-patient-header"><PatientAvatar name={selected.name} large /><div><h2>{selected.name}</h2><p>{selected.id} · {selected.age} ปี · {selected.gender}</p></div><span className={`doctor-status status-${approved ? "green" : "yellow"}`}>{approved ? <ShieldCheck size={12} /> : <LockKeyhole size={12} />}{approved ? "เข้าถึงข้อมูลได้" : consent?.status === "waiting" ? "รออนุญาต" : "ยังไม่ได้รับอนุญาต"}</span></div>
      {!approved ? <EmptyState title={consent?.status === "waiting" ? "รอผู้ป่วยอนุญาตให้เข้าถึงข้อมูล" : "ขอสิทธิ์เข้าถึงข้อมูลสุขภาพ"} detail="ผู้ป่วยเป็นผู้อนุญาตให้แพทย์ดูข้อมูล เพื่อวางแผนดูแลร่วมกัน">{consent?.status !== "waiting" && <button className="doc-button" onClick={() => { if (!db.doctors[0]) return; setDb(current => createDoctorRequest(current,selected.id,db.doctors[0].id)); toast.success("ส่งคำขอให้ผู้ป่วยแล้ว"); }}><LockKeyhole size={15} />ส่งคำขอเข้าถึง</button>}</EmptyState> : <DoctorTabs value={tab} onChange={setTab} tabs={tabs} label="ข้อมูลผู้ป่วย">
      <DoctorTabContent value="summary" className="doctor-tab-content"><div className="doctor-last-record"><span>ค่าล่าสุด {latest ? `· ${formatThaiDate(latest.date)}` : "· ยังไม่มีบันทึก"}</span><span>{records.length} บันทึก</span></div><div className="doctor-metric-strip"><div><span>ความดันโลหิต</span><b>{latest ? `${latest.systolic}/${latest.diastolic}` : "—"}<small>mmHg</small></b></div><div><span>น้ำตาลในเลือด</span><b>{latest?.bloodSugar ?? "—"}<small>mg/dL</small></b></div><div><span>ชีพจร</span><b>{latest?.heartRate ?? "—"}<small>ครั้ง/นาที</small></b></div></div><dl><div className="doctor-info-row"><dt>โรคประจำตัว</dt><dd>{selected.diagnosis.join(" · ") || "ไม่มีข้อมูล"}</dd></div><div className="doctor-info-row"><dt>ประวัติการแพ้</dt><dd className={selected.allergies.length ? "doctor-allergy" : ""}>{selected.allergies.length > 0 && <AlertCircle size={16} className="mt-1 shrink-0" />}{selected.allergies.join(" · ") || "ไม่มีประวัติแพ้ยา"}</dd></div><div className="doctor-info-row"><dt>ยาที่ใช้ประจำ</dt><dd>{selected.medications.join(" · ") || "ไม่มีข้อมูล"}</dd></div><div className="doctor-info-row"><dt>สถานพยาบาล</dt><dd>{selected.hospital}</dd></div><div className="doctor-info-row"><dt>ผู้ดูแล</dt><dd>{db.caregivers.find(c => c.id === selected.caregiverId)?.name || "ยังไม่มีข้อมูล"}<span className="block text-xs text-slate-400 mt-1">{records.filter(r => r.confirmationStatus === "pending").length} บันทึกรอผู้ดูแลยืนยัน</span></dd></div></dl><details className="mt-3"><summary>ข้อมูลส่วนบุคคลเพิ่มเติม</summary><dl><div className="doctor-info-row"><dt>เลขบัตรประชาชน</dt><dd>{selected.citizenId}</dd></div><div className="doctor-info-row"><dt>ติดต่อ</dt><dd>{selected.phone || selected.email || "ไม่มีข้อมูล"}</dd></div><div className="doctor-info-row"><dt>น้ำหนัก / ส่วนสูง</dt><dd>{latest?.weight ?? selected.weight ?? "—"} กก. / {latest?.height ?? selected.height ?? "—"} ซม.</dd></div></dl></details></DoctorTabContent>
      <DoctorTabContent value="monitoring" className="doctor-tab-content"><DoctorHealthChart records={records} /></DoctorTabContent>
      <DoctorTabContent value="timeline" className="doctor-tab-content"><SectionHeading title="บันทึกจากที่บ้าน" detail="รายการล่าสุด พร้อมสถานะการยืนยัน" /><div className="doctor-table-wrap"><table className="doctor-table"><thead><tr><th>วันที่</th><th>ความดัน</th><th>น้ำตาล</th><th>นอนหลับ</th><th>สถานะ</th></tr></thead><tbody>{records.slice(-14).reverse().map(r => <tr key={r.id}><td>{formatThaiDate(r.date)}</td><td>{r.systolic}/{r.diastolic}</td><td>{r.bloodSugar} mg/dL</td><td>{r.sleepHours} ชม.</td><td><span className={`doctor-status status-${r.confirmationStatus === "confirmed" ? "green" : r.confirmationStatus === "rejected" ? "red" : "yellow"}`}>{r.confirmationStatus === "confirmed" ? "ยืนยันแล้ว" : r.confirmationStatus === "rejected" ? "ปฏิเสธ" : "รอยืนยัน"}</span></td></tr>)}</tbody></table></div>{!records.length && <EmptyState title="ยังไม่มีบันทึกสุขภาพ" />}</DoctorTabContent>
      <DoctorTabContent value="careplan" className="doctor-tab-content">{plan ? <><SectionHeading title="สรุปแผนดูแล" detail="ปรับข้อความ แล้วตรวจสอบก่อนส่งต่อ"><Link className="doctor-text-link" href={`/doctor/care-plans?patient=${selected.id}`}>แผนฉบับเต็ม <ArrowUpRight size={15} /></Link></SectionHeading><label className="doctor-field"><span>คำแนะนำสำหรับผู้ป่วย</span><textarea rows={8} value={draft} onChange={e => setDraft(e.target.value)} disabled={rewriting} /></label><div className="doctor-form-actions"><button className="doc-button secondary" disabled={rewriting} onClick={rewrite}>{rewriting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}ให้ผู้ช่วยปรับแผน</button><button className="doc-button" disabled={rewriting || !draft.trim()} onClick={() => { setDb(current => publishCarePlan(current,{ ...plan, summary:draft })); }}><Check size={15} />อนุมัติและส่งแผน</button></div></> : <EmptyState title="ยังไม่มีแผนดูแล"><Link className="doc-button" href="/doctor/care-plans"><FileText size={15} />เขียนแผนดูแล</Link></EmptyState>}</DoctorTabContent>
      </DoctorTabs>}
    </section> : <section className="doctor-panel"><EmptyState title="ยังไม่มีผู้ป่วย" /></section>}</div>
  </DoctorShell>;
}
