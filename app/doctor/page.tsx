"use client";

import { AlertTriangle, CalendarDays, ClipboardCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { MetricCard } from "@/components/health/metric-card";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { formatThaiDate } from "@/lib/utils";

export default function DoctorDashboardPage() {
  const { db } = useMockStore();
  const highRisk = db.earlyWarnings.filter((item) => item.level === "red" || item.level === "orange");
  const pending = db.consents.filter((item) => item.status === "waiting");
  const notifications = db.notifications.filter((item) => item.userRole === "doctor");

  return (
    <DoctorShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Patients" value={db.patients.length} icon={Users} tone="blue" />
        <MetricCard title="High Risk Patients" value={highRisk.length} icon={AlertTriangle} tone="red" />
        <MetricCard title="Pending Consent" value={pending.length} icon={ClipboardCheck} tone="yellow" />
        <MetricCard title="Today's Appointments" value={7} icon={CalendarDays} tone="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2 mt-6">
        <Card>
          <CardHeader><CardTitle>AI Risk Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {highRisk.slice(0, 5).map((warningItem) => {
              const itemPatient = db.patients.find((item) => item.id === warningItem.patientId)!;
              return (
                <div key={warningItem.id} className="flex items-center justify-between rounded-2xl bg-sky-50 p-4">
                  <div>
                    <p className="font-bold">{itemPatient.name}</p>
                    <p className="text-sm text-slate-500">{warningItem.reason}</p>
                  </div>
                  <Badge tone={warningItem.level}>{warningItem.score}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Activities</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((item) => {
              const itemPatient = db.patients.find((p) => p.id === item.patientId);
              return (
                <div key={item.id} className="rounded-2xl border bg-white p-4">
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
                </div>
              );
            })}
            {!notifications.length ? (
              <div className="text-center py-6 text-sm text-slate-450">ไม่มีกิจกรรมความเคลื่อนไหวใหม่</div>
            ) : null}
          </CardContent>
        </Card>
      </div>

    </DoctorShell>
  );
}
