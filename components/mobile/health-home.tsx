"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Droplets, Activity, HeartPulse, Scale, Sparkles, CalendarDays, CheckCheck, HeartHandshake } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { CareTask } from "@/lib/types";
import { formatThaiDate } from "@/lib/utils";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { EarlyWarningCard } from "@/components/health/early-warning-card";
import { DailyCareTasks } from "@/components/health/daily-care-tasks";
import { HospitalCampaignCarousel } from "@/components/health/hospital-carousel";
import { MobileSheet } from "./mobile-sheet";
import { TaskActionSheet } from "./task-action-sheet";
import { HealthCharm } from "./health-charm";

export function HealthHome({ role }: { role: "patient" | "caregiver" }) {
  const { user } = useAuth(); const { db } = useMockStore();
  const caregiver = db.caregivers.find(c => c.email === user?.email) || db.caregivers[0];
  const patient = (role === "patient" ? db.patients.find(p => p.email === user?.email) : db.patients.find(p => p.id === caregiver.patientId)) || db.patients[0];
  const records = db.healthRecords.filter(r => r.patientId === patient.id);
  const latest = records[records.length - 1];
  const plan = db.carePlans.find(p => p.patientId === patient.id);
  const warning = db.earlyWarnings.find(w => w.patientId === patient.id);
  const pending = records.filter(r => r.confirmationStatus === "pending").length + (plan?.tasks.filter(t => t.pendingConfirm).length || 0);
  const [task, setTask] = useState<CareTask | null>(null);
  const [detail, setDetail] = useState<{title:string; text:string; value?:string; unit?:string; href?:string} | null>(null);
  const healthHref = role === "patient" ? "/patient/health" : "/caregiver/patients";
  const bmi = latest && latest.height ? (latest.weight / Math.pow(latest.height/100,2)).toFixed(1) : "—";
  const metrics = [
    { title:"ความดัน", value:latest ? `${latest.systolic}/${latest.diastolic}` : "—", unit:"mmHg", icon:Activity, color:"bg-[#e4f2fc]", text:"ความดันตัวบน / ตัวล่าง", key:"bp" },
    { title:"น้ำตาล", value:latest?.bloodSugar ?? "—", unit:"mg/dL", icon:Droplets, color:"bg-[#e3f3eb]", text:"ค่าน้ำตาลในเลือดที่บันทึกล่าสุด", key:"sugar" },
    { title:"ชีพจร", value:latest?.heartRate ?? "—", unit:"ครั้ง/นาที", icon:HeartPulse, color:"bg-[#fce9e8]", text:"อัตราการเต้นของหัวใจที่บันทึกล่าสุด", key:"heart" },
    { title:"BMI", value:bmi, unit:"กก./ม²", icon:Scale, color:"bg-[#efebfb]", text:"ดัชนีมวลกายคำนวณจากน้ำหนักและส่วนสูงล่าสุด", key:"bmi" }
  ];
  const goals = [
    { title:"น้ำตาล", value:"80–130", unit:"mg/dL", color:"bg-[#e2f2e8]", rotation:"rotate-[-2deg]", text:"เป้าหมายน้ำตาลก่อนอาหารเช้า 80–130 mg/dL และ HbA1c น้อยกว่า 7% ตามเป้าหมายในแผนดูแล" },
    { title:"ความดัน", value:"<130/80", unit:"mmHg", color:"bg-[#e5edfd]", rotation:"rotate-[1deg]", text:"เป้าหมายความดันต่ำกว่า 130/80 mmHg ตามเป้าหมายในแผนดูแล" },
    { title:"ขยับร่างกาย", value:"150", unit:"นาที/สัปดาห์", color:"bg-[#fff0d5]", rotation:"rotate-[-1deg]", text:"เป้าหมายออกกำลังกายรวม 150 นาทีต่อสัปดาห์ เฉลี่ยวันละ 30 นาที 5 วัน ตามเป้าหมายในแผนดูแล" }
  ];
  return <MobileShell role={role} title="WELLYNC">
    <section>
      <p className="text-sm text-slate-500">{role === "patient" ? "สวัสดี" : `สวัสดี ${caregiver.name.split(" ")[0]}`} <span className="inline-block origin-bottom-right" aria-hidden="true">☀</span></p>
      <h2 className="mt-0.5 text-[26px] font-bold leading-9 tracking-tight">{role === "patient" ? patient.name : `วันนี้ดูแล ${patient.name.split(" ")[0]}`}</h2>
      <div className="mobile-hero mt-4 flex min-h-[164px] items-center px-6 pb-7 pt-5">
        <div className="relative z-10"><p className="text-sm text-sky-800">คะแนนสุขภาพ</p><p className="mt-1 text-[52px] font-bold leading-none tracking-[-2px] text-sky-900">{patient.healthScore}<span className="ml-1 text-base font-medium tracking-normal text-sky-700/60">/100</span></p><p className="mt-3 text-xs text-slate-500">{latest ? `บันทึกล่าสุด ${formatThaiDate(latest.date)}` : "เริ่มจากบันทึกสุขภาพวันนี้"}</p></div>
        <HealthCharm className="mobile-float absolute right-1 top-2 h-36 w-36 opacity-90" />
        <svg viewBox="0 0 400 30" preserveAspectRatio="none" className="mobile-wave" aria-hidden="true"><path d="M0 19C80 36 95 0 170 16S295 32 400 9V30H0Z" fill="#f5faff"/></svg>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {metrics.map(({title,value,unit,icon:Icon,color,text,key}) => <button key={key} onClick={() => setDetail({title,value:String(value),unit,text:`${text}${latest ? ` · ${formatThaiDate(latest.date)}` : " · ยังไม่มีบันทึก"}`})} className={`pocket min-h-[120px] text-left ${color}`} aria-label={`ดู${title} ${value} ${unit}`}><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-600">{title}</span><Icon className="h-5 w-5 text-slate-600/70" strokeWidth={1.6}/></div><p className="mt-2 text-[27px] font-bold leading-8 tracking-tight text-slate-800">{value}</p><p className="mt-1 text-[11px] text-slate-500">{unit}</p></button>)}
      </div>
      <Link href={healthHref} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-sky-600 text-sm font-semibold text-white shadow-[0_6px_16px_-9px_#0284c7]">{role === "patient" ? "บันทึกสุขภาพวันนี้" : "ดูข้อมูลผู้ป่วย"}<ArrowUpRight className="h-4 w-4"/></Link>
    </section>
    {role === "caregiver" && pending > 0 && <Link href="/caregiver/patients?tab=confirm" className="flex items-center gap-3 rounded-[24px] bg-[#fff0d8] p-4"><CheckCheck className="h-6 w-6 text-amber-700"/><span className="flex-1 text-sm font-semibold text-amber-900">มี {pending} บันทึกรอคุณยืนยัน</span><ArrowUpRight className="h-4 w-4 text-amber-700"/></Link>}
    {warning && <EarlyWarningCard warning={warning} />}
    <DailyCareTasks tasks={plan?.tasks || []} title={role === "patient" ? "สิ่งที่ต้องทำวันนี้" : "กิจกรรมดูแลวันนี้"} role={role} onTaskAction={setTask} />
    <section><header className="mb-5 flex items-center justify-between"><h3 className="mobile-section-title">เป้าหมายเล็ก ๆ ของเรา</h3><Link href={`/${role}/care-plan`} className="text-xs font-medium text-sky-700">ดูแผน<ArrowUpRight className="ml-1 inline h-3 w-3"/></Link></header><div className="grid grid-cols-3 gap-2.5">{goals.map(goal => <button key={goal.title} onClick={() => setDetail({title:`เป้าหมาย${goal.title}`,text:goal.text,value:goal.value,unit:goal.unit,href:`/${role}/care-plan`})} className={`goal-note ${goal.color} ${goal.rotation}`}><p className="text-[11px] text-slate-600">{goal.title}</p><p className="mt-2 text-[19px] font-bold leading-7 tracking-tight">{goal.value}</p><p className="mt-1 text-[10px] text-slate-500">{goal.unit}</p><ArrowUpRight className="mt-2 h-3.5 w-3.5 text-slate-500"/></button>)}</div></section>
    <Link href={role === "patient" ? "/patient/health?tab=ai" : "/caregiver/ai"} className="flex items-center gap-3 px-1 py-2"><span className="flex h-12 w-12 items-center justify-center rounded-[40%_60%_50%_50%] bg-[#eae5fa]"><Sparkles className="h-5 w-5 text-violet-500"/></span><span className="flex-1"><span className="block text-sm font-semibold">ถามผู้ช่วยสุขภาพ</span><span className="text-xs text-slate-500">สงสัยเรื่องไหน คุยกันได้</span></span><ArrowUpRight className="h-4 w-4 text-slate-400"/></Link>
    {role === "caregiver" && <Link href="/caregiver/burnout" className="flex items-center gap-3 px-1 py-2"><HeartHandshake className="h-6 w-6 text-emerald-600"/><span className="flex-1 text-sm font-semibold">ดูแลใจตัวเองด้วยนะ</span><ArrowUpRight className="h-4 w-4 text-slate-400"/></Link>}
    {plan?.followUp.length ? <section className="rounded-[24px] bg-white px-4 py-4"><div className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-sky-600"/>ติดตามกับแพทย์</div><p className="mt-2 text-sm text-slate-500">{plan.followUp[0]}</p></section> : null}
    <HospitalCampaignCarousel />
    <MobileSheet open={!!detail} onOpenChange={open => !open && setDetail(null)} title={detail?.title || "ข้อมูลสุขภาพ"}><>{detail?.value && <p className="mb-4 text-[36px] font-bold leading-tight text-sky-900">{detail.value}<span className="ml-2 text-sm font-normal text-slate-500">{detail.unit}</span></p>}<p className="text-sm leading-7 text-slate-600">{detail?.text}</p></><Link href={detail?.href || healthHref} className="mt-5 flex min-h-11 items-center gap-2 text-sm font-semibold text-sky-700">{detail?.href ? "ดูแผนดูแล" : "ดูบันทึกสุขภาพ"}<ArrowUpRight className="h-4 w-4"/></Link></MobileSheet>
    <TaskActionSheet task={task} onClose={() => setTask(null)} planId={plan?.id || ""} patientId={patient.id} role={role}/>
  </MobileShell>;
}
