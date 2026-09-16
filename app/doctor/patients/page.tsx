"use client";

import { useMemo, useState } from "react";
import { FileText, Search, ShieldPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { MultiMetricChart, TrendChart } from "@/components/health/charts";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { createDoctorRequest, publishCarePlan } from "@/lib/services/mock-store";
import { askAI } from "@/lib/services/ai/client";
import { formatThaiDate } from "@/lib/utils";

export default function DoctorPatientsPage() {
  const { db, setDb } = useMockStore();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(db.patients[0].id);
  const doctor = db.doctors[0];
  const patients = useMemo(
    () =>
      db.patients.filter((patient) =>
        `${patient.id} ${patient.citizenId} ${patient.name}`.toLowerCase().includes(query.toLowerCase())
      ),
    [db.patients, query]
  );
  const selected = db.patients.find((patient) => patient.id === selectedId) ?? patients[0];
  const records = db.healthRecords.filter((record) => record.patientId === selected.id);
  const plan = db.carePlans.find((item) => item.patientId === selected.id)!;
  const [draft, setDraft] = useState(plan.summary);
  const [rewriting, setRewriting] = useState(false);
  const consent = db.consents.find((item) => item.patientId === selected.id && item.doctorId === doctor.id);
  const approved = consent?.status === "approved" || selected.id === "P-0002";

  async function rewriteCarePlan() {
    setRewriting(true);
    try {
      const answer = await askAI(
        [
          "ตอบเป็นภาษาไทยในรูปแบบแผนดูแลที่บ้านสำหรับแพทย์ แบ่งหัวข้อ Medication, Diet, Exercise, Measurement Schedule, Follow-up, Lifestyle Advice",
          `ผู้ป่วย: ${selected.name}`,
          `Diagnosis: ${selected.diagnosis.join(", ")}`,
          `Medication: ${selected.medications.join(", ")}`,
          `ข้อมูลล่าสุด: BP ${records[records.length - 1]?.systolic}/${records[records.length - 1]?.diastolic}, Blood Sugar ${records[records.length - 1]?.bloodSugar}, Sleep ${records[records.length - 1]?.sleepHours}, Exercise ${records[records.length - 1]?.exerciseMinutes} นาที`,
          `ร่างเดิม: ${draft}`
        ].join("\n")
      );
      setDraft(answer);
    } catch (error) {
      setDraft(error instanceof Error ? `เรียกใช้งาน AI ไม่สำเร็จ: ${error.message}` : "เรียกใช้งาน AI ไม่สำเร็จ");
    } finally {
      setRewriting(false);
    }
  }

  return (
    <DoctorShell title="Patients">
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.6fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-sky-600" /> Patient Search</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา Patient ID, Citizen ID หรือชื่อ" />
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1 thin-scrollbar">
              {patients.map((patient) => {
                const patientConsent = db.consents.find((item) => item.patientId === patient.id && item.doctorId === doctor.id);
                const isPatientApproved = patientConsent?.status === "approved" || patient.id === "P-0002";
                return (
                  <button
                    key={patient.id}
                    onClick={() => {
                      setSelectedId(patient.id);
                      const nextPlan = db.carePlans.find((item) => item.patientId === patient.id);
                      setDraft(nextPlan?.summary ?? "");
                    }}
                    className="w-full rounded-2xl border bg-white p-4 text-left shadow-card transition hover:border-sky-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{patient.name}</p>
                        <p className="text-sm text-slate-500">{patient.id} · {patient.citizenId}</p>
                      </div>
                      <Badge tone={isPatientApproved ? "green" : patientConsent?.status === "rejected" ? "red" : "yellow"}>
                        {isPatientApproved ? "Approved" : patientConsent?.status === "rejected" ? "Rejected" : patientConsent ? "Waiting" : "No Request"}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{selected.name}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{selected.hospital} · {selected.diagnosis.join(" · ")}</p>
              </div>
              {approved ? (
                <Badge tone="green">Approved</Badge>
              ) : (
                <Button onClick={() => setDb((current) => createDoctorRequest(current, selected.id, doctor.id))}>
                  <ShieldPlus className="h-4 w-4" />
                  Request Access
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!approved ? (
                <div className="rounded-2xl bg-amber-50 p-5 text-amber-800">
                  แพทย์ยังดูเวชระเบียนไม่ได้จนกว่าผู้ป่วยจะอนุมัติคำขอเข้าถึงข้อมูล
                </div>
              ) : (
                <Tabs defaultValue="summary">
                  <TabsList>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="monitoring">Home Monitoring</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="careplan">AI Care Plan</TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="grid gap-4 lg:grid-cols-2">
                    {[
                      ["Personal Information", `${selected.gender} · อายุ ${selected.age} · Citizen ID ${selected.citizenId}`],
                      ["Diagnosis", selected.diagnosis.join(", ")],
                      ["Allergy", selected.allergies.join(", ")],
                      ["Medication", selected.medications.join(", ")],
                      ["Laboratory", "HbA1c 7.4%, eGFR 72, LDL 108"],
                      ["Caregiver Confirmation Status", `${records.filter((item) => item.confirmationStatus === "pending").length} pending`]
                    ].map(([title, text]) => (
                      <div key={title} className="rounded-2xl bg-sky-50 p-4">
                        <p className="font-bold">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="monitoring" className="space-y-4">
                    <MultiMetricChart records={records} />
                  </TabsContent>
                  <TabsContent value="timeline" className="space-y-3">
                    {records.slice(-8).reverse().map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded-2xl border bg-white p-4">
                        <div>
                          <p className="font-bold">{formatThaiDate(record.date)}</p>
                          <p className="text-sm text-slate-500">BP {record.systolic}/{record.diastolic} · BS {record.bloodSugar} · Sleep {record.sleepHours}</p>
                        </div>
                        <Badge tone={record.confirmationStatus === "confirmed" ? "green" : "yellow"}>{record.confirmationStatus}</Badge>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="careplan" className="space-y-4">
                    <div className="rounded-2xl bg-sky-50 p-4">
                      <p className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-sky-600" /> AI automatically generated draft</p>
                      <p className="mt-1 text-sm text-slate-500">Medication, Diet, Exercise, Measurement Schedule, Follow-up และ Lifestyle Advice</p>
                    </div>
                    <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
                    <div className="grid gap-3 lg:grid-cols-3">
                      <Button variant="outline" disabled={rewriting} onClick={rewriteCarePlan}>
                        {rewriting ? "กำลังประมวลผล..." : "ให้ AI ปรับปรุงแผน"}
                      </Button>
                      <Button variant="destructive" onClick={() => setDraft("")}>Delete</Button>
                      <Button onClick={() => setDb((current) => publishCarePlan(current, { ...plan, summary: draft }))}><FileText className="h-4 w-4" /> Approve & Publish</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DoctorShell>
  );
}
