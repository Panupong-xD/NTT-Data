"use client";
import { Check, Clock3, Minus, ArrowUpRight, CircleAlert, ChevronDown } from "lucide-react";
import { CareTask } from "@/lib/types";
import { cn } from "@/lib/utils";
const labels = { pending:"ยังไม่ได้ทำ", completed:"ทำแล้ว", skipped:"ข้ามวันนี้", cannot:"ทำไม่ได้" };
export function DailyCareTasks({ tasks, title, subtitle, role = "patient", onTaskAction }: { tasks: CareTask[]; title: string; subtitle?: string; role?: "patient"|"caregiver"; onTaskAction?: (task: CareTask) => void }) {
  const completed = tasks.filter(t => t.status === "completed" && !t.pendingConfirm).length;
  return <section className="care-sheet p-5">
    <header className="flex items-center justify-between gap-3"><div><h3 className="mobile-section-title">{title}</h3>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div><p className="shrink-0 text-lg font-bold tabular-nums text-sky-700" aria-label={`ทำแล้ว ${completed} จาก ${tasks.length} กิจกรรม`}>{completed}<span className="text-xs font-normal text-slate-400"> / {tasks.length}</span></p></header>
    {tasks.length ? <><div className="mb-2 mt-4 flex gap-1.5" aria-hidden="true">{tasks.map(t => <span key={t.id} className={cn("h-1 flex-1 rounded-full", t.pendingConfirm ? "bg-amber-200" : t.status === "completed" ? "bg-emerald-400" : "bg-slate-100")}/>)}</div>
    <ol className="divide-y divide-slate-100">{tasks.map(task => {
      const pending = !!task.pendingConfirm;
      const canAct = !!onTaskAction && (role === "caregiver" ? pending || task.status === "pending" : !pending && task.status === "pending");
      const Icon = pending ? Clock3 : task.status === "completed" ? Check : task.status === "skipped" ? Minus : task.status === "cannot" ? CircleAlert : null;
      const status = pending ? `รอยืนยัน · ${labels[task.pendingConfirm!]}` : labels[task.status];
      const color = pending || task.status === "skipped" ? "text-amber-700" : task.status === "completed" ? "text-emerald-700" : task.status === "cannot" ? "text-rose-700" : "text-slate-500";
      const content = <><span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border", pending ? "border-amber-200 bg-amber-50 text-amber-700" : task.status === "completed" ? "border-emerald-100 bg-emerald-100 text-emerald-700" : "border-sky-200 bg-white text-sky-500")} aria-hidden="true">{Icon && <Icon className="h-3.5 w-3.5"/>}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-6 text-slate-800">{task.title}</span><span className="mt-0.5 block text-xs text-slate-500">{task.time} น.{!canAct && <span className={`ml-2 ${color}`}>· {status}</span>}{canAct && pending && <span className="ml-2 text-amber-700">· {labels[task.pendingConfirm!]}</span>}</span></span><span className="shrink-0 text-xs font-semibold text-sky-700">{canAct ? pending ? "ยืนยัน" : role === "caregiver" ? "เตือน" : "บันทึก" : ""}{canAct ? <ArrowUpRight className="ml-1 inline h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5 text-slate-400"/>}</span></>;
      return <li key={task.id}>{canAct ? <button type="button" className="flex min-h-[76px] w-full items-center gap-3 rounded-xl py-3 text-left" aria-label={`${pending ? "ยืนยัน" : role === "caregiver" ? "เตือน" : "บันทึก"} ${task.title}`} onClick={() => onTaskAction?.(task)}>{content}</button> : <details className="group"><summary className="flex min-h-[76px] items-center gap-3 py-3">{content}</summary><p className="pb-4 pl-10 text-sm leading-6 text-slate-500">{task.detail}</p></details>}</li>;
    })}</ol></> : <p className="mt-4 text-sm text-slate-500">ยังไม่มีกิจกรรมในแผน</p>}
  </section>;
}
