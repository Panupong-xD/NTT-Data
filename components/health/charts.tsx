"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Heart, Activity, HeartPulse, Scale, Moon, Dumbbell, Ruler } from "lucide-react";
import { HealthRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

function chartData(records: HealthRecord[]) {
  return records.slice(-14).map((record) => {
    const height = record.height || 170;
    const heightM = height / 100;
    const bmi = record.weight / (heightM * heightM);
    return {
      date: new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(record.date)),
      sys: record.systolic,
      dia: record.diastolic,
      ความดัน: record.systolic,
      น้ำตาล: record.bloodSugar,
      น้ำหนัก: record.weight,
      ส่วนสูง: height,
      ชีพจร: record.heartRate,
      นอน: record.sleepHours,
      ออกกำลัง: record.exerciseMinutes,
      ยา: record.medicationTaken ? 100 : 0,
      อาหาร: record.foodScore,
      bmi: Number(bmi.toFixed(1))
    };
  });
}

export function TrendChart({ records, type = "bp" }: { records: HealthRecord[]; type?: "bp" | "sugar" | "weight" | "sleep" }) {
  const data = chartData(records);
  const key = type === "sugar" ? "น้ำตาล" : type === "weight" ? "น้ำหนัก" : type === "sleep" ? "นอน" : "sys";
  const label = type === "sugar" ? "ระดับน้ำตาล" : type === "weight" ? "น้ำหนัก" : type === "sleep" ? "ชั่วโมงนอน" : "ความดันตัวบน";
  const color = type === "sugar" ? "#10b981" : type === "weight" ? "#0ea5e9" : type === "sleep" ? "#6366f1" : "#ef4444";

  return (
    <div className="h-60 w-full bg-white rounded-2xl p-4 border border-sky-100/80 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -24, right: 6, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip isAnimationActive={false} contentStyle={{ borderRadius: 16, backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }} />
          <Area type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2.5} fill={`url(#gradient-${type})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MultiMetricChart({ records, mode = "all" }: { records: HealthRecord[]; mode?: "all" | "patient" }) {
  const [activeTab, setActiveTab] = useState<"bp" | "sugar" | "heart" | "weight" | "sleep" | "exercise" | "height" | "bmi">(() => {
    return mode === "patient" ? "weight" : "bp";
  });
  const data = chartData(records);

  // Dynamic clinical stats calculations
  const total = records.length;
  const avgSys = total ? Math.round(records.reduce((acc, r) => acc + r.systolic, 0) / total) : 0;
  const avgDia = total ? Math.round(records.reduce((acc, r) => acc + r.diastolic, 0) / total) : 0;
  const avgSugar = total ? Math.round(records.reduce((acc, r) => acc + r.bloodSugar, 0) / total) : 0;
  const adherence = total ? Math.round((records.filter(r => r.medicationTaken).length / total) * 100) : 0;
  const avgWeight = total ? Number((records.reduce((acc, r) => acc + r.weight, 0) / total).toFixed(1)) : 0;
  const avgHeight = total ? Number((records.reduce((acc, r) => acc + (r.height || 170), 0) / total).toFixed(1)) : 0;
  const avgBmi = total ? Number((records.reduce((acc, r) => {
    const hM = (r.height || 170) / 100;
    return acc + (r.weight / (hM * hM));
  }, 0) / total).toFixed(1)) : 0;

  const menu = mode === "patient" ? [
    { id: "weight", label: "น้ำหนัก", icon: Scale, color: "text-sky-500" },
    { id: "height", label: "ส่วนสูง", icon: Ruler, color: "text-indigo-500" }
  ] as const : [
    { id: "bp", label: "ความดัน", icon: Heart, color: "text-rose-500" },
    { id: "sugar", label: "น้ำตาล", icon: Activity, color: "text-emerald-600" },
    { id: "heart", label: "ชีพจร", icon: HeartPulse, color: "text-rose-500" },
    { id: "weight", label: "น้ำหนัก", icon: Scale, color: "text-sky-500" },
    { id: "sleep", label: "การนอน", icon: Moon, color: "text-indigo-500" },
    { id: "exercise", label: "ออกกำลัง", icon: Dumbbell, color: "text-teal-600" },
    { id: "height", label: "ส่วนสูง", icon: Ruler, color: "text-indigo-500" },
    { id: "bmi", label: "ดัชนีมวลกาย", icon: Scale, color: "text-amber-500" }
  ] as const;

  // Active chart configurations in Light Mode theme
  const getChartConfig = () => {
    switch (activeTab) {
      case "sugar":
        return {
          title: "ระดับน้ำตาลในเลือด (mg/dL)",
          key: "น้ำตาล",
          label: "น้ำตาลในเลือด",
          color: "#10b981",
          domain: ["dataMin - 15", "dataMax + 15"] as [string, string]
        };
      case "heart":
        return {
          title: "อัตราการเต้นของหัวใจ (ครั้ง/นาที)",
          key: "ชีพจร",
          label: "อัตราเต้นหัวใจ",
          color: "#f43f5e",
          domain: ["dataMin - 10", "dataMax + 10"] as [string, string]
        };
      case "weight":
        return {
          title: "แนวโน้มน้ำหนักตัว (กิโลกรัม)",
          key: "น้ำหนัก",
          label: "น้ำหนัก",
          color: "#0ea5e9",
          domain: ["dataMin - 3", "dataMax + 3"] as [string, string]
        };
      case "height":
        return {
          title: "แนวโน้มส่วนสูง (เซนติเมตร)",
          key: "ส่วนสูง",
          label: "ส่วนสูง",
          color: "#8b5cf6",
          domain: ["dataMin - 5", "dataMax + 5"] as [string, string]
        };
      case "sleep":
        return {
          title: "ชั่วโมงการนอนหลับ (ชั่วโมง)",
          key: "นอน",
          label: "เวลานอนหลับ",
          color: "#6366f1",
          domain: [0, 12] as [number, number]
        };
      case "exercise":
        return {
          title: "เวลาการออกกำลังกาย (นาที)",
          key: "ออกกำลัง",
          label: "ออกกำลังกาย",
          color: "#14b8a6",
          domain: [0, "dataMax + 15"] as [number, string]
        };
      case "bmi":
        return {
          title: "ดัชนีมวลกาย (BMI)",
          key: "bmi",
          label: "BMI",
          color: "#f59e0b",
          domain: ["dataMin - 2", "dataMax + 2"] as [string, string]
        };
      default:
        return {
          title: "ระดับความดันโลหิต (มม.ปรอท)",
          key: "sys",
          label: "SYS (ตัวบน)",
          color: "#0ea5e9",
          domain: ["dataMin - 20", "dataMax + 20"] as [string, string]
        };
    }
  };

  const config = getChartConfig();

  const renderChartFooter = () => {
    if (!total) return null;

    switch (activeTab) {
      case "bp": {
        const sysVals = records.map(r => r.systolic);
        const diaVals = records.map(r => r.diastolic);
        const avgSys = Math.round(sysVals.reduce((a, b) => a + b, 0) / total);
        const avgDia = Math.round(diaVals.reduce((a, b) => a + b, 0) / total);
        const maxSys = Math.max(...sysVals);
        const maxDia = diaVals[sysVals.indexOf(maxSys)] || Math.max(...diaVals);
        const minSys = Math.min(...sysVals);
        const minDia = diaVals[sysVals.indexOf(minSys)] || Math.min(...diaVals);
        const bpStatus = avgSys >= 140 || avgDia >= 90 ? "ความดันสูง (เสี่ยงแดง)" : (avgSys >= 120 || avgDia >= 80 ? "ก่อนความดันสูง (เฝ้าระวัง)" : "ปกติ");
        const bpStatusColor = avgSys >= 140 || avgDia >= 90 ? "text-rose-700 bg-rose-50 border-rose-100" : (avgSys >= 120 || avgDia >= 80 ? "text-amber-700 bg-amber-50 border-amber-100" : "text-emerald-700 bg-emerald-50 border-emerald-100");
        return (
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ค่าเฉลี่ย</p>
                <p className="text-sm font-extrabold text-slate-850">{avgSys}/{avgDia} mmHg</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">สูงสุด</p>
                <p className="text-sm font-extrabold text-rose-600">{maxSys}/{maxDia} mmHg</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ต่ำสุด</p>
                <p className="text-sm font-extrabold text-emerald-600">{minSys}/{minDia} mmHg</p>
              </div>
            </div>
            <div className={cn("text-[10px] font-bold py-1.5 px-3 rounded-xl border flex items-center justify-between", bpStatusColor)}>
              <span>สถานะเฉลี่ยโดยรวม:</span>
              <span>{bpStatus}</span>
            </div>
          </div>
        );
      }
      case "sugar": {
        const sugarVals = records.map(r => r.bloodSugar);
        const avgSugar = Math.round(sugarVals.reduce((a, b) => a + b, 0) / total);
        const maxSugar = Math.max(...sugarVals);
        const minSugar = Math.min(...sugarVals);
        const sugarStatus = avgSugar >= 126 ? "สูงเกินเกณฑ์ (เสี่ยงเบาหวาน)" : (avgSugar >= 100 ? "เฝ้าระวังน้ำตาลสูง" : "ปกติ");
        const sugarStatusColor = avgSugar >= 126 ? "text-rose-700 bg-rose-50 border-rose-100" : (avgSugar >= 100 ? "text-amber-700 bg-amber-50 border-amber-100" : "text-emerald-700 bg-emerald-50 border-emerald-100");
        return (
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ค่าน้ำตาลเฉลี่ย</p>
                <p className="text-sm font-extrabold text-slate-850">{avgSugar} mg/dL</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">น้ำตาลสูงสุด</p>
                <p className="text-sm font-extrabold text-rose-600">{maxSugar} mg/dL</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">น้ำตาลต่ำสุด</p>
                <p className="text-sm font-extrabold text-emerald-600">{minSugar} mg/dL</p>
              </div>
            </div>
            <div className={cn("text-[10px] font-bold py-1.5 px-3 rounded-xl border flex items-center justify-between", sugarStatusColor)}>
              <span>สถานะเฉลี่ยโดยรวม:</span>
              <span>{sugarStatus}</span>
            </div>
          </div>
        );
      }
      case "heart": {
        const hrVals = records.map(r => r.heartRate || 72);
        const avgHr = Math.round(hrVals.reduce((a, b) => a + b, 0) / total);
        const maxHr = Math.max(...hrVals);
        const minHr = Math.min(...hrVals);
        const hrStatus = avgHr > 100 || avgHr < 60 ? "อัตราชีพจรเต้นผิดปกติ" : "ปกติขณะพัก";
        const hrStatusColor = avgHr > 100 || avgHr < 60 ? "text-amber-700 bg-amber-50 border-amber-100" : "text-emerald-700 bg-emerald-50 border-emerald-100";
        return (
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ชีพจรเฉลี่ย</p>
                <p className="text-sm font-extrabold text-slate-850">{avgHr} bpm</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ชีพจรสูงสุด</p>
                <p className="text-sm font-extrabold text-rose-600">{maxHr} bpm</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ชีพจรต่ำสุด</p>
                <p className="text-sm font-extrabold text-emerald-600">{minHr} bpm</p>
              </div>
            </div>
            <div className={cn("text-[10px] font-bold py-1.5 px-3 rounded-xl border flex items-center justify-between", hrStatusColor)}>
              <span>สภาวะชีพจรเฉลี่ย:</span>
              <span>{hrStatus}</span>
            </div>
          </div>
        );
      }
      case "weight": {
        const weightVals = records.map(r => r.weight);
        const avgW = (weightVals.reduce((a, b) => a + b, 0) / total).toFixed(1);
        const maxW = Math.max(...weightVals).toFixed(1);
        const minW = Math.min(...weightVals).toFixed(1);
        return (
          <div className="border-t border-slate-100 pt-3 mt-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">น้ำหนักเฉลี่ย</p>
                <p className="text-sm font-extrabold text-slate-850">{avgW} กก.</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">น้ำหนักสูงสุด</p>
                <p className="text-sm font-extrabold text-sky-700">{maxW} กก.</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">น้ำหนักต่ำสุด</p>
                <p className="text-sm font-extrabold text-teal-600">{minW} กก.</p>
              </div>
            </div>
          </div>
        );
      }
      case "sleep": {
        const sleepVals = records.map(r => r.sleepHours);
        const avgS = (sleepVals.reduce((a, b) => a + b, 0) / total).toFixed(1);
        const maxS = Math.max(...sleepVals);
        const minS = Math.min(...sleepVals);
        const sleepStatus = Number(avgS) >= 7 ? "นอนหลับเพียงพอ" : "ควรพักผ่อนเพิ่ม";
        const sleepStatusColor = Number(avgS) >= 7 ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-amber-700 bg-amber-50 border-amber-100";
        return (
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">เฉลี่ยชั่วโมงนอน</p>
                <p className="text-sm font-extrabold text-slate-850">{avgS} ชม.</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">นอนยาวนานสุด</p>
                <p className="text-sm font-extrabold text-indigo-600">{maxS} ชม.</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">นอนน้อยสุด</p>
                <p className="text-sm font-extrabold text-slate-600">{minS} ชม.</p>
              </div>
            </div>
            <div className={cn("text-[10px] font-bold py-1.5 px-3 rounded-xl border flex items-center justify-between", sleepStatusColor)}>
              <span>การประเมินการนอนหลับ:</span>
              <span>{sleepStatus}</span>
            </div>
          </div>
        );
      }
      case "exercise": {
        const exVals = records.map(r => r.exerciseMinutes);
        const avgEx = Math.round(exVals.reduce((a, b) => a + b, 0) / total);
        const totalEx = exVals.reduce((a, b) => a + b, 0);
        const weeklyEx = Math.round(totalEx / (total / 7));
        const exStatus = weeklyEx >= 150 ? "ผ่านเกณฑ์ 150 นาที/สัปดาห์" : "ต่ำกว่าเกณฑ์ 150 นาที/สัปดาห์ ⚠️";
        const exStatusColor = weeklyEx >= 150 ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-amber-700 bg-amber-50 border-amber-100";
        return (
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ออกกำลังเฉลี่ย</p>
                <p className="text-sm font-extrabold text-slate-850">{avgEx} นาที/วัน</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-550 font-bold tracking-wide">เวลาสะสมทั้งหมด</p>
                <p className="text-sm font-extrabold text-teal-600">{totalEx} นาที</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">เฉลี่ยต่อสัปดาห์</p>
                <p className="text-sm font-extrabold text-sky-700">~{weeklyEx} นาที</p>
              </div>
            </div>
            <div className={cn("text-[10px] font-bold py-1.5 px-3 rounded-xl border flex items-center justify-between", exStatusColor)}>
              <span>เกณฑ์แพทย์แนะนำ:</span>
              <span>{exStatus}</span>
            </div>
          </div>
        );
      }
      case "height": {
        const heightVals = records.map(r => r.height || 170);
        const avgH = (heightVals.reduce((a, b) => a + b, 0) / total).toFixed(1);
        return (
          <div className="border-t border-slate-100 pt-3 mt-3">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ส่วนสูงเฉลี่ย</p>
                <p className="text-sm font-extrabold text-slate-850">{avgH} ซม.</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ส่วนสูงล่าสุด</p>
                <p className="text-sm font-extrabold text-indigo-600">{heightVals[heightVals.length - 1] || 170} ซม.</p>
              </div>
            </div>
          </div>
        );
      }
      case "bmi": {
        const bmiVals = records.map(r => {
          const hM = (r.height || 170) / 100;
          return r.weight / (hM * hM);
        });
        const avgB = Number((bmiVals.reduce((a, b) => a + b, 0) / total).toFixed(1));
        const bmiStatus = avgB >= 25 ? "อ้วน (โรคอ้วน)" : (avgB >= 23 ? "น้ำหนักเกิน (เฝ้าระวัง)" : (avgB < 18.5 ? "น้ำหนักต่ำเกณฑ์" : "น้ำหนักปกติ (สมส่วน)"));
        const bmiStatusColor = avgB >= 25 ? "text-rose-700 bg-rose-50 border-rose-100" : (avgB >= 23 ? "text-amber-700 bg-amber-50 border-amber-100" : (avgB < 18.5 ? "text-amber-700 bg-amber-50 border-amber-100" : "text-emerald-700 bg-emerald-50 border-emerald-100"));
        return (
          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">ดัชนีมวลกายเฉลี่ย</p>
                <p className="text-sm font-extrabold text-slate-850">{avgB}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">BMI สูงสุด</p>
                <p className="text-sm font-extrabold text-rose-600">{Math.max(...bmiVals).toFixed(1)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-slate-500 font-bold tracking-wide">BMI ต่ำสุด</p>
                <p className="text-sm font-extrabold text-emerald-600">{Math.min(...bmiVals).toFixed(1)}</p>
              </div>
            </div>
            <div className={cn("text-[10px] font-bold py-1.5 px-3 rounded-xl border flex items-center justify-between", bmiStatusColor)}>
              <span>เกณฑ์สภาวะร่างกาย (BMI):</span>
              <span>{bmiStatus}</span>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Dynamic Grid Buttons based on mode */}
      <div className={cn("grid gap-2 mb-4", mode === "patient" ? "grid-cols-2" : "grid-cols-4")}>
        {menu.map((m) => {
          const active = activeTab === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => setActiveTab(m.id as any)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-300 active:scale-95 select-none",
                active
                  ? "bg-sky-50/90 border-sky-500 text-sky-700 shadow-sm"
                  : "bg-white border-sky-100/70 text-slate-600 hover:border-sky-200 hover:bg-sky-50/30"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 mb-1", active ? "text-sky-600" : m.color)} />
              <span className="text-[10px] font-bold tracking-wide text-center leading-tight truncate w-full">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Chart Container Card (White Light Mode) */}
      <div className="bg-white border border-sky-100/70 rounded-3xl p-4 shadow-sm text-slate-800 flex flex-col justify-between">
        <div>
          {/* Header row inside chart */}
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold tracking-wide text-slate-850">
              {config.title}
            </h3>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ซิงค์กับแพทย์
            </span>
          </div>

          {/* Recharts Render Grid - Optimized margins & width to stretch fully */}
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === "bp" ? (
                // Double lines for Blood Pressure (SYS and DIA)
                <AreaChart data={data} margin={{ left: -22, right: -4, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradient-sys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="gradient-dia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} domain={[60, 180]} ticks={[60, 90, 120, 150, 180]} width={25} />
                  <Tooltip isAnimationActive={false} contentStyle={{ borderRadius: 12, backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }} />
                  <Area type="monotone" dataKey="sys" name="ความดันตัวบน (SYS)" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#gradient-sys)" />
                  <Area type="monotone" dataKey="dia" name="ความดันตัวล่าง (DIA)" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradient-dia)" />
                </AreaChart>
              ) : (
                // Single line Area chart for other metrics
                <AreaChart data={data} margin={{ left: -22, right: -4, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradient-active" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={config.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={config.color} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} domain={config.domain as any} width={25} />
                  <Tooltip isAnimationActive={false} contentStyle={{ borderRadius: 12, backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }} />
                  <Area type="monotone" dataKey={config.key!} name={config.label} stroke={config.color} strokeWidth={2.5} fill="url(#gradient-active)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Dynamic Averages Footer (Specific to the active selected tab with detail) */}
        {renderChartFooter()}
      </div>
    </div>
  );
}

export function DoctorChartsGrid({ records, className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" }: { records: HealthRecord[]; className?: string }) {
  const data = chartData(records);

  const configs = [
    {
      title: "ความดันโลหิต (mmHg)",
      type: "bp",
      color: "#0ea5e9",
      domain: [60, 180] as [number, number],
      ticks: [60, 90, 120, 150, 180]
    },
    {
      title: "ระดับน้ำตาล (mg/dL)",
      type: "sugar",
      key: "น้ำตาล",
      label: "น้ำตาลในเลือด",
      color: "#10b981",
      domain: ["dataMin - 15", "dataMax + 15"] as [string, string]
    },
    {
      title: "ชีพจร (ครั้ง/นาที)",
      type: "heart",
      key: "ชีพจร",
      label: "ชีพจร",
      color: "#f43f5e",
      domain: ["dataMin - 10", "dataMax + 10"] as [string, string]
    },
    {
      title: "น้ำหนัก (กก.)",
      type: "weight",
      key: "น้ำหนัก",
      label: "น้ำหนัก",
      color: "#0ea5e9",
      domain: ["dataMin - 3", "dataMax + 3"] as [string, string]
    },
    {
      title: "การนอน (ชั่วโมง)",
      type: "sleep",
      key: "นอน",
      label: "ชั่วโมงนอน",
      color: "#6366f1",
      domain: [0, 12] as [number, number]
    },
    {
      title: "ออกกำลังกาย (นาที)",
      type: "exercise",
      key: "ออกกำลัง",
      label: "ออกกำลัง",
      color: "#14b8a6",
      domain: [0, "dataMax + 15"] as [number, string]
    },
    {
      title: "ส่วนสูง (ซม.)",
      type: "height",
      key: "ส่วนสูง",
      label: "ส่วนสูง",
      color: "#8b5cf6",
      domain: ["dataMin - 5", "dataMax + 5"] as [string, string]
    },
    {
      title: "ดัชนีมวลกาย (BMI)",
      type: "bmi",
      key: "bmi",
      label: "BMI",
      color: "#f59e0b",
      domain: ["dataMin - 2", "dataMax + 2"] as [string, string]
    }
  ];

  return (
    <div className={className}>
      {configs.map((c) => {
        let avgText = "";
        const total = records.length;
        if (total > 0) {
          if (c.type === "bp") {
            const avgSys = Math.round(records.reduce((acc, r) => acc + r.systolic, 0) / total);
            const avgDia = Math.round(records.reduce((acc, r) => acc + r.diastolic, 0) / total);
            avgText = `${avgSys}/${avgDia} mmHg`;
          } else if (c.type === "sugar") {
            const avgVal = Math.round(records.reduce((acc, r) => acc + r.bloodSugar, 0) / total);
            avgText = `${avgVal} mg/dL`;
          } else if (c.type === "heart") {
            const avgVal = Math.round(records.reduce((acc, r) => acc + (r.heartRate || 72), 0) / total);
            avgText = `${avgVal} bpm`;
          } else if (c.type === "weight") {
            const avgVal = (records.reduce((acc, r) => acc + r.weight, 0) / total).toFixed(1);
            avgText = `${avgVal} กก.`;
          } else if (c.type === "sleep") {
            const avgVal = (records.reduce((acc, r) => acc + r.sleepHours, 0) / total).toFixed(1);
            avgText = `${avgVal} ชม.`;
          } else if (c.type === "exercise") {
            const avgVal = Math.round(records.reduce((acc, r) => acc + r.exerciseMinutes, 0) / total);
            avgText = `${avgVal} นาที`;
          } else if (c.type === "height") {
            const avgVal = (records.reduce((acc, r) => acc + (r.height || 170), 0) / total).toFixed(1);
            avgText = `${avgVal} ซม.`;
          } else if (c.type === "bmi") {
            const avgVal = (records.reduce((acc, r) => {
              const hM = (r.height || 170) / 100;
              return acc + (r.weight / (hM * hM));
            }, 0) / total).toFixed(1);
            avgText = `${avgVal}`;
          }
        }

        return (
          <div key={c.title} className="bg-white border border-sky-100/70 rounded-3xl p-3 sm:p-4 shadow-sm text-slate-800 flex flex-col justify-between h-[220px] sm:h-[280px]">
            <div>
              <div className="flex justify-between items-center mb-1 sm:mb-2">
                <h4 className="text-[10px] sm:text-xs font-bold tracking-wide text-slate-700 truncate">
                  {c.title}
                </h4>
              </div>
              <div className="h-[145px] sm:h-[195px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {c.type === "bp" ? (
                    <AreaChart data={data} margin={{ left: -22, right: -4, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grid-sys" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="grid-dia" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "#64748b" }} tickLine={false} axisLine={false} domain={c.domain} ticks={c.ticks} width={25} />
                      <Tooltip isAnimationActive={false} contentStyle={{ borderRadius: 10, fontSize: 10, padding: 6 }} />
                      <Area type="monotone" dataKey="sys" name="SYS" stroke="#0ea5e9" strokeWidth={2} fill="url(#grid-sys)" />
                      <Area type="monotone" dataKey="dia" name="DIA" stroke="#3b82f6" strokeWidth={2} fill="url(#grid-dia)" />
                    </AreaChart>
                  ) : (
                    <AreaChart data={data} margin={{ left: -22, right: -4, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`grid-${c.type}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={c.color} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={c.color} stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: "#64748b" }} tickLine={false} axisLine={false} domain={c.domain as any} width={25} />
                      <Tooltip isAnimationActive={false} contentStyle={{ borderRadius: 10, fontSize: 10, padding: 6 }} />
                      <Area type="monotone" dataKey={c.key!} name={c.label} stroke={c.color} strokeWidth={2} fill={`url(#grid-${c.type})`} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2 sm:pt-2.5 mt-1.5 sm:mt-2 flex justify-between items-center text-[10px] sm:text-[11px]">
              <span className="text-slate-500 font-semibold">ค่าเฉลี่ย:</span>
              <span className="font-extrabold text-slate-850 truncate">{avgText}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdherenceChart({ records }: { records: HealthRecord[] }) {
  const data = chartData(records).slice(-7);
  return (
    <div className="h-56 w-full bg-white rounded-2xl p-4 border border-sky-100/80 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -24, right: 6, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <Tooltip isAnimationActive={false} contentStyle={{ borderRadius: 16, backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }} />
          <Bar dataKey="ยา" name="ทานยา (%)" fill="#10b981" radius={[8, 8, 0, 0]} />
          <Bar dataKey="ออกกำลัง" name="ออกกำลัง (นาที)" fill="#38bdf8" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
