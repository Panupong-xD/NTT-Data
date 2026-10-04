"use client";

import { useEffect } from "react";
import { NotificationFeed } from "@/components/mobile/notification-feed";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { useAuth } from "@/lib/hooks/use-auth";

export default function CaregiverAlertsPage() {
  const { db, setDb } = useMockStore();
  const { user } = useAuth();
  const caregiver = db.caregivers.find(c => c.email === user?.email) || db.caregivers[0];
  const patient = db.patients.find((item) => item.id === caregiver.patientId) || db.patients[0];
  const notifications = db.notifications.filter((item) => item.userRole === "caregiver" && item.patientId === patient.id);

  // Mark caregiver alerts as read when they navigate away
  useEffect(() => {
    return () => {
      setDb((current) => {
        const hasUnread = current.notifications.some(
          (n) => n.userRole === "caregiver" && n.patientId === patient.id && !n.read
        );
        if (!hasUnread) return current;
        return {
          ...current,
          notifications: current.notifications.map((n) =>
            n.userRole === "caregiver" && n.patientId === patient.id ? { ...n, read: true } : n
          )
        };
      });
    };
  }, [patient.id, setDb]);

  return (
    <MobileShell role="caregiver" title="แจ้งเตือน">
      <NotificationFeed items={notifications} />
    </MobileShell>
  );
}
