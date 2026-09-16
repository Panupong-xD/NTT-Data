"use client";

import { useState } from "react";
import { HeartHandshake, SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendChart } from "@/components/health/charts";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { toast } from "sonner";

import { useAuth } from "@/lib/hooks/use-auth";

export default function BurnoutPage() {
  const { db, setDb } = useMockStore();
  const { user } = useAuth();
  const caregiver = db.caregivers.find(c => c.email === user?.email) || db.caregivers[0];
  const [score, setScore] = useState(caregiver.mcsiScore);
  const level = score > 26 ? "สูง" : score > 15 ? "ปานกลาง" : "ต่ำ";
  const records = db.healthRecords.filter((item) => item.patientId === caregiver.patientId);

  function handleSave() {
    setDb((current) => ({
      ...current,
      caregivers: current.caregivers.map((c) =>
        c.id === caregiver.id ? { ...c, mcsiScore: score } : c
      )
    }));
    toast.success("บันทึกผลการประเมิน MCSI เรียบร้อยแล้ว");
  }

  return (
    <MobileShell role="caregiver" title="Burnout Support">
      <Card className="bg-gradient-to-br from-emerald-400 to-sky-500 text-white">
        <CardContent className="p-5">
          <p className="text-sm font-semibold opacity-90">Weekly MCSI Questionnaire</p>
          <p className="mt-2 text-5xl font-bold">{score}</p>
          <p className="mt-1 font-semibold">Burnout Level: {level}</p>
          <Progress className="mt-4 bg-white/25" value={(score / 36) * 100} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>แบบประเมินรายสัปดาห์</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {["รู้สึกเหนื่อยจากงานดูแล", "มีเวลาพักเพียงพอ", "กังวลเรื่องอาการผู้ป่วย"].map((question, index) => (
            <div key={question}>
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>{question}</span>
                <span>{index + 2}/5</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                defaultValue={index + 2}
                className="w-full accent-sky-500"
                onChange={(event) => setScore(8 + Number(event.target.value) * 4)}
              />
            </div>
          ))}
          <Button className="w-full" onClick={handleSave}><SmilePlus className="h-5 w-5" /> บันทึกการประเมิน</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-emerald-600" /> Emotional Support</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {["แบ่งงานเตือนยาให้ระบบ Push ช่วย", "พักหายใจลึก 3 นาทีหลังมื้อกลางวัน", "วันนี้คุณช่วยผู้ป่วยได้ครบถ้วนแล้ว"].map((item) => (
            <div key={item} className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{item}</div>
          ))}
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>History</CardTitle></CardHeader><CardContent><TrendChart records={records} type="sleep" /></CardContent></Card>
    </MobileShell>
  );
}
