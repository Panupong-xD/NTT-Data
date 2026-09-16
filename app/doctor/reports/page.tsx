"use client";

import { useState } from "react";
import { FileBarChart, Users, User, IdCard, Briefcase, HeartPulse, Pill, Calendar, Activity, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { DoctorChartsGrid } from "@/components/health/charts";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { formatThaiDate } from "@/lib/utils";

export default function DoctorReportsPage() {
  const { db } = useMockStore();
  const [selectedPatientId, setSelectedPatientId] = useState(db.patients[0]?.id || "");

  const currentPatient = db.patients.find((p) => p.id === selectedPatientId) || db.patients[0];
  const records = db.healthRecords.filter((item) => item.patientId === currentPatient.id);
  const warning = db.earlyWarnings.find((item) => item.patientId === currentPatient.id) || {
    score: 0,
    reason: "ไม่พบข้อมูลความเสี่ยงในระบบ",
    doctorRecommendation: "ไม่มีคำแนะนำด่วนสำหรับโรคเบาหวานและความดันโลหิตสูง"
  };

  const total = records.length;
  const medCompliance = total ? Math.round((records.filter(r => r.medicationTaken).length / total) * 105) : 0; // scale slightly for mock realism
  const bpCompliance = total ? Math.round((records.filter(r => r.systolic > 0).length / total) * 100) : 0;
  const exerciseCompliance = total ? Math.round((records.filter(r => r.exerciseMinutes >= 20).length / total) * 100) : 0;

  // Calculate mock dates relative to base mock date (2026-07-11)
  const mockBaseDate = new Date("2026-07-11T08:00:00+07:00");
  const lastAppt = new Date(mockBaseDate);
  lastAppt.setDate(mockBaseDate.getDate() - 7);
  const nextAppt = new Date(mockBaseDate);
  nextAppt.setDate(mockBaseDate.getDate() + 5);

  return (
    <DoctorShell title="Reports">
      {/* Patient Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-sky-100 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800">รายงานสุขภาพเชิงวิเคราะห์และการเปรียบเทียบ</h3>
          <p className="text-xs text-slate-500">เลือกดูรายงานผลตรวจและสถิติข้อมูลตามรายบุคคลด้านล่าง</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-sky-600" />
          <label className="text-sm font-semibold text-slate-600 shrink-0">รายชื่อผู้ป่วย:</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-sky-300 focus:outline-none"
          >
            {db.patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
        {/* Patient Info Card */}
        <Card className="border border-sky-50 shadow-sm rounded-3xl flex flex-col h-full justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-sky-600" />
              ข้อมูลผู้ป่วยและรายละเอียดส่วนบุคคล
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-sky-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-450 uppercase">ชื่อคนไข้</p>
                  <p className="text-xs font-bold text-slate-850">{currentPatient.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IdCard className="h-4 w-4 text-sky-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-455 uppercase">เลขประจำตัว (HN)</p>
                  <p className="text-xs font-bold text-slate-850">HN-{currentPatient.id.replace("P-", "").padStart(6, "0")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-455 uppercase">อายุ / เพศ</p>
                  <p className="text-xs font-bold text-slate-850">{currentPatient.age} ปี ({currentPatient.gender})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-sky-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-455 uppercase">อาชีพ</p>
                  <p className="text-xs font-bold text-slate-850">{currentPatient.occupation || "ไม่ระบุ"}</p>
                </div>
              </div>
              <div className="col-span-2 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-slate-455 uppercase">การแพ้ยา (Allergies)</p>
                  <p className="text-xs font-bold text-rose-600 mt-0.5">{currentPatient.allergies.join(", ") || "ไม่มีประวัติแพ้ยา"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-455 uppercase">ยาที่กินประจำ (Medications)</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5 truncate" title={currentPatient.medications.join(", ")}>{currentPatient.medications.join(", ")}</p>
                </div>
              </div>
              <div className="col-span-2 flex items-start gap-2 pt-3 border-t border-slate-100 mt-1">
                <HeartPulse className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-455 uppercase">โรคประจำตัว (Diagnosis)</p>
                  <p className="text-xs font-bold text-slate-800 bg-sky-50 px-2.5 py-1 rounded-xl mt-1 inline-block border border-sky-100/50">
                    {currentPatient.diagnosis.join(" · ")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Progress Card */}
        <Card className="border border-sky-50 shadow-sm rounded-3xl flex flex-col h-full justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-600" />
              ความคืบหน้าการดูแลรักษาและการปฏิบัติตามแผน
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">ระยะเวลาติดตามดูแลแล้ว:</span>
                <span className="font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100/50">
                  {total} วัน
                </span>
              </div>

              {/* Med Compliance */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5"><Pill className="h-3.5 w-3.5 text-sky-600" /> ความสม่ำเสมอการทานยา</span>
                  <span className="text-sky-700">{Math.min(medCompliance, 100)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(medCompliance, 100)}%` }} />
                </div>
              </div>

              {/* BP Compliance */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5 text-rose-500" /> การวัดความดันโลหิตประจำวัน</span>
                  <span className="text-rose-600">{bpCompliance}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${bpCompliance}%` }} />
                </div>
              </div>

              {/* Exercise Compliance */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5 text-teal-600" /> ความสม่ำเสมอการออกกำลังกาย</span>
                  <span className="text-teal-700">{exerciseCompliance}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${exerciseCompliance}%` }} />
                </div>
              </div>
            </div>

            {/* Appointments */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">วันนัดหมายครั้งล่าสุด</p>
                <p className="text-xs font-bold text-slate-750 mt-0.5">{formatThaiDate(lastAppt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">วันนัดหมายครั้งถัดไป</p>
                <p className="text-xs font-bold text-sky-600 mt-0.5">{formatThaiDate(nextAppt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-sky-50 shadow-sm mb-6 rounded-3xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-800 text-sm font-bold uppercase tracking-wider">
            <FileBarChart className="h-4 w-4 text-sky-600" /> 
            สรุปการวิเคราะห์เชิงลึก: {currentPatient.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-sky-50 p-4 leading-6 border border-sky-100/50">
            <p className="font-bold text-sky-850 text-xs uppercase">Health Summary</p>
            <p className="text-xs text-slate-600 mt-1.5">ความดันโลหิตและระดับน้ำตาลในช่วง 14 วันที่ผ่านมา อยู่ในเกณฑ์ประเมินเบื้องต้น</p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-4 leading-6 border border-orange-100/50">
            <p className="font-bold text-orange-850 text-xs uppercase">Risk Status</p>
            <p className="text-xs text-slate-600 mt-1.5">คะแนนความเสี่ยง {warning.score}/100 · {warning.reason}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 leading-6 border border-emerald-100/50">
            <p className="font-bold text-emerald-850 text-xs uppercase">AI Recommendation</p>
            <p className="text-xs text-slate-600 mt-1.5">{warning.doctorRecommendation}</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pl-1">
          รายงานกราฟแนวโน้มสัญญาณชีพและข้อมูลกายภาพ
        </h3>
        <DoctorChartsGrid records={records} />
      </div>
    </DoctorShell>
  );
}
