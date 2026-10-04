"use client";
import { useState, type CSSProperties } from "react";
import { HeartHandshake, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { HealthCharm } from "@/components/mobile/health-charm";
import { MobileSheet } from "@/components/mobile/mobile-sheet";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { useAuth } from "@/lib/hooks/use-auth";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/utils";
export default function BurnoutPage(){
 const {db,setDb}=useMockStore();const {user}=useAuth();const caregiver=db.caregivers.find(c=>c.email===user?.email)||db.caregivers[0];
 const [values,setValues]=useState([caregiver.wellbeingCheckIn?.energy??3,caregiver.wellbeingCheckIn?.rest??3,caregiver.wellbeingCheckIn?.worry??3]);const [resting,setResting]=useState(false);
 const questions=[{label:"วันนี้มีพลังแค่ไหน?",low:"หมดแรง",high:"มีพลัง"},{label:"ได้พักเพียงพอไหม?",low:"ยังไม่พอ",high:"ได้พักเต็มที่"},{label:"กังวลเรื่องการดูแลแค่ไหน?",low:"ไม่กังวล",high:"กังวลมาก"}];
 function save(){setDb(db=>({...db,caregivers:db.caregivers.map(c=>c.id===caregiver.id?{...c,wellbeingCheckIn:{date:new Date().toISOString(),energy:values[0],rest:values[1],worry:values[2]}}:c)}));toast.success("เก็บเช็กอินวันนี้แล้ว");}
 return <MobileShell role="caregiver" title="เช็กอินใจ"><section className="relative overflow-hidden rounded-[30px_30px_40px_24px] bg-[#e1f1e8] p-5"><p className="text-xs text-emerald-700">พื้นที่เล็ก ๆ สำหรับคุณ</p><h2 className="relative z-10 mt-2 text-[26px] font-bold leading-9 text-emerald-900">เหนื่อยได้<br/>พักได้เสมอ</h2><HealthCharm mood="rest" className="mobile-float absolute -right-3 -bottom-1 h-36 w-36"/></section>
  <section className="care-sheet p-5"><h3 className="mobile-section-title">วันนี้รู้สึกอย่างไร?</h3><p className="mt-1 text-xs text-slate-500">เช็กอินสั้น ๆ ไม่มีคำตอบที่ผิด</p><div className="mt-6 space-y-7">{questions.map((q,index)=><div key={q.label}><div className="mb-3 flex items-center justify-between gap-2"><label htmlFor={`feeling-${index}`} className="text-sm font-medium">{q.label}</label><output htmlFor={`feeling-${index}`} className="text-sm font-semibold text-sky-700">{values[index]}<span className="font-normal text-slate-400">/5</span></output></div><input id={`feeling-${index}`} type="range" min="1" max="5" step="1" value={values[index]} className="mobile-range w-full" style={{ "--range-fill": `${(values[index] - 1) * 25}%` } as CSSProperties} onChange={e=>setValues(v=>v.map((value,i)=>i===index?Number(e.target.value):value))}/><div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{q.low}</span><span>{q.high}</span></div></div>)}</div><Button className="mt-6 h-12 w-full rounded-full" onClick={save}><Check className="h-4 w-4"/>เก็บเช็กอินวันนี้</Button>{caregiver.wellbeingCheckIn&&<p className="mt-3 text-center text-xs text-slate-500">เช็กอินล่าสุด {formatThaiDate(caregiver.wellbeingCheckIn.date)}</p>}</section>
  <button onClick={()=>setResting(true)} className="flex min-h-[86px] w-full items-center gap-3 rounded-[24px] bg-[#e9f4ef] px-5 text-left"><HeartHandshake className="h-6 w-6 text-emerald-600"/><span className="flex-1"><span className="block text-sm font-semibold text-emerald-900">พักหายใจสักครู่</span><span className="mt-1 block text-xs text-emerald-700">ให้วันนี้เบาลงอีกนิด</span></span><span className="text-emerald-700">↗</span></button>
  <details className="group px-1"><summary className="flex min-h-11 items-center justify-between text-sm text-slate-500">ผลประเมินก่อนหน้า<ChevronDown className="h-4 w-4 group-open:rotate-180"/></summary><p className="py-3 text-sm text-slate-600">คะแนนภาระการดูแล (MCSI) ล่าสุด {caregiver.mcsiScore}</p></details>
  <MobileSheet open={resting} onOpenChange={setResting} title="ตอนนี้ พักได้เลย"><div className="py-7 text-center"><HealthCharm mood="rest" className="mx-auto h-44 w-44 mobile-breathe"/><p className="mt-6 text-base font-medium text-emerald-800">หายใจช้า ๆ ตามจังหวะที่สบาย</p><p className="mt-2 text-sm text-slate-500">ตรงนี้ไม่มีอะไรต้องรีบ</p></div></MobileSheet>
 </MobileShell>;
}
