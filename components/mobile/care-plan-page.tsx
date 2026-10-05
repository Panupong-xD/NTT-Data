"use client";
import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { CareTask } from "@/lib/types";
import { bangkokDate } from "@/lib/mobile-calendar";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { CarePlanOverview } from "@/components/health/care-plan-overview";
import { DailyCareTasks } from "@/components/health/daily-care-tasks";
import { TaskActionSheet } from "./task-action-sheet";
import { CareCalendar } from "./care-calendar";

export function MobileCarePlanPage({ role }: {role:"patient"|"caregiver"}) {
  const {db}=useMockStore();const {user}=useAuth();
  const caregiver=db.caregivers.find(c=>c.email===user?.email)||db.caregivers[0];
  const patient=(role==="patient"?db.patients.find(p=>p.email===user?.email):db.patients.find(p=>p.id===caregiver.patientId))||db.patients[0];
  const plan=db.carePlans.find(p=>p.patientId===patient.id);
  const [today]=useState(bangkokDate); const [date,setDate]=useState(today);const [task,setTask]=useState<CareTask|null>(null);
  const tasks=date===today ? plan?.tasks||[] : date>today ? (plan?.tasks||[]).map(t=>({...t,status:"pending" as const,pendingConfirm:undefined})) : [];
  return <MobileShell role={role} title="แผนดูแล">
    <CareCalendar today={today} date={date} onDateChange={setDate} appointments={plan?.appointments} />
    <DailyCareTasks title={date===today?"กิจกรรมวันนี้":date<today?"บันทึกกิจกรรม":"กิจกรรมตามแผน"} tasks={tasks} role={role} onTaskAction={date===today?setTask:undefined}/>
    {plan?<CarePlanOverview plan={plan} patientName={role==="caregiver"?patient.name:undefined}/>:<p className="text-sm text-slate-500">เมื่อแพทย์จัดทำแผนแล้ว คุณจะดูคำแนะนำได้ที่นี่</p>}
    {plan?.followUp.length ? <section className="px-1"><h3 className="mobile-section-title">ติดตามกับแพทย์</h3><ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">{plan.followUp.map((item,i)=><li key={i}>{item}</li>)}</ul></section>:null}
    <TaskActionSheet task={task} onClose={()=>setTask(null)} planId={plan?.id||""} patientId={patient.id} role={role}/>
  </MobileShell>;
}
