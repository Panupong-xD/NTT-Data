import { AlertTriangle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EarlyWarning } from "@/lib/types";
import { RiskBadge } from "@/components/health/metric-card";

export function EarlyWarningCard({ warning }: { warning: EarlyWarning }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Early Warning
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500">วิเคราะห์แนวโน้มจากหลายตัวชี้วัด ไม่ใช่แค่ threshold</p>
        </div>
        <RiskBadge level={warning.level} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-semibold">
            <span>Risk Score</span>
            <span>{warning.score}/100</span>
          </div>
          <Progress value={warning.score} />
        </div>
        <div className="rounded-2xl bg-sky-50 p-4">
          <p className="text-sm font-bold text-slate-900">เหตุผล</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{warning.reason}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">คำแนะนำผู้ป่วย</p>
            <p className="mt-1 text-sm leading-6 text-emerald-700">{warning.patientRecommendation}</p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-4">
            <p className="text-sm font-bold text-orange-800">คำแนะนำแพทย์</p>
            <p className="mt-1 text-sm leading-6 text-orange-700">{warning.doctorRecommendation}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
          <Activity className="h-4 w-4" />
          {warning.suggestedAction}
        </div>
      </CardContent>
    </Card>
  );
}
