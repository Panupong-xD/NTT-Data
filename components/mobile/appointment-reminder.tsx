"use client";
import Link from "next/link";
import { BellRing, ChevronRight } from "lucide-react";
import type { CareAppointment } from "@/lib/types";
import { appointmentCountdown, appointmentDaysAway, upcomingAppointments } from "@/lib/appointments";
import { formatCalendarDate } from "@/lib/mobile-calendar";

export function AppointmentReminder({ appointments, role }: { appointments?: CareAppointment[]; role: "patient" | "caregiver" }) {
  const next = upcomingAppointments(appointments)[0];
  if (!next || appointmentDaysAway(next) > 3) return null;
  return <Link href={`/${role}/care-plan?date=${next.date}`} aria-label={`ดูวันนัด ${appointmentCountdown(next)} ${formatCalendarDate(next.date, { day: "numeric", month: "short" })} ${next.time} น.`} className="flex min-h-20 items-center gap-3 rounded-[24px] bg-[#fff1db] px-4 py-3 text-amber-900">
    <BellRing className="h-5 w-5 shrink-0 text-amber-700" strokeWidth={1.7} />
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{appointmentCountdown(next)}</span><span className="mt-1 block text-xs leading-5 text-amber-800">{formatCalendarDate(next.date, { day: "numeric", month: "short" })} · {next.time} น.</span></span>
    <span className="flex shrink-0 items-center gap-1 text-xs font-medium">ดูนัด<ChevronRight className="h-4 w-4" /></span>
  </Link>;
}
