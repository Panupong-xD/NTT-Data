"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { NotificationFeed } from "@/components/mobile/notification-feed";
import { Button } from "@/components/ui/button";
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
      {consents.some(c=>c.status==="waiting") && <section className="care-sheet p-5"><h2 className="mobile-section-title">คำขอเข้าถึงข้อมูล</h2><div className="mt-3 divide-y divide-slate-100">{consents.filter(c=>c.status==="waiting").map(consent=><div key={consent.id} className="py-3"><p className="text-sm font-semibold">{consent.hospital}</p><p className="mt-1 text-sm leading-6 text-slate-500">{consent.reason}</p><div className="mt-4 grid grid-cols-2 gap-2"><Button className="rounded-full" onClick={()=>setDb(updateConsentStatus(db,consent.id,"approved"))}><Check className="h-4 w-4"/>อนุญาต</Button><Button variant="outline" className="rounded-full" onClick={()=>setDb(updateConsentStatus(db,consent.id,"rejected"))}><X className="h-4 w-4"/>ไม่อนุญาต</Button></div></div>)}</div></section>}
      <NotificationFeed items={notifications}/>
      {consents.some(c=>c.status!=="waiting") && <details className="px-1"><summary className="min-h-11 text-sm font-medium text-slate-500">ประวัติความยินยอม</summary><ul className="mt-3 divide-y divide-slate-200/60">{consents.filter(c=>c.status!=="waiting").map(c=><li key={c.id} className="py-3"><p className="text-sm font-medium">{c.hospital}</p><p className="mt-1 text-xs text-slate-500">{c.status==="approved"?"อนุญาตแล้ว":"ไม่อนุญาต"} · {formatThaiDate(c.date)}</p></li>)}</ul></details>}
    </MobileShell>
  );
}
