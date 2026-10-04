"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { EarlyWarningCard } from "@/components/health/early-warning-card";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { getApprovals, submitApprovalDecision } from "@/lib/services/ai/client";
import { ApprovalEntity } from "@/lib/types";
import { toast } from "sonner";

export default function DoctorAlertsPage() {
  const { db } = useMockStore();
  const alerts = db.earlyWarnings.filter((item) => item.level !== "green");

  const [approvals, setApprovals] = useState<ApprovalEntity[]>([]);

  useEffect(() => {
    getApprovals("PENDING").then(setApprovals).catch(console.warn);
  }, []);

  async function handleDecision(actionId: string, decision: "APPROVED" | "REJECTED") {
    await submitApprovalDecision(actionId, decision, "DOC-001");
    setApprovals((current) => current.filter((a) => a.actionId !== actionId));
    toast.success(decision === "APPROVED" ? "อนุมัติคำสั่งเรียบร้อยแล้ว" : "ปฏิเสธคำสั่งแล้ว");
  }

  return (
    <DoctorShell title="Alerts & Clinical Safeguards">
      {approvals.length > 0 && (
        <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-card">
          <header className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-900">
              คำขออนุมัติคำสั่งการรักษาที่ค้างพิจารณา ({approvals.length} รายการ - DynamoDB)
            </h3>
          </header>
          <div className="space-y-3">
            {approvals.map((app) => (
              <div key={app.actionId} className="bg-white p-4 rounded-2xl border border-amber-200 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      {app.patientName}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{app.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{app.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <strong>เหตุผล:</strong> {app.clinicalReason}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="success"
                    className="h-8 text-xs font-bold px-3 gap-1 shadow-sm"
                    onClick={() => handleDecision(app.actionId, "APPROVED")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    อนุมัติ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold px-3 gap-1 text-slate-600 border-slate-300"
                    onClick={() => handleDecision(app.actionId, "REJECTED")}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    ปฏิเสธ
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          {alerts.map((warning) => {
            const patient = db.patients.find((item) => item.id === warning.patientId)!;
            return (
              <article key={warning.id} className="flex items-start gap-4 rounded-3xl border bg-white p-5 shadow-card">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{patient.name}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{warning.reason}</p>
                    </div>
                    <Badge tone={warning.level}>{warning.score}</Badge>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <EarlyWarningCard warning={alerts[0] ?? db.earlyWarnings[0]} showClinicalDetails />
      </div>
    </DoctorShell>
  );
}
