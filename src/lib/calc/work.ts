import type { HHmm, ISODate, WorkSchedule } from "@/lib/types";
import { absMinutes, addDays, diffDays, toMinutes, weekday } from "./dates";

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  enabled: false,
  days: [1, 2, 3, 4, 5],
  start: "10:00",
  end: "18:00",
  protectWorkHours: true,
  preferTransportOutsideWork: true,
  showWifiInfo: true,
  showWorkspaceStays: true,
  daysOff: [],
};

export function isWorkDay(date: ISODate, ws: WorkSchedule | undefined): boolean {
  if (!ws?.enabled) return false;
  if (ws.daysOff.includes(date)) return false;
  return ws.days.includes(weekday(date) as WorkSchedule["days"][number]);
}

export function workMinutesPerDay(ws: WorkSchedule) {
  return Math.max(0, toMinutes(ws.end) - toMinutes(ws.start));
}

/**
 * Minutes of work time overlapped by an interval that may span several days.
 * Interval is given as absolute start/end (date + time pairs).
 */
export function workOverlapMinutes(
  startDate: ISODate,
  startTime: HHmm,
  endDate: ISODate,
  endTime: HHmm,
  ws: WorkSchedule | undefined,
): number {
  if (!ws?.enabled) return 0;
  const a = absMinutes(startDate, startTime);
  const b = absMinutes(endDate, endTime);
  if (b <= a) return 0;
  const days = diffDays(startDate, endDate);
  let total = 0;
  for (let i = 0; i <= days; i++) {
    const d = addDays(startDate, i);
    if (!isWorkDay(d, ws)) continue;
    const ws0 = absMinutes(d, ws.start);
    const ws1 = absMinutes(d, ws.end);
    total += Math.max(0, Math.min(b, ws1) - Math.max(a, ws0));
  }
  return total;
}

/** Same-day helper for timeline events. Untimed events never conflict. */
export function eventWorkOverlap(
  date: ISODate,
  start: HHmm | undefined,
  end: HHmm | undefined,
  ws: WorkSchedule | undefined,
  defaultDurationMin = 60,
): number {
  if (!start) return 0;
  // An end time earlier than the start means the plan runs past midnight.
  if (end && toMinutes(end) < toMinutes(start)) return workOverlapMinutes(date, start, addDays(date, 1), end, ws);
  const endT =
    end && toMinutes(end) > toMinutes(start)
      ? end
      : minutesToHHmmSafe(toMinutes(start) + defaultDurationMin);
  return workOverlapMinutes(date, start, date, endT, ws);
}

function minutesToHHmmSafe(min: number): HHmm {
  const m = Math.min(min, 23 * 60 + 59);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export const WEEKDAY_LABELS: { value: WorkSchedule["days"][number]; short: string; long: string }[] = [
  { value: 1, short: "M", long: "Mon" },
  { value: 2, short: "T", long: "Tue" },
  { value: 3, short: "W", long: "Wed" },
  { value: 4, short: "T", long: "Thu" },
  { value: 5, short: "F", long: "Fri" },
  { value: 6, short: "S", long: "Sat" },
  { value: 0, short: "S", long: "Sun" },
];

export function describeSchedule(ws: WorkSchedule) {
  const sorted = WEEKDAY_LABELS.filter((d) => ws.days.includes(d.value));
  const mondayToFriday = [1, 2, 3, 4, 5].every((d) => ws.days.includes(d as never)) && ws.days.length === 5;
  const dayLabel = mondayToFriday ? "Mon–Fri" : sorted.map((d) => d.long).join(", ");
  return `${dayLabel} · ${ws.start}–${ws.end}`;
}
