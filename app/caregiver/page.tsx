"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, HeartPulse, Pill, Send, Droplets, Scale, Activity, Info, Target, Check, X, Calendar, Dumbbell, Utensils, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { MetricCard } from "@/components/health/metric-card";
import { EarlyWarningCard } from "@/components/health/early-warning-card";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { useAuth } from "@/lib/hooks/use-auth";
import { HospitalCampaignCarousel } from "@/components/health/hospital-carousel";
import { confirmTaskStatus } from "@/lib/services/mock-store";
import { cn } from "@/lib/utils";

export default function CaregiverHomePage() {
  const { db, setDb } = useMockStore();
  const { user } = useAuth();
  const caregiver = db.caregivers.find(c => c.email === user?.email) || db.caregivers[0];
  const patient = db.patients.find((item) => item.id === caregiver.patientId) || db.patients[0];
  const records = db.healthRecords.filter((item) => item.patientId === patient.id);
  const latest = records[records.length - 1] || {
    systolic: 120,
    diastolic: 80,
    bloodSugar: 95,
    heartRate: 72,
    weight: patient.weight || 70,
    height: patient.height || 170,
    sleepHours: 7.5,
    confirmationStatus: "confirmed"
  };
  const plan = db.carePlans.find((item) => item.patientId === patient.id) || {
    id: `plan-${patient.id}`,
    patientId: patient.id,
    doctorId: "demo-doctor",
    status: "approved",
    updatedAt: new Date().toISOString(),
    summary: "ควบคุมอาหารเค็มและน้ำตาลอย่างสม่ำเสมอ ออกกำลังกายเบาๆ",
    medication: ["Metformin 500mg (เช้า-เย็น หลังอาหาร)", "Amlodipine 5mg (เช้า หลังอาหาร)"],
    diet: ["ลดคาร์โบไฮเดรตเชิงเดี่ยว ชา กาแฟหวาน", "เน้นโปรตีนไขมันต่ำ ผักต้ม"],
    exercise: ["เดินเร็ว 30 นาทีต่อวัน", "สัปดาห์ละ 3-5 วัน"],
    measurement: ["วัดความดันทุกเช้าก่อนทานอาหาร", "เจาะระดับน้ำตาลสัปดาห์ละ 2 ครั้ง"],
    followUp: ["พบแพทย์เพื่อประเมินผลในอีก 2 เดือน"],
    lifestyle: ["นอนหลับพักผ่อนให้เพียงพอ 7-8 ชั่วโมง", "ดื่มน้ำสะอาดวันละ 8 แก้ว"],
    tasks: []
  };
  const warning = db.earlyWarnings.find((item) => item.patientId === patient.id) || {
    patientId: patient.id,
    level: "normal" as const,
    score: 0,
    reason: "กำลังวิเคราะห์ข้อมูลประวัติสุขภาพเริ่มต้น",
    patientRecommendation: "กรุณารอสักครู่ขณะเชื่อมโยงแผนการดูแลของท่าน",
    doctorRecommendation: "ไม่มีข้อควรระวังเร่งด่วนในขณะนี้",
    suggestedAction: "เฝ้าระวังต่อเนื่อง",
    updatedAt: new Date().toISOString()
  };
  const pending = records.filter((item) => item.confirmationStatus === "pending").slice(-3);

  const [activeTip, setActiveTip] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [actionTask, setActionTask] = useState<any | null>(null);

  // Dynamic calculations
  const height = latest.height || patient.height || 170;
  const bmiVal = parseFloat((latest.weight / Math.pow(height / 100, 2)).toFixed(1));

  // Risk evaluations
  const bpRisk: "green" | "yellow" | "orange" | "red" = 
    latest.systolic >= 140 || latest.diastolic >= 90 ? "red" :
    latest.systolic >= 120 || latest.diastolic >= 80 ? "yellow" : "green";

  const bsRisk: "green" | "yellow" | "orange" | "red" =
    latest.bloodSugar >= 126 ? "red" :
    latest.bloodSugar >= 100 ? "yellow" : "green";

  const bmiRisk: "green" | "yellow" | "orange" | "red" =
    bmiVal >= 25 ? "red" :
    bmiVal >= 23 || bmiVal < 18.5 ? "yellow" : "green";

  const hrRisk: "green" | "yellow" | "orange" | "red" =
    latest.heartRate > 100 || latest.heartRate < 60 ? "yellow" : "green";

  const getTaskCategoryStyle = (category: string) => {
    switch (category) {
      case "medication":
        return {
          bg: "bg-gradient-to-br from-purple-50/70 to-indigo-50/30 border-purple-100/70 shadow-sm",
          badgeBg: "bg-purple-200/50 text-purple-700",
          iconBg: "bg-purple-100 text-purple-700",
          icon: Pill
        };
      case "measurement":
        return {
          bg: "bg-gradient-to-br from-sky-50/70 to-blue-50/30 border-sky-100/70 shadow-sm",
          badgeBg: "bg-sky-200/50 text-sky-700",
          iconBg: "bg-sky-100 text-sky-700",
          icon: Activity
        };
      case "exercise":
        return {
          bg: "bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border-emerald-100/70 shadow-sm",
          badgeBg: "bg-emerald-200/50 text-emerald-700",
          iconBg: "bg-emerald-100 text-emerald-700",
          icon: Dumbbell
        };
      case "diet":
        return {
          bg: "bg-gradient-to-br from-amber-50/70 to-orange-50/30 border-amber-100/70 shadow-sm",
          badgeBg: "bg-amber-200/50 text-amber-700",
          iconBg: "bg-amber-100 text-amber-700",
          icon: Utensils
        };
      default:
        return {
          bg: "bg-gradient-to-br from-slate-50/70 to-slate-100/30 border-slate-200/70 shadow-sm",
          badgeBg: "bg-slate-200/50 text-slate-700",
          iconBg: "bg-slate-100 text-slate-700",
          icon: ShieldCheck
        };
    }
  };

  return (
    <MobileShell role="caregiver" title="WELLYNC">
      <Card className="bg-gradient-to-br from-sky-500 to-teal-400 text-white rounded-[2rem] overflow-hidden">
        <CardContent className="p-5">
          <p className="text-sm font-semibold opacity-90">ดูแลผู้ป่วย 1 คน</p>
          <h2 className="mt-1 text-2xl font-bold">{patient.name}</h2>
          <p className="mt-2 text-sm opacity-90">{patient.diagnosis.join(" · ")}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          title="ความดันล่าสุด"
          value={`${latest.systolic}/${latest.diastolic}`}
          unit="mmHg"
          icon={HeartPulse}
          riskLevel={bpRisk}
          onInfoClick={() => setActiveTip({
            title: "ความดันโลหิต (Blood Pressure)",
            content: (
              <>
                <p className="font-bold text-slate-800">เกณฑ์ระดับความดันโลหิต (mmHg):</p>
                <div className="grid grid-cols-1 gap-1.5 mt-2 text-xs">
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl font-bold">ปกติ: น้อยกว่า 120/80 mmHg</div>
                  <div className="p-2 bg-amber-50 text-amber-800 rounded-xl font-bold">เฝ้าระวัง: 120-139 / 80-89 mmHg</div>
                  <div className="p-2 bg-rose-50 text-rose-800 rounded-xl font-bold">เสี่ยงสูง (ความดันสูง): 140/90 mmHg ขึ้นไป</div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">* ควรตรวจวัดหลังจากนั่งพักร่างกายอย่างสงบแล้วอย่างน้อย 5 นาที</p>
              </>
            )
          })}
        />
        <MetricCard
          title="น้ำตาลล่าสุด"
          value={latest.bloodSugar}
          unit="mg/dL"
          icon={Droplets}
          riskLevel={bsRisk}
          onInfoClick={() => setActiveTip({
            title: "ระดับน้ำตาลในเลือด (Blood Sugar)",
            content: (
              <>
                <p className="font-bold text-slate-800">เกณฑ์ค่านั่งร้านน้ำตาล (mg/dL):</p>
                <div className="grid grid-cols-1 gap-1.5 mt-2 text-xs">
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl font-bold">ปกติ (ขณะอดอาหาร): 70 - 99 mg/dL</div>
                  <div className="p-2 bg-amber-50 text-amber-800 rounded-xl font-bold">เฝ้าระวัง (เสี่ยงเบาหวาน): 100 - 125 mg/dL</div>
                  <div className="p-2 bg-rose-50 text-rose-800 rounded-xl font-bold">เสี่ยงสูง (โรคเบาหวาน): 126 mg/dL ขึ้นไป</div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">* การตรวจควรอดอาหารและเครื่องดื่มอย่างน้อย 8 ชั่วโมงก่อนวัด</p>
              </>
            )
          })}
        />
        <MetricCard
          title="ดัชนีมวลกาย"
          value={bmiVal}
          unit="kg/m²"
          icon={Scale}
          riskLevel={bmiRisk}
          onInfoClick={() => setActiveTip({
            title: "ดัชนีมวลกาย (BMI)",
            content: (
              <>
                <p className="font-bold text-slate-800">เกณฑ์ดัชนีมวลกาย (BMI) สำหรับชาวเอเชีย:</p>
                <div className="grid grid-cols-1 gap-1.5 mt-2 text-xs">
                  <div className="p-2 bg-sky-50 text-sky-800 rounded-xl font-bold">น้ำหนักต่ำกว่าเกณฑ์: ต่ำกว่า 18.5</div>
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl font-bold">สมส่วน/ปกติ: 18.5 - 22.9</div>
                  <div className="p-2 bg-amber-50 text-amber-800 rounded-xl font-bold">น้ำหนักเกิน (เฝ้าระวัง): 23.0 - 24.9</div>
                  <div className="p-2 bg-rose-50 text-rose-800 rounded-xl font-bold">โรคอ้วน (เสี่ยงสูง): 25.0 ขึ้นไป</div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">* คำนวณจาก: น้ำหนักตัว (กิโลกรัม) หารด้วย ส่วนสูงยกกำลังสอง (เมตร²)</p>
              </>
            )
          })}
        />
        <MetricCard
          title="ชีพจร"
          value={latest.heartRate}
          unit="bpm"
          icon={Activity}
          riskLevel={hrRisk}
          onInfoClick={() => setActiveTip({
            title: "อัตราเต้นของหัวใจ (Heart Rate)",
            content: (
              <>
                <p className="font-bold text-slate-800">เกณฑ์อัตราชีพจรเต้นขณะพัก (bpm):</p>
                <div className="grid grid-cols-1 gap-1.5 mt-2 text-xs">
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl font-bold">ปกติขณะพัก: 60 - 100 ครั้งต่อนาที</div>
                  <div className="p-2 bg-amber-50 text-amber-800 rounded-xl font-bold">เฝ้าระวังเต้นช้า: ต่ำกว่า 60 ครั้งต่อนาที</div>
                  <div className="p-2 bg-rose-50 text-rose-800 rounded-xl font-bold">เฝ้าระวังเต้นเร็ว: สูงกว่า 100 ครั้งต่อนาที</div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">* ตรวจวัดขณะนั่งพักสบายใจ ปราศจากความเครียดและความเหนื่อยล้า</p>
              </>
            )
          })}
        />
      </div>

      {/* Treatment Target Section (Larger Post-it Carousel) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[15px] font-extrabold text-slate-555 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="h-4 w-4 text-sky-600 animate-pulse" />
            เป้าหมายการดูแลสุขภาพของคนไข้
          </h3>
        </div>

        <div
          className="flex overflow-x-auto gap-6 px-2 pb-5 pt-2 scroll-smooth snap-x snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Post-it 1: Sugar */}
          <div className="w-[300px] shrink-0 snap-start relative pt-3">
            {/* Masking Tape */}
            <div className="w-16 h-5 bg-white/40 backdrop-blur-[0.5px] border border-white/20 rotate-[-2deg] absolute top-1 left-1/2 -translate-x-1/2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10" />
            
            {/* Paper Note */}
            <div className="rotate-[-1.5deg] bg-[#e0f2fe] p-5 pb-3.5 shadow-[3px_6px_14px_rgba(0,0,0,0.08)] rounded-[2px] flex flex-col justify-between h-[155px] text-slate-800 border-l-[3.5px] border-sky-300">
              <div>
                <span className="text-[10px] font-black text-sky-700 bg-sky-200/50 px-2.5 py-0.5 rounded uppercase tracking-wider">เป้าหมายน้ำตาล</span>
                <p className="text-xs text-slate-700 mt-3 leading-relaxed font-semibold">
                  ค่าน้ำตาลเจาะจากปลายนิ้วตอนเช้าก่อนทานอาหาร ควรคุมให้อยู่ในช่วง <span className="font-black text-sky-900 text-[13px]">80 ถึง 130 mg/dL</span>
                </p>
              </div>
              <div className="text-[10px] font-bold text-sky-700/80 border-t border-sky-300/30 pt-2 flex justify-between">
                <span>ค่าน้ำตาลสะสมเฉลี่ยในร่างกาย:</span>
                <span className="font-extrabold text-sky-900">น้อยกว่า 7%</span>
              </div>
            </div>
          </div>

          {/* Post-it 2: BP */}
          <div className="w-[300px] shrink-0 snap-start relative pt-3">
            {/* Masking Tape */}
            <div className="w-16 h-5 bg-white/40 backdrop-blur-[0.5px] border border-white/20 rotate-[3deg] absolute top-1 left-1/2 -translate-x-1/2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10" />
            
            {/* Paper Note */}
            <div className="rotate-[1deg] bg-[#e0f2fe] p-5 pb-3.5 shadow-[3px_6px_14px_rgba(0,0,0,0.08)] rounded-[2px] flex flex-col justify-between h-[155px] text-slate-800 border-l-[3.5px] border-sky-300">
              <div>
                <span className="text-[10px] font-black text-sky-700 bg-sky-200/50 px-2.5 py-0.5 rounded uppercase tracking-wider">เป้าหมายความดัน</span>
                <p className="text-xs text-slate-700 mt-3 leading-relaxed font-semibold">
                  คุมความดันโลหิตให้อยู่ในเกณฑ์ที่ปลอดภัย <span className="font-black text-sky-900 text-[13px]">ต่ำกว่า 130/80 mmHg</span>
                </p>
              </div>
              <div className="text-[10px] font-bold text-sky-700/80 border-t border-sky-300/30 pt-2 flex justify-between">
                <span>เป้าหมายเพื่อป้องกัน:</span>
                <span className="font-extrabold text-sky-900">โรคแทรกซ้อนหลอดเลือด</span>
              </div>
            </div>
          </div>

          {/* Post-it 3: Exercise */}
          <div className="w-[300px] shrink-0 snap-start relative pt-3">
            {/* Masking Tape */}
            <div className="w-16 h-5 bg-white/40 backdrop-blur-[0.5px] border border-white/20 rotate-[-1deg] absolute top-1 left-1/2 -translate-x-1/2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10" />
            
            {/* Paper Note */}
            <div className="rotate-[-1deg] bg-[#e0f2fe] p-5 pb-3.5 shadow-[3px_6px_14px_rgba(0,0,0,0.08)] rounded-[2px] flex flex-col justify-between h-[155px] text-slate-850 border-l-[3.5px] border-sky-300">
              <div>
                <span className="text-[10px] font-black text-sky-700 bg-sky-200/50 px-2.5 py-0.5 rounded uppercase tracking-wider">เป้าหมายกิจกรรม</span>
                <p className="text-xs text-slate-700 mt-3 leading-relaxed font-semibold">
                  ออกกำลังกายเบาๆ เช่น เดินเร็วสะสมความเหนื่อยให้ได้ <span className="font-black text-sky-900 text-[13px]">150 นาทีต่อสัปดาห์</span>
                </p>
              </div>
              <div className="text-[10px] font-bold text-sky-700/80 border-t border-sky-300/30 pt-2 flex justify-between">
                <span>คำแนะนำแพทย์:</span>
                <span className="font-extrabold text-sky-900">เฉลี่ยวันละ 30 นาที 5 วัน</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal & Creative Vertical Timeline Checklist */}
      <Card className="border border-slate-100 shadow-soft">
        <CardHeader className="flex-row items-center justify-between pb-3 bg-slate-50/20 border-b border-slate-100/50">
          <div>
            <CardTitle className="text-[14px] font-bold text-slate-800 uppercase tracking-wide">
              งานดูแลวันนี้ของ {patient.name}
            </CardTitle>
            <p className="text-[10px] text-slate-400 font-medium">อนุมัติหรือตรวจสอบบันทึกกิจกรรมของคนไข้ในความดูแล</p>
          </div>
          <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100/70">
            สำเร็จ {plan.tasks.filter((t) => t.status === "completed").length}/{plan.tasks.length}
          </span>
        </CardHeader>
        <CardContent className="p-4 pt-5 space-y-5">
          {plan.tasks.map((task, index) => {
            const isCompleted = task.status === "completed";
            const isSkipped = task.status === "skipped";
            const isCannot = task.status === "cannot";
            const isPending = task.status === "pending";
            const hasAction = !!task.pendingConfirm || isPending;

            // Determine indicator node color and contents
            let dotBorder = "border-slate-300";
            let dotBg = "bg-white";
            let dotIcon = null;

            if (isCompleted) {
              dotBorder = "border-emerald-500";
              dotBg = "bg-emerald-500";
              dotIcon = <Check className="h-2.5 w-2.5 text-white stroke-[3]" />;
            } else if (isSkipped) {
              dotBorder = "border-amber-500";
              dotBg = "bg-amber-500";
              dotIcon = <RotateCcw className="h-2.5 w-2.5 text-white stroke-[3]" />;
            } else if (isCannot) {
              dotBorder = "border-rose-500";
              dotBg = "bg-rose-500";
              dotIcon = <X className="h-2.5 w-2.5 text-white stroke-[3]" />;
            } else if (task.pendingConfirm) {
              dotBorder = "border-amber-455";
              dotBg = "bg-amber-100";
            } else {
              dotBorder = "border-sky-400";
            }

            return (
              <div 
                key={task.id} 
                className={cn(
                  "relative flex items-start gap-4 transition-all duration-200 p-2 rounded-2xl -mx-2 hover:bg-slate-50/50",
                  hasAction && "cursor-pointer active:bg-slate-50"
                )}
                onClick={() => hasAction && setActionTask(task)}
              >
                {/* Vertical connecting line */}
                {index < plan.tasks.length - 1 && (
                  <div className="absolute left-[17px] top-7 bottom-[-20px] w-[2px] bg-slate-100" />
                )}

                {/* Checklist Bullet Node */}
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-colors duration-200 mt-0.5 ml-2",
                  dotBorder,
                  dotBg
                )}>
                  {dotIcon}
                </div>

                {/* Content Details */}
                <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      <span className="text-[10px] font-semibold text-slate-400 mr-1.5">{task.time} น.</span>
                      {task.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate font-medium">
                      {task.detail}
                    </p>
                  </div>

                  {/* Actions / Status Badge */}
                  <div className="shrink-0 flex items-center pr-2">
                    {task.pendingConfirm ? (
                      <span className="text-[10px] font-extrabold text-white bg-amber-600 px-3 py-1 rounded-full shadow-sm hover:bg-amber-700 active:scale-95 transition-all select-none">
                        กดยืนยัน
                      </span>
                    ) : isPending ? (
                      <span className="text-[10px] font-extrabold text-white bg-slate-700 px-3 py-1 rounded-full shadow-sm hover:bg-slate-800 active:scale-95 transition-all select-none flex items-center gap-1">
                        <Send className="h-2.5 w-2.5" /> กดเตือน
                      </span>
                    ) : (
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide",
                        isCompleted && "bg-emerald-50 text-emerald-700 border-emerald-100",
                        isSkipped && "bg-amber-50 text-amber-700 border-amber-100",
                        isCannot && "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        {isCompleted ? "ทำแล้ว" : isSkipped ? "ข้าม" : "ไม่ได้"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>รอยืนยันข้อมูล</CardTitle>
          <Button size="sm" asChild><Link href="/caregiver/patients">ตรวจสอบ</Link></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length ? pending.map((record) => (
            <div key={record.id} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              BP {record.systolic}/{record.diastolic} · น้ำตาล {record.bloodSugar}
            </div>
          )) : <p className="text-sm text-slate-500">ไม่มีข้อมูลค้างยืนยัน</p>}
        </CardContent>
      </Card>

      <EarlyWarningCard warning={warning} />

      <HospitalCampaignCarousel />

      {/* Large Target Action Bottom Sheet for Caregiver checklist actions */}
      {actionTask && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setActionTask(null)}
        >
          <div
            className="w-full max-w-md rounded-t-[2.5rem] bg-white p-6 pb-8 shadow-2xl transition-transform duration-300 translate-y-0 border-t border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <h3 className="text-base font-extrabold text-slate-800 text-center mb-1">
              ยืนยันกิจกรรมดูแลคนไข้
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5 font-semibold">
              {actionTask.title} ({actionTask.time} น.)
            </p>

            <div className="space-y-3">
              {actionTask.pendingConfirm ? (
                <>
                  <Button
                    variant="success"
                    className="w-full h-12 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2"
                    onClick={() => {
                      setDb((current) => confirmTaskStatus(current, plan.id, actionTask.id, true));
                      setActionTask(null);
                    }}
                  >
                    <Check className="h-4 w-4" /> อนุมัติบันทึกกิจกรรม
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full h-12 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2"
                    onClick={() => {
                      setDb((current) => confirmTaskStatus(current, plan.id, actionTask.id, false));
                      setActionTask(null);
                    }}
                  >
                    <X className="h-4 w-4" /> ปฏิเสธการบันทึก
                  </Button>
                </>
              ) : (
                actionTask.status === "pending" && (
                  <Button
                    variant="default"
                    className="w-full h-12 rounded-2xl text-sm font-extrabold bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center gap-2"
                    onClick={() => {
                      toast.success(`ส่ง Push Notification เตือน '${actionTask.title}' ไปยังคนไข้แล้ว`);
                      setActionTask(null);
                    }}
                  >
                    <Send className="h-4 w-4" /> ส่งคำสั่งแจ้งเตือนคนไข้
                  </Button>
                )
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full mt-4 h-10 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-650"
              onClick={() => setActionTask(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {/* Info popover modal */}
      {activeTip && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setActiveTip(null)}
        >
          <div
            className="w-full max-w-md rounded-t-[2.5rem] bg-white p-6 pb-8 shadow-2xl transition-transform duration-300 translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-sky-600" />
              {activeTip.title}
            </h3>
            <div className="space-y-3 text-sm leading-relaxed text-slate-600">
              {activeTip.content}
            </div>
            <Button className="w-full mt-6 rounded-2xl py-3 text-sm font-bold" onClick={() => setActiveTip(null)}>
              เข้าใจแล้ว
            </Button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
