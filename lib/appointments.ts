import type { CareAppointment, MockDatabase, NotificationItem } from "./types";
import { addCalendarDays, bangkokDate, calendarDate, formatCalendarDate } from "./mobile-calendar";

export const prototypeAppointmentOffset = 2;
const reminderPrefix = "appointment-reminder:";

export function appointmentDaysAway(appointment: CareAppointment, now = new Date()) {
  return Math.round((calendarDate(appointment.date).getTime() - calendarDate(bangkokDate(now)).getTime()) / 86400000);
}

export function upcomingAppointments(appointments: CareAppointment[] = [], now = new Date()) {
  return appointments.filter(item => new Date(`${item.date}T${item.time}:00+07:00`).getTime() >= now.getTime())
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export function appointmentCountdown(appointment: CareAppointment, now = new Date()) {
  const days = appointmentDaysAway(appointment, now);
  return days === 0 ? "มีนัดวันนี้" : days === 1 ? "มีนัดพรุ่งนี้" : `อีก ${days} วันถึงนัด`;
}

// Only tagged demo appointments roll forward; dates entered by a user stay intact.
export function syncAppointments(db: MockDatabase, now = new Date()): MockDatabase {
  const today = bangkokDate(now);
  let changed = false;
  const carePlans = db.carePlans.map(plan => {
    let planChanged = false;
    const appointments = plan.appointments?.map(item => {
      const legacySeed = item.id === `${plan.patientId}-appointment-followup` && item.date === "2026-07-16";
      const offset = item.prototypeOffsetDays ?? (legacySeed ? prototypeAppointmentOffset : undefined);
      if (offset === undefined) return item;
      const date = addCalendarDays(today, offset);
      if (item.date === date && item.prototypeOffsetDays === offset) return item;
      planChanged = changed = true;
      return { ...item, date, prototypeOffsetDays: offset };
    });
    return planChanged ? { ...plan, appointments } : plan;
  });
  const wanted: NotificationItem[] = [];
  for (const plan of carePlans) {
    for (const appointment of upcomingAppointments(plan.appointments, now)) {
      if (appointmentDaysAway(appointment, now) > 3) continue;
      for (const userRole of ["patient", "caregiver"] as const) {
        const id = `${reminderPrefix}${appointment.id}:${appointment.date}:${appointment.time}:${userRole}`;
        const previous = db.notifications.find(n => n.id === id);
        const title = appointmentCountdown(appointment, now);
        const message = `${appointment.title} · ${formatCalendarDate(appointment.date, { day: "numeric", month: "short", year: "numeric" })} เวลา ${appointment.time} น.${appointment.location ? ` · ${appointment.location}` : ""}`;
        // Keep read state and timestamp when refreshing the same reminder.
        if (previous && (previous.title !== title || previous.message !== message)) changed = true;
        wanted.push(previous ? { ...previous, title, message } : {
          id, userRole, patientId: plan.patientId, type: "appointment", read: false,
          title, message,
          date: now.toISOString()
        });
      }
    }
  }
  const wantedIds = new Set(wanted.map(n => n.id));
  const retained = db.notifications.filter(n => {
    // Replace the old fixed “tomorrow” prototype notice with dated reminders.
    if (n.id === "N-3-1" && n.title === "วันนัดหมายพบแพทย์") return false;
    return !n.id.startsWith(reminderPrefix) || wantedIds.has(n.id);
  });
  const additions = wanted.filter(n => !retained.some(existing => existing.id === n.id));
  if (retained.length !== db.notifications.length || additions.length) changed = true;
  return changed ? { ...db, carePlans, notifications: [...additions, ...retained.map(n => wanted.find(item => item.id === n.id) ?? n)] } : db;
}
