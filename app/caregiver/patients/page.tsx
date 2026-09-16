"use client";

import Link from "next/link";
import { Activity, Check, HeartPulse, X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { MultiMetricChart } from "@/components/health/charts";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { updateRecordStatus, confirmTaskStatus } from "@/lib/services/mock-store";
import { formatThaiDate } from "@/lib/utils";

import { useAuth } from "@/lib/hooks/use-auth";

export default function CaregiverPatientPage() {
  const { db, setDb } = useMockStore();
  const { user } = useAuth();
  const caregiver = db.caregivers.find(c => c.email === user?.email) || db.caregivers[0];
  const patient = db.patients.find((item) => item.id === caregiver.patientId) || db.patients[0];
  const records = db.healthRecords.filter((item) => item.patientId === patient.id);
  const pending = records.filter((item) => item.confirmationStatus === "pending").slice(-6).reverse();
  const pendingTasks = db.carePlans
    .filter((p) => p.patientId === patient.id)
    .flatMap((p) =>
      p.tasks
        .filter((t) => t.pendingConfirm)
        .map((t) => ({ ...t, planId: p.id }))
    );

  return (
    <MobileShell role="caregiver" title="ผู้ป่วย">
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <HeartPulse className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{patient.name}</h2>
            <p className="text-sm text-slate-500">{patient.diagnosis.join(" · ")}</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant Banner - moved here from caregiver bottom navbar */}
      <Card className="bg-gradient-to-r from-sky-500 to-indigo-500 text-white border-none shadow-sm rounded-3xl overflow-hidden relative">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 -translate-y-8 translate-x-8 blur-xl" />
        <CardContent className="flex items-center justify-between p-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-md shrink-0">
              <Bot className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-xs font-black">วิเคราะห์อาการกับผู้ช่วย AI</p>
              <p className="text-[10px] text-white/80 mt-0.5">ปรึกษาแพทย์ปัญญาประดิษฐ์จำลองเกี่ยวกับแผนการดูแลคนไข้</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" asChild className="rounded-xl font-bold text-sky-700 bg-white hover:bg-sky-50 shrink-0">
            <Link href="/caregiver/ai">เริ่มสนทนา</Link>
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="monitoring">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="confirm">ยืนยัน</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="monitoring" className="space-y-4">
          <MultiMetricChart records={records} />
        </TabsContent>
        <TabsContent value="confirm" className="space-y-4">
          {/* Health Records Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-wider">บันทึกระดับสัญญาณชีพค้างอนุมัติ ({pending.length})</h4>
            {pending.length ? pending.map((record) => (
              <Card key={record.id} className="border border-sky-50 shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {record.confirmationStatus === "pending" && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                        <p className="font-bold text-slate-800">BP {record.systolic}/{record.diastolic} · น้ำตาล {record.bloodSugar}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{formatThaiDate(record.date)} · บันทึกโดยผู้ป่วย</p>
                    </div>
                    <Badge tone="yellow">รอยืนยัน</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="success" size="sm" onClick={() => setDb((current) => updateRecordStatus(current, record.id, "confirmed"))}><Check className="h-4 w-4" /> ยืนยันผล</Button>
                    <Button variant="outline" size="sm" onClick={() => setDb((current) => updateRecordStatus(current, record.id, "rejected"))}><X className="h-4 w-4" /> ปฏิเสธ</Button>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                ไม่มีข้อมูลสัญญาณชีพค้างอนุมัติ
              </div>
            )}
          </div>

          {/* Care Plan Checklist Section */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-wider">การปฏิบัติงานตามแผนค้างอนุมัติ ({pendingTasks.length})</h4>
            {pendingTasks.length ? pendingTasks.map((task) => (
              <Card key={task.id} className="border border-sky-50 shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {task.pendingConfirm && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                        <p className="font-bold text-slate-800">{task.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{task.time} · {task.detail}</p>
                    </div>
                    <Badge tone="yellow">
                      รอยืนยัน ({task.pendingConfirm === "completed" ? "ทำแล้ว" : task.pendingConfirm === "skipped" ? "ข้าม" : "ทำไม่ได้"})
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="success" size="sm" onClick={() => setDb((current) => confirmTaskStatus(current, task.planId, task.id, true))}><Check className="h-4 w-4" /> อนุมัติ</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDb((current) => confirmTaskStatus(current, task.planId, task.id, false))}><X className="h-4 w-4" /> ปฏิเสธ</Button>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                ไม่มีกิจกรรมของคนไข้ค้างอนุมัติ
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="timeline" className="space-y-3">
          {records.slice(-10).reverse().map((record) => (
            <div key={record.id} className="flex gap-3 rounded-2xl bg-white p-4 shadow-card">
              <Activity className="mt-1 h-5 w-5 text-sky-600" />
              <div>
                <p className="font-bold">{formatThaiDate(record.date)}</p>
                <p className="text-sm text-slate-500">BP {record.systolic}/{record.diastolic}, น้ำตาล {record.bloodSugar}, ยา {record.medicationTaken ? "ครบ" : "ขาด"}</p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </MobileShell>
  );
}
