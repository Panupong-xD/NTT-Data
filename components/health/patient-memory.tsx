"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAwsMode } from "@/lib/runtime";
import type { FoodAnalysis } from "@/lib/food-analysis";
import type { UserRole } from "@/lib/types";
import { createFollowUp, getPatientContext, getMeals, getFollowUps, removeMeal, saveMeal, savePatientPreferences, updateFollowUp, nutritionFromAnalysis, type SavedMeal, type PatientContext, type FollowUp, type AssistantDraft } from "@/lib/services/patient-memory";

const roleLabels = { patient: "ผู้ป่วย", caregiver: "ผู้ดูแล", doctor: "แพทย์" };
const caseLabels = { caregiver: "รอผู้ดูแลติดตาม", doctor: "รอแพทย์พิจารณา", following: "ติดตามผล", resolved: "ปิดเรื่องแล้ว" };
const dateLabel = (value: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
const fail = (e: unknown) => e instanceof Error ? e.message : "ยังบันทึกไม่ได้ กรุณาลองอีกครั้ง";
const currentMealType = () => {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Bangkok" }).format(new Date()));
  return hour >= 5 && hour < 10 ? "breakfast" : hour >= 10 && hour < 15 ? "lunch" : hour >= 15 && hour < 21 ? "dinner" : "snack";
};

export function ManualMealButton({ name, patientId }: { name: string; patientId: string }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const request = useRef<Omit<SavedMeal, "day" | "version"> | null>(null);
  useEffect(() => { request.current = null; setSaved(false); }, [name, patientId]);
  if (!isAwsMode || !name.trim()) return null;
  async function confirm() {
    setBusy(true);
    try {
      request.current ||= { id: crypto.randomUUID(), patientId, eatenAt: new Date().toISOString(), mealType: currentMealType(), name: name.trim(), portion: "ไม่ระบุปริมาณ", source: "self-report", nutrition: { calories: null, protein: null, carbs: null, fat: null, sugar: null, sodium: null } };
      const payload = request.current;
      await saveMeal(payload); if (request.current === payload) setSaved(true); toast.success("บันทึกชื่อมื้ออาหารแล้ว โดยไม่ได้เรียก AI");
    } catch (e) { toast.error(fail(e)); } finally { setBusy(false); }
  }
  return <div className="mt-3"><Button type="button" variant="ghost" className="w-full" disabled={busy || saved} onClick={confirm}>{saved ? "บันทึกชื่อมื้อนี้แล้ว" : busy ? "กำลังบันทึก…" : "บันทึกชื่อเมนูอย่างเดียว"}</Button><p className="text-center text-xs text-slate-500">บันทึกมื้อที่กินแล้ว โดยไม่มีค่าประมาณสารอาหาร</p></div>;
}

export function MealConfirmation({ analysis, patientId, fromImage }: { analysis: FoodAnalysis; patientId: string; fromImage: boolean }) {
  const [name, setName] = useState(analysis.name);
  const [portion, setPortion] = useState("1");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const requestId = useRef<string>("");
  const eatenAt = useRef("");
  useEffect(() => { setName(analysis.name); setPortion("1"); setSaved(false); requestId.current = crypto.randomUUID(); eatenAt.current = ""; }, [analysis]);
  if (!isAwsMode) return null;
  async function confirm() {
    if (busy || saved || !name.trim()) return;
    setBusy(true);
    try {
      const stamp = eatenAt.current || (eatenAt.current = new Date().toISOString());
      const factor = portion === "unknown" || name.trim() !== analysis.name.trim() ? null : Number(portion);
      await saveMeal({ id: requestId.current || (requestId.current = crypto.randomUUID()), patientId, eatenAt: stamp, name: name.trim(),
        portion: portion === "0.5" ? "ครึ่งหนึ่งของมื้อที่วิเคราะห์" : portion === "2" ? "สองเท่าของมื้อที่วิเคราะห์" : portion === "unknown" ? "ไม่แน่ใจปริมาณ" : "ตามมื้อที่วิเคราะห์",
        mealType: currentMealType(),
        nutrition: nutritionFromAnalysis(analysis, factor), source: fromImage ? "image-estimate" : "self-report" });
      setSaved(true); toast.success("บันทึกแล้ว ผู้ช่วยจะใช้มื้อนี้ประกอบคำตอบครั้งถัดไป");
    } catch (e) { toast.error(fail(e)); } finally { setBusy(false); }
  }
  return <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
    <p className="text-sm font-semibold">มื้อนี้คุณกินจริงใช่ไหม?</p>
    <label className="block text-xs text-slate-600">ชื่ออาหาร<Input maxLength={120} value={name} disabled={busy || saved} onChange={e => setName(e.target.value)} /></label>
    <label className="block text-xs text-slate-600">ปริมาณที่กิน<select value={portion} disabled={busy || saved} onChange={e => setPortion(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3"><option value="1">ตามมื้อที่วิเคราะห์</option><option value="0.5">ครึ่งหนึ่ง</option><option value="2">สองเท่า</option><option value="unknown">ไม่แน่ใจปริมาณ</option></select></label>
    {name.trim() !== analysis.name.trim() && <p className="text-xs text-amber-800">แก้ชื่ออาหารแล้ว จะไม่ใช้ตัวเลขสารอาหารเดิม</p>}
    <p className="text-xs leading-5 text-slate-500">ตัวเลขเป็นค่าประมาณ ไม่ใช่ผลตรวจสารอาหาร ระบบเก็บข้อมูลมื้ออาหารโดยไม่เก็บรูปต้นฉบับ</p>
    <Button className="w-full" disabled={busy || saved || !name.trim()} onClick={confirm}>{saved ? "บันทึกมื้อนี้แล้ว" : busy ? "กำลังบันทึก…" : "บันทึกมื้อนี้"}</Button>
  </div>;
}

function MealRow({ meal, role }: { meal: SavedMeal; role: UserRole }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(meal.name);
  const [portion, setPortion] = useState(meal.portion);
  const [busy, setBusy] = useState(false);
  const editBase = useRef(meal);
  async function save() {
    setBusy(true);
    try {
      const base = editBase.current;
      const changed = name.trim() !== base.name || portion.trim() !== base.portion;
      await saveMeal({ id: base.id, patientId: base.patientId, eatenAt: base.eatenAt, mealType: base.mealType,
        name: name.trim(), portion: portion.trim(), source: base.source,
        nutrition: changed ? { calories: null, protein: null, carbs: null, fat: null, sugar: null, sodium: null } : base.nutrition }, base.version);
      setEditing(false); toast.success("แก้มื้ออาหารและปรับสรุปแล้ว");
    } catch (e) { toast.error(fail(e)); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await removeMeal(meal); toast.success("ลบมื้อและปรับสรุปที่ผู้ช่วยใช้แล้ว"); }
    catch (e) { toast.error(fail(e)); } finally { setBusy(false); }
  }
  return <div className="border-t py-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium">{meal.name}</p><p className="text-xs text-slate-500">{dateLabel(meal.eatenAt)} · {meal.portion}</p><p className="text-xs text-slate-500">{meal.nutrition.calories === null ? "ไม่มีค่าพลังงานที่ระบุได้" : `พลังงานประมาณ ${meal.nutrition.calories} kcal`}</p></div>{role === "patient" && <div className="flex"><Button size="sm" variant="ghost" disabled={busy} onClick={() => { editBase.current = meal; setName(meal.name); setPortion(meal.portion); setEditing(!editing); }}>แก้ไข</Button><Button size="sm" variant="ghost" disabled={busy} onClick={remove}>ลบ</Button></div>}</div>{editing && <div className="mt-3 space-y-2"><label className="block text-xs">ชื่ออาหาร<Input maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label className="block text-xs">ปริมาณ<Input maxLength={100} value={portion} onChange={e => setPortion(e.target.value)} /></label><p className="text-xs text-slate-500">เมื่อแก้ชื่อหรือปริมาณ จะไม่ใช้ตัวเลขประมาณเดิม ผู้ช่วยยังเห็นชื่อและปริมาณที่แก้แล้ว</p><Button disabled={busy || !name.trim() || !portion.trim()} onClick={save}>บันทึกการแก้ไข</Button></div>}</div>;
}

export function AssistantDraftCard({ draft, patientId }: { draft: AssistantDraft; patientId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const requestId = useRef("");
  if (draft.type === "care-plan") return <div className="mt-3 rounded-xl border bg-white p-3"><p className="text-xs">ร่างนี้ยังไม่เปลี่ยนแผนของผู้ป่วย</p><p className="mt-2 whitespace-pre-wrap text-sm">{draft.summary}</p><Link className="mt-2 block text-sm underline" href={`/doctor/care-plans/?patient=${encodeURIComponent(patientId)}`}>เปิดแผนเพื่อตรวจและเผยแพร่</Link></div>;
  async function confirm() {
    setBusy(true);
    try {
      if (draft.type === "preference") await savePatientPreferences(patientId, draft.notes, draft.expectedVersion);
      else if (draft.type === "follow-up") await createFollowUp(patientId, draft.title, draft.note, requestId.current || (requestId.current = crypto.randomUUID()));
      setDone(true); toast.success(draft.type === "preference" ? "บันทึกความชอบแล้ว" : "ส่งเรื่องให้ผู้ดูแลติดตามแล้ว");
    } catch (e) { toast.error(fail(e)); } finally { setBusy(false); }
  }
  return <div className="mt-3 rounded-xl border bg-white p-3"><p className="font-semibold">{draft.type === "preference" ? "ข้อมูลที่จะจำเกี่ยวกับคุณ" : draft.title}</p><p className="my-2 whitespace-pre-wrap text-sm">{draft.type === "preference" ? draft.notes : draft.note}</p><p className="mb-2 text-xs text-slate-500">{draft.type === "preference" ? "ใช้ประกอบคำตอบ ไม่เปลี่ยนประวัติการแพ้ ยา หรือคำสั่งแพทย์" : "เมื่อยืนยัน เรื่องนี้จะอยู่ในแฟ้มร่วมที่ทีมดูแลได้รับอนุญาตให้เข้าถึง"}</p><Button disabled={busy || done} onClick={confirm}>{done ? "ยืนยันแล้ว" : busy ? "กำลังบันทึก…" : draft.type === "preference" ? "ยืนยันให้จำข้อมูลนี้" : "ยืนยันส่งให้ผู้ดูแล"}</Button></div>;
}

function CaseCard({ item, role }: { item: FollowUp; role: UserRole }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const canUpdate = item.status !== "resolved" && (role === "doctor" ? item.status === "doctor" : role === "caregiver" ? ["caregiver", "following"].includes(item.status) : true);
  async function update(status: FollowUp["status"]) {
    if (!note.trim()) { toast.error("เพิ่มผลติดตามหรือเหตุผลก่อนบันทึก"); return; }
    setBusy(true);
    try { await updateFollowUp(item, status, note.trim()); setNote(""); toast.success("บันทึกผลติดตามแล้ว"); }
    catch (e) { toast.error(fail(e)); } finally { setBusy(false); }
  }
  return <article className="rounded-2xl border border-slate-200 bg-white p-3"><div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-semibold">{item.title}</h4><span className="text-xs text-sky-700">{caseLabels[item.status]}</span></div><details className="mt-2 text-xs"><summary>ดูการติดตาม ({item.notes.length})</summary>{item.notes.map((n, i) => <div className="mt-2 border-l-2 pl-2" key={i}><p className="whitespace-pre-wrap">{n.text}</p><p className="text-slate-500">{roleLabels[n.role]} · {dateLabel(n.date)}</p></div>)}</details>{canUpdate && <div className="mt-3"><label className="block text-xs">ผลติดตามหรือข้อมูลเพิ่มเติม<textarea disabled={busy} value={note} maxLength={700} onChange={e => setNote(e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border p-2" /></label><p className="my-2 text-[11px] text-slate-500">ข้อมูลในเรื่องนี้ใช้ร่วมกับทีมดูแลตามสิทธิ์</p><div className="flex flex-wrap gap-2">
    {(role === "patient" || role === "caregiver" && item.status !== "doctor") && <Button size="sm" disabled={busy || !note.trim()} onClick={() => update(item.status)}>เพิ่มข้อมูล</Button>}
    {role === "caregiver" && ["caregiver", "following"].includes(item.status) && <Button size="sm" disabled={busy || !note.trim()} onClick={() => update("doctor")}>ส่งให้แพทย์พิจารณา</Button>}
    {role === "doctor" && <><Button size="sm" disabled={busy || !note.trim()} onClick={() => update("caregiver")}>ขอข้อมูลเพิ่ม</Button><Button size="sm" disabled={busy || !note.trim()} onClick={() => update("following")}>บันทึกผลพิจารณาและติดตามต่อ</Button></>}
    {((role === "patient" && item.status === "following") || (role === "caregiver" && ["caregiver", "following"].includes(item.status))) && <Button variant="ghost" size="sm" disabled={busy || !note.trim()} onClick={() => update("resolved")}>บันทึกผลและปิดเรื่อง</Button>}
  </div>{role === "doctor" && <p className="mt-2 text-xs text-slate-500">หากเปลี่ยนแผน ให้ตรวจและเผยแพร่ในหน้าแผนดูแลด้วย</p>}</div>}</article>;
}

export function PatientMemoryPanel({ patientId, role, preferences = false, meals = true }: { patientId: string; role: UserRole; preferences?: boolean; meals?: boolean }) {
  const [context, setContext] = useState<PatientContext | null>(null);
  const [items, setItems] = useState<SavedMeal[]>([]);
  const [cases, setCases] = useState<FollowUp[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [visibleMeals, setVisibleMeals] = useState(3);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const preferenceVersion = useRef(0);
  const [request, setRequest] = useState("");
  const requestId = useRef("");
  const generation = useRef(0);
  const invalidateRequests = useCallback(() => { generation.current++; }, []);
  const load = useCallback(async () => {
    if (!isAwsMode || !patientId) return;
    const current = ++generation.current;
    setLoading(true); setError("");
    try {
      const [c, m, f] = await Promise.all([getPatientContext(patientId), meals ? getMeals(patientId) : Promise.resolve({ meals: [], nextCursor: null }), getFollowUps(patientId)]);
      if (current !== generation.current) return;
      setContext(c); setItems(m.meals); setCursor(m.nextCursor); setCases(f.cases);
    } catch (e) { if (current === generation.current) { setError(fail(e)); setContext(null); setItems([]); setCases([]); } }
    finally { if (current === generation.current) setLoading(false); }
  }, [patientId, meals]);
  useEffect(() => {
    setContext(null); setItems([]); setCases([]); setVisibleMeals(3); setEditing(false); setRequest(""); requestId.current = "";
    void load();
    const refresh = () => { void load(); };
    window.addEventListener("wellync-memory-updated", refresh); window.addEventListener("focus", refresh);
    return () => { invalidateRequests(); window.removeEventListener("wellync-memory-updated", refresh); window.removeEventListener("focus", refresh); };
  }, [load, invalidateRequests]);
  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try { await action(); toast.success(success); }
    catch (e) { toast.error(fail(e)); } finally { setBusy(false); }
  }
  if (!isAwsMode || !patientId) return null;
  return <section className="my-5 space-y-4 rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-2"><h3 className="text-base font-semibold">ภาพรวมการดูแล</h3><button type="button" disabled={loading} className="min-h-11 text-xs text-sky-700 underline" onClick={() => void load()}>โหลดล่าสุด</button></div>
    {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}{loading && !context && <p role="status" className="text-sm text-slate-500">กำลังโหลดบันทึก…</p>}
    {context && <><p className="text-sm">7 วันล่าสุดบันทึกอาหาร <b>{context.food.week.recordedMeals} มื้อ</b> ใน {context.food.week.recordedDays} วัน · 30 วันมี {context.food.month.recordedMeals} มื้อ</p>{context.food.week.topFoods.length > 0 && <p className="text-xs text-slate-600">ชื่อเมนูที่บันทึกบ่อย: {context.food.week.topFoods.map(f => `${f.name} ${f.count} มื้อ`).join(" · ")}</p>}<p className="text-xs leading-5 text-slate-500">สรุปเฉพาะมื้อที่ยืนยันแล้ว ไม่ใช่อาหารทั้งหมดที่กิน ผู้ช่วยอ่านข้อมูลที่เกี่ยวข้องเมื่อคุณถาม · {context.plan ? `ใช้แผนวันที่ ${dateLabel(context.plan.updatedAt)}` : "ยังไม่มีแผนที่อนุมัติ"}</p>
    {preferences && role === "patient" && <details><summary className="min-h-11 text-sm">สิ่งที่ระบบจำเกี่ยวกับฉัน</summary><p className="my-2 whitespace-pre-wrap text-sm">{context.preferences.notes || "ยังไม่ได้บอกความชอบหรือข้อจำกัดในชีวิตประจำวัน"}</p>{editing ? <div><label className="text-xs">เช่น อาหารที่ชอบ เวลาที่สะดวก หรือข้อจำกัดในการเตรียมอาหาร<textarea maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} className="my-2 min-h-24 w-full rounded-xl border p-2" /></label><p className="mb-2 text-xs text-slate-500">ส่วนนี้ไม่เปลี่ยนประวัติการแพ้ ยา หรือคำสั่งแพทย์ ลบข้อความทั้งหมดแล้วบันทึกเพื่อลืมข้อมูลส่วนนี้ได้</p><Button disabled={busy} onClick={() => void perform(async () => { await savePatientPreferences(patientId, notes, preferenceVersion.current); setEditing(false); }, "ปรับข้อมูลที่จำแล้ว")}>บันทึก</Button></div> : <Button variant="ghost" onClick={() => { preferenceVersion.current = context.preferences.version; setNotes(context.preferences.notes); setEditing(true); }}>แก้ข้อมูลที่จำ</Button>}</details>}
    {meals && <section><h4 className="mb-2 text-sm font-semibold">มื้ออาหารที่บันทึก</h4><p className="mb-2 text-xs text-slate-500">เก็บรายละเอียด 90 วัน สรุปรายวัน 12 เดือน ไม่เก็บรูปต้นฉบับ</p>{!items.length && <p className="text-sm text-slate-500">ยังไม่มีมื้อที่ยืนยันในช่วงนี้</p>}{[...items].sort((a, b) => b.eatenAt.localeCompare(a.eatenAt)).slice(0, visibleMeals).map(meal => <MealRow key={meal.id + meal.day} meal={meal} role={role} />)}{visibleMeals < items.length && <Button variant="ghost" onClick={() => setVisibleMeals(n => n + 3)}>ดูมื้อก่อนหน้า</Button>}{cursor && visibleMeals >= items.length && <Button variant="ghost" disabled={busy} onClick={() => void perform(async () => { const generationAtStart = generation.current; const next = await getMeals(patientId, cursor); if (generationAtStart !== generation.current) return; setItems(current => [...current, ...next.meals]); setCursor(next.nextCursor); setVisibleMeals(n => n + 3); }, "โหลดรายการเพิ่มแล้ว")}>ดูมื้อก่อนหน้า</Button>}</section>}
    <div className="space-y-3"><h4 className="text-sm font-semibold">เรื่องที่ช่วยกันติดตาม</h4>{!cases.length && <p className="text-sm text-slate-500">ยังไม่มีเรื่องติดตาม</p>}{cases.filter(item => item.status !== "resolved").map(item => <CaseCard key={item.id} item={item} role={role} />)}{cases.some(item => item.status === "resolved") && <details><summary className="min-h-11 text-xs">เรื่องที่ปิดแล้ว (แสดงล่าสุดที่โหลดได้ สูงสุด 5 เรื่อง)</summary>{cases.filter(item => item.status === "resolved").slice(0, 5).map(item => <CaseCard key={item.id} item={item} role={role} />)}</details>}</div>
    {role !== "doctor" && <details><summary className="min-h-11 text-sm text-sky-700">ขอให้ทีมช่วยดู</summary><label className="text-xs">มีอะไรที่ทำตามแผนไม่ได้ หรืออยากให้ช่วยติดตาม?<textarea maxLength={700} value={request} onChange={e => setRequest(e.target.value)} className="my-2 min-h-20 w-full rounded-xl border p-2" /></label><p className="mb-2 text-xs text-slate-500">ข้อมูลนี้จะอยู่ในแฟ้มร่วมสำหรับทีมดูแลตามสิทธิ์</p><Button disabled={busy || !request.trim()} onClick={() => void perform(async () => { await createFollowUp(patientId, "ช่วยติดตามการดูแล", request.trim(), requestId.current || (requestId.current = crypto.randomUUID())); setRequest(""); requestId.current = ""; }, "ส่งเรื่องให้ผู้ดูแลติดตามแล้ว")}>ยืนยันส่งเรื่อง</Button></details>}</>}
  </section>;
}

export function FollowUpInbox({ patientId, role }: { patientId: string; role: "patient" | "caregiver" }) {
  const [cases, setCases] = useState<FollowUp[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isAwsMode) return;
    let active = true;
    const load = async () => { try { const result = await getFollowUps(patientId, true); if (active) { setCases(result.cases); setError(""); } } catch { if (active) setError("ยังโหลดเรื่องติดตามไม่ได้ เปิดดูอีกครั้งในหน้าผู้ช่วยหรือโปรไฟล์"); } };
    void load(); window.addEventListener("focus", load); window.addEventListener("wellync-memory-updated", load);
    return () => { active = false; window.removeEventListener("focus", load); window.removeEventListener("wellync-memory-updated", load); };
  }, [patientId]);
  if (!isAwsMode || !cases.length && !error) return null;
  return <section className="my-4 rounded-2xl bg-sky-50 p-4"><h3 className="text-sm font-semibold">เรื่องที่ทีมกำลังติดตาม ({cases.length})</h3>{error ? <p className="mt-2 text-xs">{error}</p> : cases.slice(0, 3).map(item => <p className="mt-2 text-sm" key={item.id}>{item.title}<span className="ml-2 text-xs text-slate-500">{caseLabels[item.status]}</span></p>)}<Link className="mt-3 block min-h-11 py-2 text-sm text-sky-700 underline" href={role === "patient" ? "/patient/profile/" : "/caregiver/ai/"}>ดูและบันทึกผลติดตาม</Link></section>;
}

