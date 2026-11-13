"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowLeft, X } from "lucide-react";

// Helpers for custom calendar calculation
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Custom Premium Thai Calendar DatePicker Component for Birthdays (Modal Layout)
interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
}

export function CustomDatePicker({ value, onChange, label }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"year" | "month" | "day">("year");
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value or default to today
  const initialDate = useMemo(() => {
    if (value) {
      const parts = value.split("-");
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date();
  }, [value]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(value ? initialDate.getDate() : null);

  // Sync state if value changes externally
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      setCurrentYear(Number(parts[0]));
      setCurrentMonth(Number(parts[1]) - 1);
      setSelectedDay(Number(parts[2]));
    }
  }, [value]);

  // Click outside to close (only applies to container, but modal uses full-screen dim click)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Leave modal close to explicit backdrop/close buttons to prevent accidental dismissals
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list = [];
    for (let y = current; y >= current - 100; y--) {
      list.push(y);
    }
    return list;
  }, []);

  const monthsTH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const formattedMonth = String(currentMonth + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    onChange(`${currentYear}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
  };

  const formattedDisplayDate = (() => {
    if (!value) return "";
    const parts = value.split("-");
    const y = Number(parts[0]) + 543; // Thai Buddhist Era (พ.ศ.)
    const m = monthsTH[Number(parts[1]) - 1];
    const d = Number(parts[2]);
    return `${d} ${m} ${y}`;
  })();

  const handleOpen = () => {
    setView("year");
    setIsOpen(true);
  };

  return (
    <div className="w-full" ref={containerRef}>
      <label className="text-[11px] font-bold text-slate-500 pl-1 block mb-1">{label}</label>
      <input
        type="text"
        readOnly
        placeholder="เลือกวันเกิด..."
        value={formattedDisplayDate}
        onClick={handleOpen}
        className="w-full h-12 rounded-2xl border border-sky-100/70 bg-white px-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all cursor-pointer select-none"
      />

      {isOpen && (
        /* Transparent backdrop container to center popup and allow closing on clicking outside */
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent p-5 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          {/* Calendar Picker Modal Card */}
          <div 
            className="relative w-full max-w-[340px] rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation() /* Prevent closing when clicking card body */}
          >
            
            {/* Header Panel with Back Button & Close Cross */}
            <div className="flex items-center justify-between mb-4.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                {view !== "year" && (
                  <button
                    type="button"
                    onClick={() => setView(view === "day" ? "month" : "year")}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-all active:scale-95"
                    title="ย้อนกลับ"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                )}
                <h4 className="text-xs font-black text-slate-800">
                  {view === "year" 
                    ? "เลือกปี พ.ศ. เกิด" 
                    : view === "month" 
                    ? `เลือกเดือน (พ.ศ. ${currentYear + 543})` 
                    : `เลือกวัน (${monthsTH[currentMonth]} ${currentYear + 543})`}
                </h4>
              </div>
              
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all active:scale-95"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* VIEW 1: Year Selector Grid (4 columns) */}
            {view === "year" && (
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                {years.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setCurrentYear(y);
                      setView("month");
                    }}
                    className={`py-2 text-[11px] font-black rounded-xl transition-all ${
                      y === currentYear 
                        ? "bg-sky-600 text-white shadow-md shadow-sky-500/20 scale-105" 
                        : "border border-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    {y + 543}
                  </button>
                ))}
              </div>
            )}

            {/* VIEW 2: Month Selector Grid (3 columns) */}
            {view === "month" && (
              <div className="grid grid-cols-3 gap-2.5">
                {monthsTH.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCurrentMonth(idx);
                      setView("day");
                    }}
                    className={`py-3 text-[11px] font-black rounded-xl transition-all ${
                      idx === currentMonth 
                        ? "bg-sky-600 text-white shadow-md shadow-sky-500/20 scale-105" 
                        : "border border-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    {m.replace("มกราคม", "ม.ค.")
                      .replace("กุมภาพันธ์", "ก.พ.")
                      .replace("มีนาคม", "มี.ค.")
                      .replace("เมษายน", "เม.ย.")
                      .replace("พฤษภาคม", "พ.ค.")
                      .replace("มิถุนายน", "มิ.ย.")
                      .replace("กรกฎาคม", "ก.ค.")
                      .replace("สิงหาคม", "ส.ค.")
                      .replace("กันยายน", "ก.ย.")
                      .replace("ตุลาคม", "ต.ค.")
                      .replace("พฤศจิกายน", "พ.ย.")
                      .replace("ธันวาคม", "ธ.ค.")
                    }
                  </button>
                ))}
              </div>
            )}

            {/* VIEW 3: Day Selector Calendar Grid */}
            {view === "day" && (
              <div>
                {/* Days of Week Row Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d, i) => (
                    <span 
                      key={d} 
                      className={`text-[10px] font-black py-1 ${
                        i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-slate-400"
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {/* Grid of Days */}
                <div className="grid grid-cols-7 gap-1 text-center animate-in fade-in zoom-in-95 duration-150">
                  {/* Pad offset days of previous month */}
                  {Array(firstDay).fill(0).map((_, i) => (
                    <span key={`empty-${i}`} className="h-8 w-8 inline-block" />
                  ))}

                  {/* Render current month days */}
                  {Array(daysInMonth).fill(0).map((_, idx) => {
                    const day = idx + 1;
                    const isSelected = selectedDay === day;
                    const isToday = 
                      new Date().getDate() === day && 
                      new Date().getMonth() === currentMonth && 
                      new Date().getFullYear() === currentYear;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        className={`h-8 w-8 text-xs font-bold rounded-full flex items-center justify-center transition-all ${
                          isSelected 
                            ? "bg-sky-600 text-white shadow-md shadow-sky-500/25 scale-105" 
                            : isToday
                            ? "border border-sky-500 text-sky-600 hover:bg-sky-50"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
