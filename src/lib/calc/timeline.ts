import type {
  Accommodation,
  AppData,
  BookingStatus,
  EventType,
  Exam,
  HHmm,
  ISODate,
  TimelineEvent,
  Transport,
  TransportDecision,
  TransportLeg,
  TransportMode,
  Trip,
} from "@/lib/types";
import { eventWorkOverlap, isWorkDay, workOverlapMinutes } from "./work";
import { toMinutes } from "./dates";
import { sortedLegs } from "./transport";

export type TimelineItemKind = "event" | "leg" | "arrival" | "check_in" | "check_out" | "exam" | "work" | "decision";

export interface TimelineItem {
  key: string;
  kind: TimelineItemKind;
  date: ISODate;
  time?: HHmm;
  endTime?: HHmm;
  title: string;
  subtitle?: string;
  location?: string;
  cost?: number;
  status?: BookingStatus;
  eventType?: EventType;
  mode?: TransportMode;
  /** Minutes of work this item overlaps. */
  workOverlapMin: number;
  keptDespiteWork?: boolean;
  source:
    | { kind: "event"; id: string }
    | { kind: "transport"; id: string; legId: string }
    | { kind: "accommodation"; id: string }
    | { kind: "exam"; id: string }
    | { kind: "decision"; id: string }
    | { kind: "work" };
  flexible: boolean;
  order: number;
}

export interface DayPlan {
  date: ISODate;
  items: TimelineItem[];
  timed: TimelineItem[];
  flexible: TimelineItem[];
  isWorkDay: boolean;
  isDayOff: boolean;
  transfer?: { from: string; to: string; transportId: string };
  stayTonight?: Accommodation;
}

interface Ctx {
  trip: Trip;
  events: TimelineEvent[];
  transports: Transport[];
  stays: Accommodation[];
  exams: Exam[];
  decisions: TransportDecision[];
}

export function timelineContext(data: AppData, trip: Trip): Ctx {
  return {
    trip,
    events: data.events.filter((e) => e.tripId === trip.id),
    transports: data.transports.filter((t) => t.tripId === trip.id && t.booking.status !== "cancelled"),
    stays: data.accommodations.filter((a) => a.tripId === trip.id && a.booking.status !== "cancelled"),
    exams: data.exams.filter((x) => x.tripId === trip.id),
    decisions: data.decisions.filter((d) => d.tripId === trip.id && !d.transportId),
  };
}

function legItem(t: Transport, leg: TransportLeg, ws: Trip["workSchedule"]): TimelineItem {
  return {
    key: `leg:${leg.id}`,
    kind: "leg",
    date: leg.departDate,
    time: leg.departTime,
    endTime: leg.arriveDate === leg.departDate ? leg.arriveTime : undefined,
    title: `${leg.from} → ${leg.to}`,
    subtitle: [leg.operator, leg.number].filter(Boolean).join(" · ") || undefined,
    cost: leg.cost,
    status: t.booking.status,
    mode: leg.mode,
    workOverlapMin: workOverlapMinutes(leg.departDate, leg.departTime, leg.arriveDate, leg.arriveTime, ws),
    source: { kind: "transport", id: t.id, legId: leg.id },
    flexible: false,
    order: 0,
  };
}

