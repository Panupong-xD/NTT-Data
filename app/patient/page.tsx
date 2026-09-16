"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, CalendarClock, Droplets, HeartPulse, Pill, Scale, ShieldCheck, Info, Target, Check, CircleSlash, RotateCcw, CalendarCheck, CheckCircle2, AlertCircle, Dumbbell, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { MetricCard } from "@/components/health/metric-card";
import { EarlyWarningCard } from "@/components/health/early-warning-card";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { formatThaiDate, cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";
import { HospitalCampaignCarousel } from "@/components/health/hospital-carousel";
import { proposeTaskStatus } from "@/lib/services/mock-store";

export default function PatientHomePage() {
  const { db, setDb } = useMockStore();
  const { user } = useAuth();
  const patient = db.patients.find((item) => item.email === user?.email) || db.patients[0];
  const records = db.healthRecords.filter((record) => record.patientId === patient.id);
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
  const notification = db.notifications.find((item) => item.userRole === "patient" && item.type !== "hospital");
  const completed = plan.tasks.filter((task) => task.status === "completed").length;

  const [activeTip, setActiveTip] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [showApptPopup, setShowApptPopup] = useState<boolean>(false);
  const [actionTask, setActionTask] = useState<any | null>(null);

  useEffect(() => {
    const hasShown = sessionStorage.getItem("appt_popup_shown");
    if (!hasShown) {
      setShowApptPopup(true);
    }
  }, []);

  const handleDismissPopup = () => {
    sessionStorage.setItem("appt_popup_shown", "true");
    setShowApptPopup(false);
  };

  useEffect(() => {
    if (patient && patient.id !== "P-0001") {
      const patientRecords = db.healthRecords.filter(r => r.patientId === patient.id);
      if (patientRecords.length === 0) {
        const templateId = "P-0001";
        const somchaiRecords = db.healthRecords.filter(r => r.patientId === templateId);
        const clonedRecords = somchaiRecords.map((r, idx) => ({
          ...r,
          id: `${patient.id}-R-${idx}-${Date.now()}`,
          patientId: patient.id,
          weight: patient.weight || 70,
          height: patient.height || 170
        }));

        const somchaiCarePlan = db.carePlans.find(cp => cp.patientId === templateId);
        const clonedCarePlan = somchaiCarePlan ? {
          ...somchaiCarePlan,
          id: `plan-${patient.id}`,
          patientId: patient.id,
          tasks: somchaiCarePlan.tasks.map((t, idx) => ({
            ...t,
            id: `task-${patient.id}-${idx}`,
            status: "pending" as const,
            pendingConfirm: undefined
          }))
        } : null;

        const somchaiWarning = db.earlyWarnings.find(ew => ew.patientId === templateId);
        const clonedWarning = somchaiWarning ? {
          ...somchaiWarning,
          patientId: patient.id
        } : null;

        setDb((current) => {
          if (current.healthRecords.some(r => r.patientId === patient.id)) return current;
          return {
            ...current,
            healthRecords: [...current.healthRecords, ...clonedRecords],
            earlyWarnings: clonedWarning ? [...current.earlyWarnings.filter(w => w.patientId !== patient.id), clonedWarning] : current.earlyWarnings,
            carePlans: clonedCarePlan ? [...current.carePlans.filter(p => p.patientId !== patient.id), clonedCarePlan] : current.carePlans
          };
        });
      }
    }
  }, [patient, db.healthRecords, db.earlyWarnings, db.carePlans, setDb]);

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

  // Dynamic health score calculation
  const getDynamicHealthScore = () => {
    let score = 100;
    let redCount = 0;
    let yellowCount = 0;

    if (bpRisk === "red") { score -= 25; redCount++; }
    else if (bpRisk === "yellow") { score -= 10; yellowCount++; }

    if (bsRisk === "red") { score -= 25; redCount++; }
    else if (bsRisk === "yellow") { score -= 10; yellowCount++; }

    if (bmiRisk === "red") { score -= 15; redCount++; }
    else if (bmiRisk === "yellow") { score -= 6; yellowCount++; }

    if (hrRisk === "red") { score -= 12; redCount++; }
    else if (hrRisk === "yellow") { score -= 6; yellowCount++; }

    let finalScore = score;
    if (redCount >= 2) {
      finalScore = Math.min(finalScore, 48); // Multiple severe red risks -> failing critical alert
    } else if (redCount === 1) {
      finalScore = Math.min(finalScore, 58); // Single red risk -> failing warning grade
    } else if (yellowCount >= 3) {
      finalScore = Math.min(finalScore, 72);
    }
    return Math.max(Math.round(finalScore), 0);
  };
  const healthScore = getDynamicHealthScore();

  const getTaskCategoryStyle = (category: string) => {
    switch (category) {
      case "medication":
        return {
          bg: "bg-gradient-to-br from-purple-50/70 to-indigo-50/30 border-purple-100/70 shadow-sm",
          iconBg: "bg-purple-100 text-purple-700",
          icon: Pill
        };
      case "measurement":
        return {
          bg: "bg-gradient-to-br from-sky-50/70 to-blue-50/30 border-sky-100/70 shadow-sm",
          iconBg: "bg-sky-100 text-sky-700",
          icon: Activity
        };
      case "exercise":
        return {
          bg: "bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border-emerald-100/70 shadow-sm",
          iconBg: "bg-emerald-100 text-emerald-700",
          icon: Dumbbell
        };
      case "diet":
        return {
          bg: "bg-gradient-to-br from-amber-50/70 to-orange-50/30 border-amber-100/70 shadow-sm",
          iconBg: "bg-amber-100 text-amber-700",
          icon: Utensils
        };
      default:
        return {
          bg: "bg-gradient-to-br from-slate-50/70 to-slate-100/30 border-slate-200/70 shadow-sm",
          iconBg: "bg-slate-100 text-slate-700",
          icon: ShieldCheck
        };
    }
  };

  return (
    <MobileShell role="patient" title="WELLYNC">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-500 to-teal-400 p-5 text-white shadow-soft">
        <p className="text-sm font-semibold opacity-90">สวัสดี {patient.name}</p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm opacity-85">Health Score</p>
            <p className="text-5xl font-bold">{healthScore}</p>
          </div>
          <div className="rounded-2xl bg-white/18 px-3 py-2 text-sm font-semibold backdrop-blur">
            {formatThaiDate(new Date())}
          </div>
        </div>
        <Progress className="mt-5 bg-white/25" value={healthScore} />
      </section>

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
            เป้าหมายการดูแลสุขภาพของคุณ
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
              งานสุขภาพวันนี้
            </CardTitle>
            <p className="text-[10px] text-slate-400 font-medium">ภาพรวมเป้าหมายสุขภาพรายวันของคุณ</p>
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
                  isPending && "cursor-pointer active:bg-slate-50"
                )}
                onClick={() => isPending && setActionTask(task)}
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
                    <p className={cn(
                      "text-xs font-bold text-slate-800 leading-tight",
                      isCompleted && "line-through text-slate-400"
                    )}>
                      <span className="text-[10px] font-semibold text-slate-400 mr-1.5">{task.time} น.</span>
                      {task.title}
                    </p>
                    <p className={cn(
                      "text-[11px] text-slate-400 mt-0.5 truncate font-medium",
                      isCompleted && "text-slate-400"
                    )}>
                      {task.detail}
                    </p>
                  </div>

                  {/* Actions / Status Badge */}
                  <div className="shrink-0 flex items-center pr-2">
                    {task.pendingConfirm ? (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        รอยืนยัน
                      </span>
                    ) : isPending ? (
                      <span className="text-[10px] font-extrabold text-white bg-sky-600 px-3 py-1 rounded-full shadow-sm hover:bg-sky-700 active:scale-95 transition-all select-none">
                        กดบันทึก
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

      {/* Appointment Near-date Modal Popup */}
      {showApptPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl transition-transform duration-300 border border-rose-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4 mx-auto animate-bounce">
              <CalendarClock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800 text-center mb-1">
              แจ้งเตือนนัดหมายแพทย์
            </h3>
            <p className="text-xs text-rose-600 font-bold text-center mb-4">
              อีก 5 วันจะถึงวันนัดหมายของคุณ!
            </p>
            <div className="rounded-2xl bg-slate-50 p-4 text-xs space-y-2.5 text-slate-600 border border-slate-100">
              <div className="flex justify-between">
                <span className="font-semibold">กิจกรรม:</span>
                <span className="font-extrabold text-slate-800 text-right">พบแพทย์ติดตามผลเบาหวาน</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">วันนัดหมาย:</span>
                <span className="font-extrabold text-slate-800">16 ก.ค. 2569</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">เวลา:</span>
                <span className="font-extrabold text-slate-850">09:30 น.</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">สถานที่:</span>
                <span className="font-extrabold text-slate-800 truncate max-w-[150px]">{patient.hospital}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-450 text-center mt-3 leading-relaxed">
              * โปรดจัดเตรียมข้อมูลประวัติระดับน้ำตาลในเลือดและความดันที่บันทึกสะสมเพื่อนำเสนอต่อแพทย์ในวันตรวจ
            </p>
            <Button
              className="w-full mt-5 rounded-2xl py-2.5 text-sm font-bold bg-gradient-to-r from-sky-500 to-indigo-500 border-none text-white shadow-md active:scale-[0.98]"
              onClick={handleDismissPopup}
            >
              รับทราบการนัดหมาย
            </Button>
          </div>
        </div>
      )}

      <EarlyWarningCard warning={warning} />

      <HospitalCampaignCarousel />

      {notification ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-bold text-slate-900">{notification.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{notification.message}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Large Target Action Bottom Sheet for checking off tasks */}
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
              บันทึกกิจกรรมประจำวัน
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5 font-semibold">
              {actionTask.title} ({actionTask.time} น.)
            </p>

            <div className="space-y-3">
              <Button
                variant="success"
                className="w-full h-12 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2"
                onClick={() => {
                  setDb((current) => proposeTaskStatus(current, plan.id, actionTask.id, "completed"));
                  setActionTask(null);
                }}
              >
                <Check className="h-4 w-4" /> ทำกิจกรรมนี้แล้ว
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl text-sm font-extrabold text-amber-700 border-amber-250 bg-amber-50/20 hover:bg-amber-50 flex items-center justify-center gap-2"
                onClick={() => {
                  setDb((current) => proposeTaskStatus(current, plan.id, actionTask.id, "skipped"));
                  setActionTask(null);
                }}
              >
                <RotateCcw className="h-4 w-4" /> ข้ามกิจกรรมสำหรับวันนี้
              </Button>
              <Button
                variant="destructive"
                className="w-full h-12 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2"
                onClick={() => {
                  setDb((current) => proposeTaskStatus(current, plan.id, actionTask.id, "cannot"));
                  setActionTask(null);
                }}
              >
                <CircleSlash className="h-4 w-4" /> ทำไม่ได้ / ไม่สะดวกทำ
              </Button>
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
