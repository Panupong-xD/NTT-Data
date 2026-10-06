import { Activity, ArrowUpRight, ChevronDown, ShieldCheck, AlertTriangle } from "lucide-react";
import { EarlyWarning } from "@/lib/types";
import { cn, formatThaiDate } from "@/lib/utils";

const riskStyle = {
  green: { label: "ปกติ", text: "text-emerald-700", background: "bg-emerald-50", stroke: "stroke-emerald-500" },
  yellow: { label: "เฝ้าดู", text: "text-amber-700", background: "bg-amber-50", stroke: "stroke-amber-500" },
  orange: { label: "เสี่ยงปานกลาง", text: "text-orange-700", background: "bg-orange-50", stroke: "stroke-orange-500" },
  red: { label: "เสี่ยงสูง", text: "text-rose-700", background: "bg-rose-50", stroke: "stroke-rose-500" }
};

export function EarlyWarningCard({ warning, showClinicalDetails = false, metricAlerts = [] }: { warning: EarlyWarning; showClinicalDetails?: boolean; metricAlerts?: string[] }) {
  const style = riskStyle[warning.level];
  const Icon = warning.level === "green" ? ShieldCheck : AlertTriangle;
  const score = Math.max(0, Math.min(100, warning.score));
  if (warning.level === "green" && !showClinicalDetails) {
    const attention = metricAlerts.length > 0;
    const SummaryIcon = attention ? AlertTriangle : ShieldCheck;
    return <section className={cn("rounded-[24px] px-4 py-2", attention ? "bg-[#fff1db]" : "bg-[#e7f3eb]")}><details className="group"><summary className="flex min-h-12 items-center gap-2 text-sm"><SummaryIcon className={cn("h-5 w-5 shrink-0", attention ? "text-amber-700" : "text-emerald-600")}/><span className="flex-1 font-medium text-slate-800">สัญญาณสุขภาพ</span><span className={cn("text-xs", attention ? "text-amber-800" : "text-emerald-700")}>{attention ? "มีค่าควรใส่ใจ" : "ความเสี่ยงต่ำ"}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-500 group-open:rotate-180"/></summary><div className="space-y-3 pb-3 pt-2 text-sm leading-7 text-slate-600"><p>{attention ? metricAlerts.join(" · ") : warning.reason}</p><p>{warning.patientRecommendation}</p><p className="text-xs">ความเสี่ยงรวม {score}/100 · คะแนนสูง = ความเสี่ยงเพิ่มขึ้น</p><p className="text-xs">ประเมิน {formatThaiDate(warning.createdAt)} · {warning.suggestedAction}</p></div></details></section>;
  }
  return (
    <section className="care-sheet p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Activity className="h-4 w-4 text-sky-600" /> สัญญาณสุขภาพ</h3>
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold", style.text)}><Icon className="h-4 w-4" />{style.label}</span>
      </header>
      <div className="my-4 flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0" role="img" aria-label={`คะแนนความเสี่ยง ${score} จาก 100 ระดับ${style.label}`}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="43" fill="none" className="stroke-slate-100" strokeWidth="5" />
            <circle cx="50" cy="50" r="43" fill="none" className={style.stroke} strokeWidth="5" strokeLinecap="round" pathLength="100" strokeDasharray={`${score} 100`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold tabular-nums text-slate-900">{score}<span className="text-xs font-medium text-slate-400">/100</span></span><span className="mt-0.5 text-[10px] text-slate-500">ความเสี่ยง</span></div>
        </div>
        <div className="min-w-0">
          <h4 className="text-base font-semibold leading-7 text-slate-800">{warning.reason}</h4>
        </div>
      </div>
      <div className={cn("rounded-2xl px-4 py-3", style.background)}>
        <p className={cn("mb-1 flex items-center gap-1.5 text-xs font-semibold", style.text)}><ArrowUpRight className="h-4 w-4" /> สิ่งที่ควรทำตอนนี้</p>
        <p className="text-sm leading-6 text-slate-700">{warning.patientRecommendation}</p>
      </div>
      <details open={showClinicalDetails || undefined} className="group mt-4 border-t border-slate-100 pt-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 [&::-webkit-details-marker]:hidden">
          ดูรายละเอียด<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pb-2 text-sm leading-6 text-slate-600">
          <p className="text-xs text-slate-500">คะแนนสูง = ความเสี่ยงเพิ่มขึ้น · {formatThaiDate(warning.createdAt)}</p><p>{warning.suggestedAction}</p>
          {warning.contributors.length > 0 && <div><p className="font-semibold text-slate-800">สัญญาณที่นำมาประเมิน</p><ul className="mt-1 list-disc space-y-1 pl-5">{warning.contributors.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
          <div><p className="font-semibold text-slate-800">คำแนะนำสำหรับแพทย์</p><p className="mt-1">{warning.doctorRecommendation}</p></div>
        </div>
      </details>

    </section>
  );
}
