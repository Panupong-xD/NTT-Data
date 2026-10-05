// Calendar arithmetic uses UTC so dates do not drift with the device time zone.
export function bangkokDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(now);
}

export function calendarDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

export function addCalendarDays(key: string, amount: number): string {
  const date = calendarDate(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function shiftCalendarMonth(month: string, amount: number): string {
  const date = calendarDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

export function calendarMonthCells(month: string): Array<string | null> {
  const first = calendarDate(`${month}-01`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = first.getUTCDay();
  const length = Math.ceil((offset + days) / 7) * 7;
  return Array.from({ length }, (_, index) =>
    index < offset || index >= offset + days ? null : addCalendarDays(`${month}-01`, index - offset)
  );
}

export function formatCalendarDate(key: string, options: Intl.DateTimeFormatOptions): string {
  return calendarDate(key).toLocaleDateString("th-TH", { ...options, timeZone: "UTC" });
}
