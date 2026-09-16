"use client";

import Link from "next/link";
import { HeartHandshake, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMockStore } from "@/lib/hooks/use-mock-store";

export default function CaregiverProfilePage() {
  const { logout, user } = useAuth();
  const { db } = useMockStore();
  const caregiver = db.caregivers.find(c => c.email === user?.email) || db.caregivers[0];
  const patient = db.patients.find((item) => item.id === caregiver.patientId) || db.patients[0];

  return (
    <MobileShell role="caregiver" title="โปรไฟล์">
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-sky-700">
            <UserRound className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{caregiver.name}</h2>
            <p className="text-sm text-slate-500">{caregiver.relationship} ของ {patient.name}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <HeartHandshake className="h-5 w-5 text-emerald-600" />
          <div className="flex-1">
            <p className="font-bold">MCSI ล่าสุด {caregiver.mcsiScore}</p>
            <p className="text-sm text-slate-500">ติดตามภาระการดูแลและกำลังใจ</p>
          </div>
          <Button size="sm" asChild><Link href="/caregiver/burnout">ดู</Link></Button>
        </CardContent>
      </Card>

      <Button 
        className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-lg hover:shadow-red-500/25 active:scale-[0.98] transition-all duration-300 font-bold border-none py-3 h-12 flex items-center justify-center gap-2" 
        onClick={logout}
      >
        <LogOut className="h-5 w-5" />
        ออกจากระบบ
      </Button>
    </MobileShell>
  );
}
