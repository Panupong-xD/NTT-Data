import { Pill, Utensils, Dumbbell, Activity, Check, Pencil, ChevronDown } from "lucide-react";
import { CarePlan } from "@/lib/types";
import { formatThaiDate } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
export function CarePlanOverview({ plan, patientName }: { plan: Pick<CarePlan,"status"|"updatedAt"|"summary"|"medication"|"diet"|"exercise"|"measurement">; patientName?:string }) {
  const draft=plan.status==="draft";
  const sections=[{title:"ยา",items:plan.medication,icon:Pill,tone:"bg-[#efebfb] text-violet-600"},{title:"อาหาร",items:plan.diet,icon:Utensils,tone:"bg-[#fff0da] text-orange-600"},{title:"ขยับร่างกาย",items:plan.exercise,icon:Dumbbell,tone:"bg-[#e4f3ea] text-emerald-600"},{title:"วัดและบันทึก",items:plan.measurement,icon:Activity,tone:"bg-[#e5f2fd] text-sky-600"}];
  return <section className="care-sheet overflow-hidden p-5">
    <header className="mb-4"><div className="flex items-center justify-between gap-2"><h3 className="mobile-section-title">{patientName ? `แผนของ ${patientName.split(" ")[0]}` : "แผนดูแลของคุณ"}</h3><span className={`flex items-center gap-1 text-xs ${draft?"text-amber-700":"text-emerald-700"}`}>{draft?<Pencil className="h-3 w-3"/>:<Check className="h-3 w-3"/>}{draft?"ฉบับร่าง":"แพทย์อนุมัติ"}</span></div><p className="mt-1 text-xs text-slate-500">อัปเดต {formatThaiDate(plan.updatedAt)}</p></header>
    <details className="mb-2 border-b border-dashed border-slate-200 pb-3"><summary className="flex min-h-11 items-center justify-between text-sm text-slate-600">ภาพรวมแผน<ChevronDown className="h-4 w-4"/></summary><div className="pb-2 text-sm leading-7 text-slate-600"><MarkdownRenderer content={plan.summary}/></div></details>
    <div className="divide-y divide-slate-100">{sections.map(({title,items,icon:Icon,tone},index)=><details key={title} open={index===0} className="group"><summary className="flex min-h-[76px] items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-[40%_60%_50%_50%] ${tone}`}><Icon className="h-5 w-5" strokeWidth={1.7}/></span><h4 className="flex-1 text-sm font-semibold">{title}</h4><ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"/></summary><ul className="space-y-3 pb-5 pl-1">{items.length?items.map((item,i)=><li key={i} className="flex gap-2 text-sm leading-7 text-slate-600"><span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-slate-300"/>{item}</li>):<li className="text-sm text-slate-500">ยังไม่มีคำแนะนำ</li>}</ul></details>)}</div>
  </section>;
}
