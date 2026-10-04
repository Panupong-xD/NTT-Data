"use client";
import { useState } from "react";
import { ChevronDown, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { CareTask } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { CarePlanOverview } from "@/components/health/care-plan-overview";
import { DailyCareTasks } from "@/components/health/daily-care-tasks";
import { TaskActionSheet } from "./task-action-sheet";

const bangkokDate = () => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export function MobileCarePlanPage({ role }: {role:"patient"|"caregiver"}) {
  const {db}=useMockStore();const {user}=useAuth();
  const caregiver=db.caregivers.find(c=>c.email===user?.email)||db.caregivers[0];
  const patient=(role==="patient"?db.patients.find(p=>p.email===user?.email):db.patients.find(p=>p.id===caregiver.patientId))||db.patients[0];
  const plan=db.carePlans.find(p=>p.patientId===patient.id);
  const [today]=useState(bangkokDate); const [date,setDate]=useState(today);const [task,setTask]=useState<CareTask|null>(null);
  const selected=new Date(`${date}T12:00:00+07:00`);
  const dates=Array.from({length:7},(_,i)=>{const d=new Date(`${today}T12:00:00+07:00`);d.setDate(d.getDate()+i-2);return d;});
  const tasks=date===today ? plan?.tasks||[] : date>today ? (plan?.tasks||[]).map(t=>({...t,status:"pending" as const,pendingConfirm:undefined})) : [];
  return <MobileShell role={role} title="แผนดูแล">
    <section><div className="mb-4 flex items-center justify-between"><h2 className="text-[24px] font-bold">วันละนิด เพื่อสุขภาพ</h2><CalendarDays className="h-6 w-6 text-sky-600"/></div>
      <div className="flex items-center justify-between gap-1 rounded-[24px] bg-white p-2">{dates.map(d=>{const key=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);return <button key={key} onClick={()=>setDate(key)} aria-pressed={date===key} aria-label={d.toLocaleDateString("th-TH",{day:"numeric",month:"long",timeZone:"Asia/Bangkok"})} className={cn("flex min-h-[66px] min-w-0 flex-1 flex-col items-center justify-center rounded-full text-xs",date===key?"bg-sky-600 text-white":"text-slate-500")}><span className="text-[10px]">{d.toLocaleDateString("th-TH",{weekday:"short",timeZone:"Asia/Bangkok"})}</span><span className="mt-1 text-base font-semibold">{d.getDate()}</span></button>;})}</div>
      <details className="mt-2"><summary className="flex min-h-11 items-center justify-between px-1 text-xs text-slate-500">{selected.toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Bangkok"})}<span className="flex items-center gap-1">เลือกวัน<ChevronDown className="h-3.5 w-3.5"/></span></summary><label className="sr-only" htmlFor="care-date">เลือกวันที่ดูแผน</label><input id="care-date" type="date" value={date} className="h-12 w-full px-4" onChange={e=>e.target.value&&setDate(e.target.value)}/></details>
    </section>
    <DailyCareTasks title={date===today?"กิจกรรมวันนี้":date<today?"บันทึกกิจกรรม":"กิจกรรมตามแผน"} tasks={tasks} role={role} onTaskAction={date===today?setTask:undefined}/>
    {plan?<CarePlanOverview plan={plan} patientName={role==="caregiver"?patient.name:undefined}/>:<p className="text-sm text-slate-500">เมื่อแพทย์จัดทำแผนแล้ว คุณจะดูคำแนะนำได้ที่นี่</p>}
    {plan?.followUp.length ? <section className="px-1"><h3 className="mobile-section-title">ติดตามกับแพทย์</h3><ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">{plan.followUp.map((item,i)=><li key={i}>{item}</li>)}</ul></section>:null}
    <TaskActionSheet task={task} onClose={()=>setTask(null)} planId={plan?.id||""} patientId={patient.id} role={role}/>
  </MobileShell>;
}
