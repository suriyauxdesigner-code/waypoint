import type { AppData, HHmm, ISODate, Trip } from "@/lib/types";
import { absMinutes, addDays, dayName, diffDays, eachDay, fmtDayMonth, fmtDuration, fmtTime12, relativeDayLabel } from "./dates";
import { buildDay, timelineContext } from "./timeline";
import { MODE_LABEL, modeSummary, realCost, sortedLegs, ticketCost } from "./transport";
import type { MoneySummary } from "./budget";
import { money } from "@/lib/format";
import type { BookingView } from "./bookings";

export type AlertTone = "info" | "warning" | "positive" | "danger";

export interface TravelAlert {
  id: string;
  tone: AlertTone;
  icon: "luggage" | "briefcase" | "bed" | "wallet" | "route" | "moon" | "ticket";
  title: string;
  detail?: string;
  href?: string;
  action?: string;
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function buildAlerts(
  data: AppData,
  trip: Trip,
  today: ISODate,
  nowTime: HHmm,
  money_: MoneySummary,
): TravelAlert[] {
  const out: TravelAlert[] = [];
  const ctx = timelineContext(data, trip);
  const horizon = addDays(today, 7);
  const c = trip.currency;

  // 1) Checkout → departure gaps
  for (const s of ctx.stays) {
    if (s.checkOut < today || s.checkOut > horizon) continue;
    const coTime = s.checkOutTime ?? "11:00";
    const dep = ctx.transports
      .flatMap((t) => sortedLegs(t.legs).slice(0, 1).map((l) => ({ t, l })))
      .find(({ l }) => l.departDate === s.checkOut);
    if (!dep) continue;
    const gap = absMinutes(dep.l.departDate, dep.l.departTime) - absMinutes(s.checkOut, coTime);
    if (gap >= 4 * 60) {
      const isWork = trip.workSchedule.enabled && buildDay(ctx, s.checkOut).isWorkDay;
      out.push({
        id: `gap:${s.id}`,
        tone: "warning",
        icon: "luggage",
        title: `Your ${s.property} checkout is ${fmtTime12(coTime)} but your ${MODE_LABEL[dep.l.mode].toLowerCase()} leaves at ${fmtTime12(dep.l.departTime)}.`,
        detail: `${fmtDuration(gap)} with your bags on ${relativeDayLabel(s.checkOut, today).toLowerCase() === "today" ? "today" : dayName(s.checkOut, true)}. ${isWork ? "Ask for luggage storage and a work-friendly café nearby, or a late checkout." : "Ask for luggage storage or a late checkout."}`,
        href: `/trip?date=${s.checkOut}`,
        action: "View day",
      });
    }
  }

  // 2) Work overlaps in the next 7 days (transport first — it is hardest to move)
  if (trip.workSchedule.enabled && trip.workSchedule.protectWorkHours) {
    for (const date of eachDay(today, horizon)) {
      const day = buildDay(ctx, date);
      for (const item of day.items) {
        if (item.workOverlapMin <= 0 || item.keptDespiteWork) continue;
        if (item.kind === "exam") continue; // handled via days off
        if (date === today && item.endTime && item.endTime < nowTime) continue;
        const when = relativeDayLabel(date, today);
        const what = item.kind === "leg" ? `${when}'s ${MODE_LABEL[item.mode!].toLowerCase()}` : `${item.title} (${when.toLowerCase() === "today" || when.toLowerCase() === "tomorrow" ? when.toLowerCase() : dayName(date)})`;
        out.push({
          id: `work:${item.key}`,
          tone: "warning",
          icon: "briefcase",
          title: `${capitalise(what)} overlaps ${fmtDuration(item.workOverlapMin)} of your work schedule.`,
          detail: item.kind === "leg" ? `${item.title} at ${item.time}. Consider an earlier or evening departure.` : `${item.time}${item.endTime ? `–${item.endTime}` : ""} on ${fmtDayMonth(date)}. Move it, or keep it and block the time with your team.`,
          href: `/trip?date=${date}`,
          action: "Review",
        });
      }
    }
  }

  // 3) Unbooked things coming up soon (stays first)
  const soon = money_.bookings
    .filter((b) => b.status === "need_to_book" && b.date >= today && diffDays(today, b.date) <= 14)
    .sort((a, b) => kindPriority(a) - kindPriority(b) || a.date.localeCompare(b.date));
  for (const b of soon.slice(0, 2)) {
    out.push(unbookedAlert(b, today, c));
  }

  // 4) Nights without a stay (excluding overnight travel)
  const gaps = uncoveredNights(data, trip, today);
  if (gaps.length) {
    out.push({
      id: "nights",
      tone: "info",
      icon: "moon",
      title: gaps.length === 1 ? `No stay planned for the night of ${fmtDayMonth(gaps[0])}.` : `${gaps.length} nights still have no stay planned.`,
      detail: gaps.length > 1 ? `First gap: ${fmtDayMonth(gaps[0])}.` : undefined,
      href: "/bookings?tab=stay",
      action: "Add stay",
    });
  }

  // 5) Money — under/over today's budget
  if (money_.daysRemaining > 0 && today >= trip.startDate) {
    if (money_.todayDelta >= 0) {
      out.push({
        id: "budget-today",
        tone: "positive",
        icon: "wallet",
        title: `You're ${money(money_.todayDelta, c)} under today's budget.`,
        detail: `Spend less today and tomorrow's safe allowance goes up automatically.`,
        href: "/money",
        action: "Money",
      });
    } else {
      out.push({
        id: "budget-today",
        tone: "danger",
        icon: "wallet",
        title: `You're ${money(-money_.todayDelta, c)} over today's budget.`,
        detail: `Your safe daily spend for the rest of the trip is now ${money(money_.safeDaily, c)}.`,
        href: "/money",
        action: "Money",
      });
    }
  }

  return out;
}

function kindPriority(b: BookingView) {
  return b.kind === "stay" ? 0 : b.kind === "transport" ? 1 : 2;
}

function unbookedAlert(b: BookingView, today: ISODate, c: Trip["currency"]): TravelAlert {
  if (b.source === "decision") {
    return {
      id: `unbooked:${b.key}`,
      tone: "info",
      icon: "route",
      title: `${b.title} on ${fmtDayMonth(b.date)} isn't decided yet.`,
      detail: `${b.subtitle}. Cheapest is around ${money(b.price, c)} in tickets.`,
      href: `/trip/transport?id=${b.sourceId}`,
      action: "Compare",
    };
  }
  const what = b.kind === "stay" ? `Your ${b.location ?? ""} accommodation`.replace("  ", " ") : b.title;
  return {
    id: `unbooked:${b.key}`,
    tone: "warning",
    icon: b.kind === "stay" ? "bed" : "ticket",
    title: `${what} is not booked yet.`,
    detail: b.deadline
      ? `Aim to book by ${fmtDayMonth(b.deadline)} — ${lowerFirst(relativeDayLabel(b.deadline, today))}.`
      : `Needed from ${fmtDayMonth(b.date)}.`,
    href: "/bookings",
    action: "Bookings",
  };
}

/** Nights (from today) where no stay covers the night and you are not travelling overnight. */
export function uncoveredNights(data: AppData, trip: Trip, today: ISODate): ISODate[] {
  const ctx = timelineContext(data, trip);
  const start = today > trip.startDate ? today : trip.startDate;
  const lastNight = addDays(trip.endDate, -1);
  if (start > lastNight) return [];
  const out: ISODate[] = [];
  for (const night of eachDay(start, lastNight)) {
    const covered = ctx.stays.some((s) => night >= s.checkIn && night < s.checkOut);
    if (covered) continue;
    const travelling = ctx.transports.some((t) =>
      t.legs.some((l) => l.departDate <= night && l.arriveDate > night),
    );
    if (travelling) continue;
    out.push(night);
  }
  return out;
}

export interface NextUp {
  kind: "transport" | "decision" | "check_in" | "exam";
  id: string;
  date: ISODate;
  time?: HHmm;
  title: string;
  subtitle: string;
  cost?: number;
  status: "confirmed" | "pending" | "need_to_book" | "cancelled" | "undecided";
  href: string;
}

export function nextUp(data: AppData, trip: Trip, today: ISODate, nowTime: HHmm): NextUp | undefined {
  const now = absMinutes(today, nowTime);
  const candidates: (NextUp & { at: number })[] = [];

  for (const t of data.transports.filter((x) => x.tripId === trip.id && x.booking.status !== "cancelled")) {
    const legs = sortedLegs(t.legs);
    const first = legs[0];
    if (!first) continue;
    const at = absMinutes(first.departDate, first.departTime);
    if (at < now) continue;
    candidates.push({
      kind: "transport",
      id: t.id,
      date: first.departDate,
      time: first.departTime,
      title: `${t.from} → ${t.to}`,
      subtitle: modeSummary(t.legs),
      cost: ticketCost(t.legs),
      status: t.booking.status,
      href: `/trip?date=${first.departDate}`,
      at,
    });
  }
  for (const d of data.decisions.filter((x) => x.tripId === trip.id && !x.transportId)) {
    const at = absMinutes(d.date, "00:00");
    if (at + 1440 < now) continue;
    const costs = d.options.map((o) => realCost(o));
    candidates.push({
      kind: "decision",
      id: d.id,
      date: d.date,
      title: `${d.from} → ${d.to}`,
      subtitle: `${d.options.length} options`,
      cost: costs.length ? Math.min(...costs) : undefined,
      status: "undecided",
      href: `/trip/transport?id=${d.id}`,
      at,
    });
  }
  for (const x of data.exams.filter((e) => e.tripId === trip.id)) {
    const at = absMinutes(x.date, x.startTime);
    if (at < now) continue;
    candidates.push({
      kind: "exam",
      id: x.id,
      date: x.date,
      time: x.startTime,
      title: x.subject,
      subtitle: `Exam · ${x.venue ?? ""}`.trim(),
      status: "confirmed",
      href: `/trip?date=${x.date}`,
      at,
    });
  }

  candidates.sort((a, b) => a.at - b.at);
  return candidates[0];
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
