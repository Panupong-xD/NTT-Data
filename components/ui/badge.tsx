import * as React from "react";
import { cn } from "@/lib/utils";

const toneMap = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  yellow: "bg-amber-50 text-amber-700 ring-amber-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-50 text-slate-600 ring-slate-200"
};

export function Badge({
  className,
  tone = "blue",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof toneMap }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
        toneMap[tone],
        className
      )}
      {...props}
    />
  );
}
