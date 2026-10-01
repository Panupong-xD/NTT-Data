"use client";

import { useState } from "react";
import { Cloud, Database, User, Activity, BellRing, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoctorShell } from "@/components/layouts/doctor-shell";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DoctorSettingsPage() {
  const { db, setDb } = useMockStore();
  const doctor = db.doctors[0] || {
    id: "DOC-1",
    name: "นพ. ภูมิภัทร รักษาดี",
    specialty: "อายุรศาสตร์โรคหัวใจและหลอดเลือด",
    hospital: "โรงพยาบาลมหาวิทยาลัย",
    email: "doctor@gmail.com"
  };

  // State for Doctor Profile Settings
  const [name, setName] = useState(doctor.name);
  const [specialty, setSpecialty] = useState(doctor.specialty);
  const [hospital, setHospital] = useState(doctor.hospital);
  const [email, setEmail] = useState(doctor.email);

  // State for Clinical Settings / Targets
  const [sysLimit, setSysLimit] = useState("135");
  const [diaLimit, setDiaLimit] = useState("85");
  const [sugarLimit, setSugarLimit] = useState("140");

  // State for Notification Toggles
  const [emailAlert, setEmailAlert] = useState(true);
  const [smsAlert, setSmsAlert] = useState(false);

  function handleSaveProfile() {
    setDb((current) => ({
      ...current,
      doctors: current.doctors.map((d) =>
        d.id === doctor.id ? { ...d, name, specialty, hospital, email } : d
      )
    }));
    toast.success("บันทึกข้อมูลโปรไฟล์แพทย์เรียบร้อยแล้ว");
  }

  function handleSaveClinical() {
    toast.success("บันทึกเกณฑ์และเป้าหมายการรักษาเรียบร้อยแล้ว");
  }

  const resources = ["Patient", "Observation", "Medication", "Condition", "Encounter", "CarePlan", "Consent"];

  return (
    <DoctorShell title="Settings">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Doctor Profile & Clinical Target Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <User className="h-5 w-5 text-sky-600" />
                ข้อมูลโปรไฟล์แพทย์ (Profile Settings)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">ชื่อ-นามสกุล แพทย์</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="นพ. สมเจตน์ มุ่งมั่น" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">อีเมลติดต่อ</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@gmail.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">ความเชี่ยวชาญพิเศษ</label>
                  <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="ต่อมไร้ท่อและเมตาบอลิซึม" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">โรงพยาบาล/สถาบัน</label>
                  <Input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="โรงพยาบาลศิริราช" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSaveProfile} 
                  className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md hover:shadow-indigo-500/20 active:scale-[0.98] transition-all rounded-2xl flex items-center gap-2 border-none"
                >
                  <Save className="h-4 w-4" />
                  บันทึกโปรไฟล์
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Clinical Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Activity className="h-5 w-5 text-sky-600" />
                เกณฑ์เป้าหมายและการแจ้งเตือน (Clinical Target Limits)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-500">
                กำหนดค่าขีดจำกัดวิกฤตของสัญญาณชีพ เมื่อผู้ป่วยบันทึกค่าที่เกินระดับนี้ ระบบจะสร้างสัญญาณเตือนภัย (Early Warning) ไปยังแพทย์และผู้ดูแลทันที
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">ความดันตัวบน (SYS) วิกฤต</label>
                  <Input value={sysLimit} onChange={(e) => setSysLimit(e.target.value)} type="number" placeholder="135" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">ความดันตัวล่าง (DIA) วิกฤต</label>
                  <Input value={diaLimit} onChange={(e) => setDiaLimit(e.target.value)} type="number" placeholder="85" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 pl-1">น้ำตาลในเลือดวิกฤต (mg/dL)</label>
                  <Input value={sugarLimit} onChange={(e) => setSugarLimit(e.target.value)} type="number" placeholder="140" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSaveClinical} 
                  className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md hover:shadow-indigo-500/20 active:scale-[0.98] transition-all rounded-2xl flex items-center gap-2 border-none"
                >
                  <Save className="h-4 w-4" />
                  บันทึกเป้าหมายทางคลินิก
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Connection and Simulated Cloud Systems */}
        <div className="space-y-6">
          {/* Notifications config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <BellRing className="h-5 w-5 text-sky-600" />
                การแจ้งเตือนแพทย์
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-1">
                <div>
                  <p className="text-sm font-bold text-slate-700">ส่งอีเมลด่วน (Real-time Email)</p>
                  <p className="text-xs text-slate-500">แจ้งเตือนเมือสัญญาณชีพผู้ป่วยเข้าสู่โซนสีส้ม/สีแดง</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlert}
                  onChange={(e) => setEmailAlert(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center justify-between p-1">
                <div>
                  <p className="text-sm font-bold text-slate-700">ส่งข้อความ SMS (SMS Alert)</p>
                  <p className="text-xs text-slate-500">สำหรับเคสระดับสีแดงความเสี่ยงสูงฉุกเฉิน</p>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlert}
                  onChange={(e) => setSmsAlert(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* WELLYNC Cloud Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Cloud className="h-5 w-5 text-sky-600" />
                WELLYNC Cloud
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-600 space-y-3">
              <p>
                เชื่อมต่อระบบสำรองข้อมูลทางการแพทย์ผ่าน **Wellync** ซึ่งได้รับการปกป้องระดับมาตรฐานความปลอดภัยโรงพยาบาลระดับสูง
              </p>
              <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-700 font-semibold border border-sky-100 flex justify-between items-center">
                <span>สถานะการซิงค์:</span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  เชื่อมต่อและเข้ารหัสแบบคู่ขนาน
                </span>
              </div>
            </CardContent>
          </Card>

          {/* FHIR Mock database layout info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Database className="h-5 w-5 text-sky-600" />
                HL7 FHIR Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                จำลองชั้นการจัดเก็บข้อมูลตามสถาปัตยกรรม HL7 FHIR สำหรับการต่อประสานเข้ากับระบบ HIS ของโรงพยาบาลหลักในอนาคต:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resources.map((resource) => (
                  <span key={resource} className="rounded-full bg-sky-50 border border-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                    {resource}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DoctorShell>
  );
}
