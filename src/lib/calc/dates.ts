import type { HHmm, ISODate } from "@/lib/types";

/** Calendar maths on ISO dates, done in UTC so the user's timezone never shifts a day. */

export function parseISO(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: ISODate, n: number): ISODate {
  const d = parseISO(date);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** Whole days from a → b (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

export function weekday(date: ISODate): number {
  return parseISO(date).getUTCDay();
}

export function isWeekend(date: ISODate) {
  const w = weekday(date);
  return w === 0 || w === 6;
}

export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const n = diffDays(start, end);
  for (let i = 0; i <= n; i++) out.push(addDays(start, i));
  return out;
}

export function isBetween(date: ISODate, start: ISODate, end: ISODate) {
  return date >= start && date <= end;
}

export function localTodayISO(): ISODate {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function localNowHHmm(): HHmm {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/* ---------- time ---------- */

export function toMinutes(t: HHmm): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(min: number): HHmm {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Absolute minutes since epoch-day for a date + time pair. */
export function absMinutes(date: ISODate, time: HHmm): number {
  return Math.round(parseISO(date).getTime() / 60_000) + toMinutes(time);
}

export function absToDateTime(abs: number): { date: ISODate; time: HHmm } {
  const dayStart = Math.floor(abs / 1440) * 1440;
  const date = toISO(new Date(dayStart * 60_000));
  return { date, time: fromMinutes(abs - dayStart) };
}

/* ---------- formatting ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function monthName(monthIndex: number, long = false) {
  return long ? MONTHS_LONG[monthIndex] : MONTHS[monthIndex];
}

export function dayName(date: ISODate, long = false) {
  return long ? DAYS_LONG[weekday(date)] : DAYS[weekday(date)];
}

/** "Dec 05" */
export function fmtShort(date: ISODate) {
  const d = parseISO(date);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** "5 Dec" */
export function fmtDayMonth(date: ISODate) {
  const d = parseISO(date);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Fri, 4 Dec" */
export function fmtWeekdayDate(date: ISODate) {
  return `${dayName(date)}, ${fmtDayMonth(date)}`;
}

/** "Friday, 4 December" */
export function fmtLong(date: ISODate) {
  const d = parseISO(date);
  return `${dayName(date, true)}, ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}`;
}

/** "29 Nov – 27 Dec" */
export function fmtRange(start: ISODate, end: ISODate) {
  if (start === end) return fmtDayMonth(start);
  const s = parseISO(start);
  const e = parseISO(end);
  if (s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${s.getUTCDate()}–${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]}`;
  }
  return `${fmtDayMonth(start)} – ${fmtDayMonth(end)}`;
}

/** "6:30 AM" style for friendly copy; timeline uses raw HH:mm. */
export function fmtTime12(t: HHmm) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hh} ${suffix}` : `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** 2020 → "33h 40m" */
export function fmtDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function relativeDayLabel(date: ISODate, today: ISODate) {
  const d = diffDays(today, date);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d > 1 && d < 7) return `In ${d} days`;
  if (d < -1 && d > -7) return `${-d} days ago`;
  return fmtDayMonth(date);
}
