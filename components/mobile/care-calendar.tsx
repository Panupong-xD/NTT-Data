"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, animate, cubicBezier, motion, useMotionTemplate, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { MotionStyle } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { CareAppointment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addCalendarDays, calendarMonthCells, formatCalendarDate, shiftCalendarMonth } from "@/lib/mobile-calendar";

const weekdays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const fullDate = { day: "numeric", month: "long", year: "numeric" } as const;
const widgetEase = cubicBezier(0.32, 0, 0.2, 1);
const morphDuration = 0.6;
const blurLead = 0.07;
const widgetBlur = 22;

export function CareCalendar({ today, date, onDateChange, appointments = [] }: {
  today: string;
  date: string;
  onDateChange: (date: string) => void;
  appointments?: CareAppointment[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [month, setMonth] = useState(date.slice(0, 7));
  const [weekStart, setWeekStart] = useState(addCalendarDays(today, -2));
  const [morphing, setMorphing] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const cells = calendarMonthCells(month);
  const week = Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index));
  const visibleDays = [...new Set([...week, ...cells.filter((key): key is string => key !== null)])].sort();
  const height = useMotionValue(82);
  const openness = useMotionValue(0);
  const blur = useMotionValue(0);
  const filter = useMotionTemplate`blur(${blur}px)`;
  const borderRadius = useTransform(openness, [0, 1], [24, 30]);
  const rotation = useTransform(openness, [0, 1], [0, 180]);
  const selectedAppointments = appointments.filter(item => item.date === date);
  const sortedAppointments = [...appointments].sort((a, b) => a.date.localeCompare(b.date));
  const nearbyAppointment = sortedAppointments.find(item => item.date >= today) || sortedAppointments.at(-1);
  const transition = { duration: reduceMotion ? 0 : morphDuration, ease: [0.32, 0, 0.2, 1] as const };

  useEffect(() => {
    const target = expanded ? 88 + cells.length / 7 * 48 : 82;
    const targetOpenness = expanded ? 1 : 0;
    if (reduceMotion || (height.get() === target && openness.get() === targetOpenness)) {
      height.jump(target);
      openness.jump(targetOpenness);
      blur.jump(0);
      setMorphing(false);
      return;
    }

    const startHeight = height.get();
    const startOpenness = openness.get();
    const startBlur = blur.get();
    let cancelled = false;
    setMorphing(true);

    // One finite clock drives every part of the morph. Blur has no spring tail.
    const animation = animate(0, 1, {
      duration: morphDuration,
      ease: "linear",
      onUpdate: time => {
        const progress = widgetEase(Math.max(0, (time - blurLead) / (1 - blurLead)));
        height.set(startHeight + (target - startHeight) * progress);
        openness.set(startOpenness + (targetOpenness - startOpenness) * progress);
        blur.set(time < blurLead ? startBlur + (widgetBlur - startBlur) * widgetEase(time / blurLead) : widgetBlur);
      },
      onComplete: () => {
        if (cancelled) return;
        height.jump(target);
        openness.jump(targetOpenness);
        blur.jump(0);
        setMorphing(false);
      }
    });
    return () => { cancelled = true; animation.stop(); };
  }, [expanded, cells.length, height, openness, blur, reduceMotion]);

  function selectDate(key: string) {
    onDateChange(key);
    setMonth(key.slice(0, 7));
    if (!week.includes(key)) setWeekStart(addCalendarDays(key, -2));
  }

  function dayButton(key: string, compact: boolean) {
    const hasAppointment = appointments.some(item => item.date === key);
    const selected = date === key;
    const label = formatCalendarDate(key, fullDate);
    const position = compact ? week.indexOf(key) : cells.indexOf(key);
    const visible = position >= 0;
    const weekPosition = week.indexOf(key);
    const monthPosition = cells.indexOf(key);
    const weekColumn = Math.max(0, weekPosition) % 7 * 100 / 7;
    const monthColumn = Math.max(0, monthPosition) % 7 * 100 / 7;
    const monthTop = 76 + Math.floor(Math.max(0, monthPosition) / 7) * 48;
    return <div key={key} aria-hidden={!visible}
      className="absolute top-0 w-[14.285714%] px-0.5" style={{
        left: `calc(${weekColumn}% + ${monthColumn - weekColumn}% * var(--calendar-open))`,
        top: `calc(${monthTop}px * var(--calendar-open))`,
        height: "calc(66px - 22px * var(--calendar-open))",
        opacity: weekPosition >= 0 && monthPosition >= 0 ? 1 : weekPosition >= 0 ? "calc(1 - var(--calendar-open))" : "var(--calendar-open)",
        pointerEvents: visible && !morphing ? "auto" : "none"
      }}>
      <button onClick={() => selectDate(key)} aria-pressed={selected} tabIndex={visible ? undefined : -1}
      aria-current={key === today ? "date" : undefined}
      aria-label={`${label}${hasAppointment ? " มีนัดหมาย" : ""}`}
      className={cn("relative flex h-full w-full min-w-0 flex-col items-center justify-center rounded-full text-sm", selected ? "text-white" : "text-slate-600")}>
      <span style={{ height: "calc(66px - 26px * var(--calendar-open))", borderRadius: "calc(24px - 4px * var(--calendar-open))" }}
        className={cn("absolute w-10 max-w-full border-2",
        selected ? "bg-sky-600" : key === today ? "bg-sky-50" : "",
        hasAppointment ? "border-rose-400" : selected ? "border-sky-600" : key === today ? "border-sky-200" : "border-transparent")} />
      <span style={{ height: "calc(14px * (1 - var(--calendar-open)))", opacity: "calc(1 - var(--calendar-open))" }}
        className="relative overflow-hidden text-[10px]" aria-hidden="true">{formatCalendarDate(key, { weekday: "short" })}</span>
      <span style={{ marginTop: "calc(4px * (1 - var(--calendar-open)))", fontSize: "calc(16px - 2px * var(--calendar-open))" }}
        className="relative font-semibold">{Number(key.slice(-2))}</span>
      {hasAppointment && <span className={cn("absolute h-1 w-1 rounded-full", compact ? "bottom-1.5" : "bottom-1", selected ? "bg-white" : "bg-rose-500")} />}
      </button>
    </div>;
  }

  return <section>
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-[24px] font-bold leading-8">วันละนิด เพื่อสุขภาพ</h2>
      <button onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls={panelId}
        aria-label={expanded ? "ย่อปฏิทิน" : "ขยายปฏิทิน"}
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-medium text-sky-700">
        <CalendarDays className="h-4 w-4" /><span>{expanded ? "ย่อ" : "ขยาย"}</span>
        <motion.span style={{ rotate: rotation }}><ChevronDown className="h-3.5 w-3.5" /></motion.span>
      </button>
    </div>
    <motion.div id={panelId} data-care-calendar data-calendar-morphing={morphing} aria-busy={morphing}
      style={{ height, borderRadius, "--calendar-open": openness } as MotionStyle}
      className="relative overflow-hidden bg-white p-2">
      <motion.div className="relative h-full" style={reduceMotion ? undefined : { filter, pointerEvents: morphing ? "none" : "auto" }}>
        <div style={{ opacity: "var(--calendar-open)", pointerEvents: expanded && !morphing ? "auto" : "none" }}
          aria-hidden={!expanded}>
            <div className="absolute inset-x-0 top-0 flex h-12 items-center justify-between px-1">
              <h3 className="text-base font-semibold" aria-live="polite">{formatCalendarDate(`${month}-01`, { month: "long", year: "numeric" })}</h3>
              <div className="flex">
                <button tabIndex={expanded ? undefined : -1} aria-label="เดือนก่อนหน้า" className="mobile-icon-button" onClick={() => setMonth(value => shiftCalendarMonth(value, -1))}><ChevronLeft className="h-5 w-5" /></button>
                <button tabIndex={expanded ? undefined : -1} aria-label="เดือนถัดไป" className="mobile-icon-button" onClick={() => setMonth(value => shiftCalendarMonth(value, 1))}><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="absolute inset-x-0 top-12 grid h-7 grid-cols-7 items-center text-center text-[11px] text-slate-400" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
        </div>
        <div role="group" aria-label={expanded ? "วันที่ในเดือน" : "วันที่ในสัปดาห์"}>
          {visibleDays.map(key => dayButton(key, !expanded))}
        </div>
      </motion.div>
    </motion.div>
    <div className="mt-1 flex min-h-11 items-center justify-between gap-2 px-1">
      <p className="text-xs text-slate-500" aria-live="polite">{formatCalendarDate(date, fullDate)}</p>
      {date !== today && <button onClick={() => { selectDate(today); setWeekStart(addCalendarDays(today, -2)); }} className="min-h-11 px-2 text-xs font-medium text-sky-700">วันนี้</button>}
    </div>
    <AnimatePresence initial={false}>
      {expanded && <motion.div key="appointment-legend" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition} className="overflow-hidden">
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 px-1 text-xs">
          <span className="flex items-center gap-1.5 text-slate-500"><span className="h-3 w-3 rounded-full border-2 border-rose-400" />วันนัดหมาย</span>
          {nearbyAppointment && <button onClick={() => selectDate(nearbyAppointment.date)} className="min-h-11 text-rose-600">
            ดูวันนัด {formatCalendarDate(nearbyAppointment.date, { day: "numeric", month: "short" })}
          </button>}
        </div>
      </motion.div>}
    </AnimatePresence>
    {selectedAppointments.map(item => <div key={item.id} className="mt-2 flex gap-3 rounded-[20px] bg-rose-50 p-4">
      <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
      <div><p className="text-sm font-semibold text-rose-800">{item.title}</p><p className="mt-1 text-xs leading-6 text-rose-700">{item.time} น.{item.location ? ` · ${item.location}` : ""}</p></div>
    </div>)}
  </section>;
}