export function buildDay(ctx: Ctx, date: ISODate): DayPlan {
  const ws = ctx.trip.workSchedule;
  const items: TimelineItem[] = [];
  const work = isWorkDay(date, ws);
  const dayOff = !!ws.enabled && ws.daysOff.includes(date);

  if (work) {
    items.push({
      key: `work:${date}`,
      kind: "work",
      date,
      time: ws.start,
      endTime: ws.end,
      title: "Work",
      workOverlapMin: 0,
      source: { kind: "work" },
      flexible: false,
      order: 0,
    });
  }

  for (const e of ctx.events.filter((x) => x.date === date)) {
    items.push({
      key: `ev:${e.id}`,
      kind: "event",
      date,
      time: e.startTime,
      endTime: e.endTime,
      title: e.title,
      location: e.location,
      cost: e.cost,
      status: e.booking?.status,
      eventType: e.type,
      workOverlapMin: e.type === "work_session" ? 0 : eventWorkOverlap(date, e.startTime, e.endTime, ws),
      keptDespiteWork: e.keepDespiteWork,
      source: { kind: "event", id: e.id },
      flexible: !e.startTime,
      order: e.order,
    });
  }

  let transfer: DayPlan["transfer"];
  for (const t of ctx.transports) {
    const legs = sortedLegs(t.legs);
    for (const leg of legs) {
      if (leg.departDate === date) items.push(legItem(t, leg, ws));
      if (leg.arriveDate === date && leg.departDate !== date) {
        items.push({
          key: `arr:${leg.id}`,
          kind: "arrival",
          date,
          time: leg.arriveTime,
          title: `Arrive ${leg.to}`,
          subtitle: `${leg.from} → ${leg.to}`,
          mode: leg.mode,
          status: t.booking.status,
          workOverlapMin: 0,
          source: { kind: "transport", id: t.id, legId: leg.id },
          flexible: false,
          order: 0,
        });
      }
    }
    if (legs[0]?.departDate === date && !transfer) transfer = { from: t.from, to: t.to, transportId: t.id };
  }

  for (const s of ctx.stays) {
    if (s.checkIn === date) {
      items.push({
        key: `in:${s.id}`,
        kind: "check_in",
        date,
        time: s.checkInTime,
        title: `Check in · ${s.property}`,
        location: s.city,
        status: s.booking.status,
        workOverlapMin: 0,
        source: { kind: "accommodation", id: s.id },
        flexible: !s.checkInTime,
        order: 50,
      });
    }
    if (s.checkOut === date) {
      items.push({
        key: `out:${s.id}`,
        kind: "check_out",
        date,
        time: s.checkOutTime,
        title: `Check out · ${s.property}`,
        location: s.city,
        status: s.booking.status,
        workOverlapMin: 0,
        source: { kind: "accommodation", id: s.id },
        flexible: !s.checkOutTime,
        order: -50,
      });
    }
  }

  for (const x of ctx.exams.filter((e) => e.date === date)) {
    items.push({
      key: `ex:${x.id}`,
      kind: "exam",
      date,
      time: x.startTime,
      endTime: x.endTime,
      title: x.subject,
      subtitle: "Exam",
      location: x.venue,
      workOverlapMin: workOverlapMinutes(date, x.startTime, date, x.endTime, ws),
      source: { kind: "exam", id: x.id },
      flexible: false,
      order: 0,
    });
  }

  for (const d of ctx.decisions.filter((x) => x.date === date)) {
    items.push({
      key: `dec:${d.id}`,
      kind: "decision",
      date,
      title: `${d.from} → ${d.to}`,
      subtitle: `Not decided · ${d.options.length} options`,
      status: "need_to_book",
      workOverlapMin: 0,
      source: { kind: "decision", id: d.id },
      flexible: false,
      order: 0,
    });
    if (!transfer) transfer = { from: d.from, to: d.to, transportId: "" };
  }

  const timed = items
    .filter((i) => !i.flexible)
    .sort((a, b) => toMinutes(a.time ?? "00:00") - toMinutes(b.time ?? "00:00") || kindRank(a) - kindRank(b));
  const flexible = items.filter((i) => i.flexible).sort((a, b) => a.order - b.order);
  const stayTonight = ctx.stays.find((s) => date >= s.checkIn && date < s.checkOut);

  return { date, items: [...timed, ...flexible], timed, flexible, isWorkDay: work, isDayOff: dayOff, transfer, stayTonight };
}

function kindRank(i: TimelineItem) {
  // When times tie: check-out before travel, work band before things inside it.
  const order: Record<TimelineItemKind, number> = {
    check_out: 0,
    arrival: 1,
    work: 2,
    leg: 3,
    exam: 4,
    event: 5,
    check_in: 6,
    decision: -1,
  };
  return order[i.kind];
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  activity: "Activity",
  food: "Food",
  free_time: "Free time",
  note: "Note",
  work_session: "Work session",
  errand: "Errand",
  other: "Other",
};
