"use client";

import { useEffect } from "react";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { updateConsentStatus } from "@/lib/services/mock-store";
import { formatThaiDate } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";

export default function PatientNotificationsPage() {
  const { db, setDb } = useMockStore();
  const { user } = useAuth();
  const patient = db.patients.find((item) => item.email === user?.email) || db.patients[0];
  const notifications = db.notifications.filter((item) => item.userRole === "patient" && item.patientId === patient.id);
  const consents = db.consents.filter((item) => item.patientId === patient.id);

  // Mark patient alerts as read when they navigate away
  useEffect(() => {
    return () => {
      setDb((current) => {
        const hasUnread = current.notifications.some(
          (n) => n.userRole === "patient" && n.patientId === patient.id && !n.read
        );
        if (!hasUnread) return current;
        return {
          ...current,
          notifications: current.notifications.map((n) =>
            n.userRole === "patient" && n.patientId === patient.id ? { ...n, read: true } : n
          )
        };
      });
    };
  }, [patient.id, setDb]);

  return (
    <MobileShell role="patient" title="แจ้งเตือน">
      <Card>
        <CardHeader><CardTitle>คำขอเข้าถึงจากโรงพยาบาล</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {consents.map((consent) => (
            <div key={consent.id} className="rounded-2xl bg-sky-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {consent.status === "waiting" && (
                      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    )}
                    <p className="font-bold">{consent.hospital}</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{consent.reason}</p>
                </div>
                <Badge tone={consent.status === "approved" ? "green" : consent.status === "rejected" ? "red" : "yellow"}>
                  {consent.status === "approved" ? "อนุมัติแล้ว" : consent.status === "rejected" ? "ปฏิเสธแล้ว" : "รออนุมัติ"}
                </Badge>
              </div>
              {consent.status === "waiting" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="success" onClick={() => setDb((current) => updateConsentStatus(current, consent.id, "approved"))}><Check className="h-4 w-4" /> อนุมัติ</Button>
                  <Button variant="outline" onClick={() => setDb((current) => updateConsentStatus(current, consent.id, "rejected"))}><X className="h-4 w-4" /> ปฏิเสธ</Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {notifications.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {!item.read && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                  )}
                  <p className="font-bold">{item.title}</p>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.message}</p>
                <p className="mt-2 text-xs font-semibold text-sky-700">{formatThaiDate(item.date)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </MobileShell>
  );
}
