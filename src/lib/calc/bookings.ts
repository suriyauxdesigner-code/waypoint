import type { AppData, BookingStatus, Expense, ISODate, PaymentStatus } from "@/lib/types";
import { sum } from "@/lib/utils";
import { addDays, diffDays, fmtDayMonth } from "./dates";
import { evaluateDecision, modeSummary, ticketCost, transportDeparture } from "./transport";
import { nights } from "./trip";

export type BookingKind = "transport" | "stay" | "activity" | "other";
export type BookingSource = "accommodation" | "transport" | "event" | "booking" | "decision";

export interface BookingView {
  key: string;
  kind: BookingKind;
  source: BookingSource;
  sourceId: string;
  title: string;
  subtitle?: string;
  date: ISODate;
  endDate?: ISODate;
  location?: string;
  price: number;
  /** True when the price is an estimate (e.g. undecided transport). */
  estimated?: boolean;
  paid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  deadline?: ISODate;
  deadlineLabel?: string;
  reference?: string;
  platform?: string;
}

export function paidFor(expenses: Expense[], kind: NonNullable<Expense["linked"]>["kind"], id: string) {
  return sum(
    expenses.filter((e) => e.linked?.kind === kind && e.linked.id === id),
    (e) => e.amount,
  );
}

function paymentStatus(price: number, paid: number): PaymentStatus {
  if (price <= 0) return "free";
  if (paid <= 0) return "unpaid";
  if (paid >= price) return "paid";
  return "partial";
}

export function accommodationTotal(a: { checkIn: ISODate; checkOut: ISODate; pricePerNight: number }) {
  return nights(a.checkIn, a.checkOut) * a.pricePerNight;
}

export function bookingsForTrip(data: AppData, tripId: string): BookingView[] {
  const ex = data.expenses.filter((e) => e.tripId === tripId);
  const trip = data.trips.find((t) => t.id === tripId);
  const out: BookingView[] = [];

  for (const a of data.accommodations.filter((x) => x.tripId === tripId)) {
    const price = accommodationTotal(a);
    const paid = paidFor(ex, "accommodation", a.id);
    out.push({
      key: `acc:${a.id}`,
      kind: "stay",
      source: "accommodation",
      sourceId: a.id,
      title: a.property,
      subtitle: `${nights(a.checkIn, a.checkOut)} nights · ${a.city}`,
      date: a.checkIn,
      endDate: a.checkOut,
      location: a.city,
      price,
      paid,
      balance: Math.max(0, price - paid),
      paymentStatus: paymentStatus(price, paid),
      status: a.booking.status,
      deadline: a.booking.deadline,
      deadlineLabel: a.booking.deadlineLabel,
      reference: a.booking.reference,
      platform: a.booking.platform,
    });
  }

  for (const t of data.transports.filter((x) => x.tripId === tripId)) {
    const price = ticketCost(t.legs);
    const paid = paidFor(ex, "transport", t.id);
    const dep = transportDeparture(t);
    out.push({
      key: `tr:${t.id}`,
      kind: "transport",
      source: "transport",
      sourceId: t.id,
      title: `${t.from} → ${t.to}`,
      subtitle: modeSummary(t.legs),
      date: dep?.departDate ?? trip?.startDate ?? "",
      location: t.from,
      price,
      paid,
      balance: Math.max(0, price - paid),
      paymentStatus: paymentStatus(price, paid),
      status: t.booking.status,
      deadline: t.booking.deadline,
      deadlineLabel: t.booking.deadlineLabel,
      reference: t.booking.reference,
      platform: t.booking.platform,
    });
  }

  // Undecided journeys still need booking — surface them with an estimated price.
  for (const d of data.decisions.filter((x) => x.tripId === tripId && !x.transportId)) {
    const res = evaluateDecision(d, trip?.workSchedule);
    const est = res.cheapest ? ticketCost(res.cheapest.option.legs) : 0;
    out.push({
      key: `dec:${d.id}`,
      kind: "transport",
      source: "decision",
      sourceId: d.id,
      title: `${d.from} → ${d.to}`,
      subtitle: `${d.options.length} options to compare`,
      date: d.date,
      location: d.from,
      price: est,
      estimated: true,
      paid: 0,
      balance: est,
      paymentStatus: "unpaid",
      status: "need_to_book",
      deadline: addDays(d.date, -5),
      deadlineLabel: "Decide & book",
    });
  }

  for (const e of data.events.filter((x) => x.tripId === tripId && x.booking)) {
    const price = e.cost ?? 0;
    const paid = paidFor(ex, "event", e.id);
    out.push({
      key: `ev:${e.id}`,
      kind: "activity",
      source: "event",
      sourceId: e.id,
      title: e.title,
      subtitle: e.startTime ? `${fmtDayMonth(e.date)} · ${e.startTime}` : fmtDayMonth(e.date),
      date: e.date,
      location: e.location,
      price,
      paid,
      balance: Math.max(0, price - paid),
      paymentStatus: paymentStatus(price, paid),
      status: e.booking!.status,
      deadline: e.booking!.deadline,
      deadlineLabel: e.booking!.deadlineLabel,
      reference: e.booking!.reference,
      platform: e.booking!.platform,
    });
  }

  for (const b of data.bookings.filter((x) => x.tripId === tripId)) {
    const paid = paidFor(ex, "booking", b.id);
    out.push({
      key: `bk:${b.id}`,
      kind: b.kind,
      source: "booking",
      sourceId: b.id,
      title: b.title,
      subtitle: b.location,
      date: b.date,
      endDate: b.endDate,
      location: b.location,
      price: b.price,
      paid,
      balance: Math.max(0, b.price - paid),
      paymentStatus: paymentStatus(b.price, paid),
      status: b.booking.status,
      deadline: b.booking.deadline,
      deadlineLabel: b.booking.deadlineLabel,
      reference: b.booking.reference,
      platform: b.booking.platform,
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/** Money still to leave the wallet for things already planned (not cancelled). */
export function committedBalance(views: BookingView[]) {
  return sum(
    views.filter((v) => v.status !== "cancelled"),
    (v) => v.balance,
  );
}

export interface Deadline {
  key: string;
  view: BookingView;
  date: ISODate;
  daysLeft: number;
  label: string;
}

export function upcomingDeadlines(views: BookingView[], today: ISODate): Deadline[] {
  return views
    .filter((v) => (v.status === "need_to_book" || v.status === "pending") && v.date >= today)
    .map((v) => {
      const date = v.deadline ?? addDays(v.date, -3);
      const verb = v.status === "need_to_book" ? "Book" : "Confirm";
      return {
        key: v.key,
        view: v,
        date,
        daysLeft: diffDays(today, date),
        label: `${verb} ${v.title} before ${fmtDayMonth(date)}`,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Booked",
  pending: "Pending",
  need_to_book: "Need to book",
  cancelled: "Cancelled",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  partial: "Part paid",
  unpaid: "Unpaid",
  free: "Free",
};
