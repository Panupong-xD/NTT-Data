import { Info, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RiskLevel } from "@/lib/types";

export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  note,
  riskLevel,
  onInfoClick
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  note?: string;
  riskLevel?: RiskLevel;
  onInfoClick?: () => void;
}) {
  const textValClass = {
    green: "text-slate-950",
    yellow: "text-amber-600",
    orange: "text-orange-600",
    red: "text-red-600"
  }[riskLevel || "green"];

  return (
    <article className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all duration-300">
      <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-450">{title}</p>
          {onInfoClick ? (
            <button
              onClick={onInfoClick}
              className="shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100/50 hover:text-sky-600"
              aria-label={`ข้อมูลแนะนำสำหรับ ${title}`}
            >
              <Info className="h-3 w-3" />
            </button>
          ) : null}
        </header>
        <div className="mt-0.5 flex items-end gap-0.5">
          <span className={cn("text-lg font-extrabold leading-none tracking-tight", textValClass)}>{value}</span>
          {unit ? <span className="pb-0.5 pl-0.5 text-[9px] font-bold uppercase leading-none text-slate-400">{unit}</span> : null}
        </div>
        {note ? <p className="mt-1 text-[9px] text-slate-400">{note}</p> : null}
      </div>
    </article>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const label = {
    green: "ปกติ",
    yellow: "เฝ้าดู",
    orange: "เสี่ยงปานกลาง",
    red: "เสี่ยงสูง"
  }[level];
  return <Badge tone={level}>{label}</Badge>;
}
