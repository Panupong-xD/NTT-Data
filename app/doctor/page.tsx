"use client";

import { useEffect, useState } from "react";
import { 
  AlertTriangle, 
  CalendarDays, 
  CheckCircle2, 
  ClipboardCheck, 
  Clock, 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  Users, 
  XCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { MetricCard } from "@/components/health/metric-card";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { formatThaiDate } from "@/lib/utils";
import { getApprovals, submitApprovalDecision } from "@/lib/services/ai/client";
import { ApprovalEntity } from "@/lib/types";
import { toast } from "sonner";

export default function DoctorDashboardPage() {
  const { db } = useMockStore();
  const highRisk = db.earlyWarnings.filter((item) => item.level === "red" || item.level === "orange");
  const pending = db.consents.filter((item) => item.status === "waiting");
  const notifications = db.notifications.filter((item) => item.userRole === "doctor");

  // Real DynamoDB Human-in-the-Loop Approvals state
  const [approvals, setApprovals] = useState<ApprovalEntity[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    setLoadingApprovals(true);
    try {
      const items = await getApprovals("ALL");
      setApprovals(items);
    } catch (err) {
      console.warn("Failed to load approvals:", err);
    } finally {
      setLoadingApprovals(false);
    }
  }

  async function handleDecision(actionId: string, decision: "APPROVED" | "REJECTED") {
    try {
      await submitApprovalDecision(actionId, decision, "DOC-001");
      setApprovals((current) =>
        current.map((item) =>
          item.actionId === actionId
            ? { ...item, status: decision, reviewedAt: new Date().toISOString(), reviewedBy: "นพ. วิชัย ใจดี (DOC-001)" }
            : item
        )
      );

      if (decision === "APPROVED") {
        toast.success("อนุมัติคำสั่งการรักษาสำเร็จ", {
          description: `บันทึกคำสั่ง ${actionId} เข้าฐานข้อมูล DynamoDB เรียบร้อยแล้ว`
        });
      } else {
        toast.info("ปฏิเสธคำสั่งการรักษา", {
          description: `ปฏิเสธคำสั่ง ${actionId} ตามการตัดสินใจของแพทย์ (Human-in-the-Loop)`
        });
      }
    } catch (err) {
      toast.error("บันทึกการตัดสินใจไม่สำเร็จ");
    }
  }

  const pendingApprovals = approvals.filter((a) => a.status === "PENDING");

  return (
    <DoctorShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Patients" value={db.patients.length} icon={Users} />
        <MetricCard title="High Risk Patients" value={highRisk.length} icon={AlertTriangle} riskLevel="red" />
        <MetricCard title="Pending AI Approvals (HITL)" value={pendingApprovals.length} icon={ShieldCheck} riskLevel="yellow" />
        <MetricCard title="Today's Appointments" value={7} icon={CalendarDays} riskLevel="green" />
      </div>

      {/* Human-in-the-Loop Real DynamoDB Approval Queue */}
      <section className="mt-6 rounded-3xl border border-sky-100 bg-white p-6 shadow-card">
        <header className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Human-in-the-Loop Action Approval Queue
              </h3>
              <p className="text-xs text-slate-400">
                คำสั่งการรักษาและข้อเสนอแนะที่ AI Agent ส่งมาให้แพทย์ตรวจสอบก่อนดำเนินการจริง (DynamoDB Real-Time)
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={loadApprovals} 
            disabled={loadingApprovals}
            className="text-xs font-semibold gap-1.5 h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingApprovals ? "animate-spin" : ""}`} />
            รีเฟรชงาน
          </Button>
        </header>

        {approvals.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {approvals.map((app) => (
              <div key={app.actionId} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
                        {app.patientName} ({app.patientId})
                      </span>
                      <span className="text-xs font-semibold text-slate-400">ID: {app.actionId}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(app.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                      </span>
                    </div>
                    <p className="mt-1.5 font-bold text-slate-900 text-sm">{app.title}</p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{app.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      <strong className="text-slate-700">เหตุผลทางคลินิก:</strong> {app.clinicalReason}
                    </p>
                  </div>

                  <Badge 
                    tone={app.status === "APPROVED" ? "green" : app.status === "REJECTED" ? "red" : "yellow"}
                    className="text-xs font-bold shrink-0"
                  >
                    {app.status === "APPROVED" ? "อนุมัติแล้ว" : app.status === "REJECTED" ? "ปฏิเสธแล้ว" : "รอแพทย์อนุมัติ (Pending)"}
                  </Badge>
                </div>

                {app.status === "PENDING" ? (
                  <div className="flex items-center gap-2.5 pt-1">
                    <Button 
                      size="sm" 
                      variant="success" 
                      className="h-8 text-xs font-bold px-3 gap-1.5 shadow-sm"
                      onClick={() => handleDecision(app.actionId, "APPROVED")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      อนุมัติการรักษา (Approve)
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-xs font-bold px-3 gap-1.5 text-slate-600 border-slate-300 hover:bg-slate-100"
                      onClick={() => handleDecision(app.actionId, "REJECTED")}
                    >
                      <XCircle className="h-4 w-4" />
                      ปฏิเสธคำสั่ง (Reject)
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span>
                      <strong>พิจารณาโดย:</strong> {app.reviewedBy || "นพ. วิชัย ใจดี"} · {app.reviewNote}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      เมื่อ {app.reviewedAt ? new Date(app.reviewedAt).toLocaleTimeString("th-TH") : "ไม่ระบุ"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            ไม่มีคำขออนุมัติจาก AI Agent ในขณะนี้
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2 mt-6">
        <section className="rounded-3xl border bg-white p-6 shadow-card">
          <header className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">AI Risk Summary</h3>
          </header>
          <ul className="space-y-3">
            {highRisk.slice(0, 5).map((warningItem) => {
              const itemPatient = db.patients.find((item) => item.id === warningItem.patientId)!;
              return (
                <li key={warningItem.id} className="flex items-center justify-between rounded-2xl bg-sky-50 p-4">
                  <div>
                    <p className="font-bold">{itemPatient.name}</p>
                    <p className="text-sm text-slate-500">{warningItem.reason}</p>
                  </div>
                  <Badge tone={warningItem.level}>{warningItem.score}</Badge>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-card">
          <header className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Recent Activities</h3>
          </header>
          <ul className="space-y-3">
            {notifications.map((item) => {
              const itemPatient = db.patients.find((p) => p.id === item.patientId);
              return (
                <li key={item.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-800">{item.title}</p>
                    {itemPatient ? (
                      <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full shrink-0">
                        {itemPatient.name}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-500 mt-1.5">{item.message}</p>
                  <p className="mt-2 text-xs font-semibold text-sky-700">{formatThaiDate(item.date)}</p>
                </li>
              );
            })}
            {!notifications.length ? (
              <li className="text-center py-6 text-sm text-slate-400 list-none">ไม่มีกิจกรรมความเคลื่อนไหวใหม่</li>
            ) : null}
          </ul>
        </section>
      </div>
    </DoctorShell>
  );
}
