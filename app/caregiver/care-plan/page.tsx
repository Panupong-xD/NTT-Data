"use client";

import { useState } from "react";
import { Check, CircleSlash, Pill, RotateCcw, Utensils, Dumbbell, CalendarCheck, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileShell } from "@/components/layouts/mobile-shell";
import { useMockStore } from "@/lib/hooks/use-mock-store";
import { confirmTaskStatus } from "@/lib/services/mock-store";
import { formatThaiDate, cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

import { useAuth } from "@/lib/hooks/use-auth";

export default function CaregiverCarePlanPage() {
  const { db, setDb } = useMockStore();
  const { user } = useAuth();
  
  const caregiver = db.caregivers.find(c => c.email === user?.email) || db.caregivers[0];
  const patient = db.patients.find((item) => item.id === caregiver.patientId) || db.patients[0];
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
  const sections = [
    ["ยา", plan.medication, Pill],
    ["อาหาร", plan.diet, Utensils],
    ["ออกกำลัง", plan.exercise, Dumbbell],
    ["การวัดค่า", plan.measurement, CalendarCheck]
  ] as const;

  const dailyTasks = plan.tasks;
  const [selectedDate, setSelectedDate] = useState<number>(11); // default is July 11

  // Dynamic historical tasks builder
  const getTasksForDate = (date: number) => {
    if (date === 11) {
      return dailyTasks;
    }
    if (date < 11) {
      // Past days: simulate completed/skipped activities
      return dailyTasks.map((t, idx) => ({
        ...t,
        status: (date + idx) % 3 === 0 ? ("skipped" as const) : ("completed" as const),
        pendingConfirm: undefined
      }));
    }
    // Future days: pending tasks
    return dailyTasks.map(t => ({
      ...t,
      status: "pending" as const,
      pendingConfirm: undefined
    }));
  };

  const currentTasks = getTasksForDate(selectedDate);

  return (
    <MobileShell role="caregiver" title="แผนดูแลผู้ป่วย">
      {/* Interactive Calendar Widget */}
      <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
              <CalendarCheck className="h-4.5 w-4.5 text-sky-600" />
              ปฏิทินแผนการดูแลและการนัดหมาย
            </CardTitle>
            <span className="text-[11px] font-extrabold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              กรกฎาคม 2569
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Days of the week */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 uppercase mb-2">
            <span>อา.</span>
            <span>จ.</span>
            <span>อ.</span>
            <span>พ.</span>
            <span>พฤ.</span>
            <span>ศ.</span>
            <span>ส.</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Start Offset for Wednesday (3 empty cells) */}
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`offset-${idx}`} className="h-9 w-9" />
            ))}

            {/* Days in July (31 days) */}
            {Array.from({ length: 31 }).map((_, idx) => {
              const day = idx + 1;
              const isToday = day === 11;
              const isSelected = day === selectedDate;
              const isAppt = day === 16;
              const isPast = day < 11;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "h-9 w-9 rounded-full flex flex-col items-center justify-center relative transition-all duration-200 text-xs font-bold",
                    isSelected
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                      : isToday
                      ? "border border-sky-500 text-sky-700 bg-sky-50/50"
                      : isAppt
                      ? "border border-rose-500 text-rose-700 bg-rose-50/50 animate-pulse"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span>{day}</span>
                  {/* Indicators below date */}
                  <div className="absolute bottom-0.5 flex gap-0.5 items-center justify-center">
                    {isAppt ? (
                      <span className="h-1 w-1 rounded-full bg-rose-500" title="วันหมอนัด" />
                    ) : isPast ? (
                      <span className="h-1 w-1 rounded-full bg-emerald-500" title="มีบันทึกกิจกรรม" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Appointment Information / Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-2.5 text-[10px] text-slate-500 font-medium">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                ประวัติทำกิจกรรมแล้ว
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                วันนัดหมายติดตามผล
              </span>
            </div>
            {selectedDate === 16 ? (
              <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md self-start sm:self-auto border border-rose-100">
                📢 วันสำคัญ: วันหมอนัดติดตามอาการโรคเบาหวานและความดัน (09:30 น.)
              </span>
            ) : selectedDate === 11 ? (
              <span className="text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded-md self-start sm:self-auto">
                วันนี้: กรุณาทำกิจกรรมและประเมินผลตามแผน
              </span>
            ) : selectedDate < 11 ? (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md self-start sm:self-auto">
                ประวัติการดูแลวันที่ {selectedDate} กรกฎาคม 2569
              </span>
            ) : (
              <span className="text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-md self-start sm:self-auto">
                แผนกิจกรรมล่วงหน้าวันที่ {selectedDate} กรกฎาคม 2569
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>แผนรักษาของ {patient.name}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">อัปเดต {formatThaiDate(plan.updatedAt)}</p>
          </div>
          <Badge tone={plan.status === "published" ? "green" : "yellow"}>
            {plan.status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-slate-700">
            <MarkdownRenderer content={plan.summary} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(([title, items, Icon]) => (
          <Card key={title}>
            <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-sky-600" /> {title}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {items.map((item) => (
                <div key={item} className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-medium text-slate-700">{item}</div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily checklist verification log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sky-600" />
            ตรวจสอบแผนงานคนไข้{selectedDate === 11 ? "วันนี้" : `วันที่ ${selectedDate} ก.ค.`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentTasks.map((task) => (
            <div key={task.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{task.time} · {task.detail}</p>
                </div>
                <div>
                  {task.pendingConfirm ? (
                    <Badge tone="yellow">
                      🕒 รอคุณยืนยัน ({task.pendingConfirm === "completed" ? "ทำแล้ว" : task.pendingConfirm === "skipped" ? "ข้าม" : "ทำไม่ได้"})
                    </Badge>
                  ) : (
                    <Badge tone={task.status === "completed" ? "green" : task.status === "skipped" ? "orange" : task.status === "cannot" ? "red" : "blue"}>
                      {task.status === "completed" ? "ยืนยันแล้ว: ทำแล้ว" : task.status === "skipped" ? "ยืนยันแล้ว: ข้าม" : task.status === "cannot" ? "ยืนยันแล้ว: ทำไม่ได้" : "รอดำเนินการ"}
                    </Badge>
                  )}
                </div>
              </div>

            </div>
          ))}
        </CardContent>
      </Card>
    </MobileShell>
  );
}