export function DoctorFollowUpInbox({ patients }: { patients: { id: string; name: string }[] }) {
  const [page, setPage] = useState(0);
  const [cases, setCases] = useState<FollowUp[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const signature = patients.map(p => p.id).join(",");
  useEffect(() => {
    if (!isAwsMode) return;
    let active = true;
    const ids = signature.split(",").filter(Boolean);
    const load = async () => {
      setLoading(true);
      const results = await Promise.allSettled(ids.slice(page * 6, page * 6 + 6).map(id => getFollowUps(id, true)));
      if (!active) return;
      setFailed(results.some(r => r.status === "rejected"));
      setCases(results.flatMap(r => r.status === "fulfilled" ? r.value.cases.filter(c => c.status === "doctor") : []));
      setLoading(false);
    };
    void load(); window.addEventListener("focus", load); window.addEventListener("wellync-memory-updated", load);
    return () => { active = false; window.removeEventListener("focus", load); window.removeEventListener("wellync-memory-updated", load); };
  }, [signature, page]);
  if (!isAwsMode) return null;
  return <section className="doctor-panel"><h3 className="text-base font-semibold">เรื่องที่ผู้ดูแลส่งมา</h3>{loading ? <p className="mt-3 text-sm">กำลังโหลดเรื่องติดตาม…</p> : <>{failed && <p className="mt-3 text-sm text-amber-800">มีบางรายที่ยังโหลดไม่ได้หรือสิทธิ์เปลี่ยนแล้ว</p>}{!cases.length && !failed && <p className="mt-3 text-sm text-slate-500">ไม่มีเรื่องรอพิจารณาจากผู้ป่วยในหน้านี้</p>}{cases.map(item => <Link key={item.patientId + item.id} className="mt-3 block rounded-xl border p-3 text-sm" href={`/doctor/patients/?patient=${encodeURIComponent(item.patientId)}`}><b>{item.title}</b><p className="mt-1 text-slate-500">{patients.find(p => p.id === item.patientId)?.name} · เปิดข้อมูลและบันทึกผลพิจารณา</p></Link>)}</>}{patients.length > 6 && <div className="mt-3 flex items-center gap-3 text-xs"><Button variant="ghost" size="sm" disabled={loading || page === 0} onClick={() => setPage(n => n - 1)}>ก่อนหน้า</Button><span>ผู้ป่วย {page * 6 + 1}–{Math.min(patients.length, page * 6 + 6)} จาก {patients.length} รายที่มีสิทธิ์</span><Button variant="ghost" size="sm" disabled={loading || (page + 1) * 6 >= patients.length} onClick={() => setPage(n => n + 1)}>ถัดไป</Button></div>}</section>;
}
