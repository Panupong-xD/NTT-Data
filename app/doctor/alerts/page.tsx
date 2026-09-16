"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { EarlyWarningCard } from "@/components/health/early-warning-card";
import { useMockStore } from "@/lib/hooks/use-mock-store";

export default function DoctorAlertsPage() {
  const { db } = useMockStore();
  const alerts = db.earlyWarnings.filter((item) => item.level !== "green");
  return (
    <DoctorShell title="Alerts">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          {alerts.map((warning) => {
            const patient = db.patients.find((item) => item.id === warning.patientId)!;
            return (
              <Card key={warning.id}>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{patient.name}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{warning.reason}</p>
                      </div>
                      <Badge tone={warning.level}>{warning.score}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <EarlyWarningCard warning={alerts[0] ?? db.earlyWarnings[0]} />
      </div>
    </DoctorShell>
  );
}
