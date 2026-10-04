"use client";

import type {
  Accommodation,
  BookingStatus,
  Booking,
  BudgetCategory,
  ChecklistItem,
  CurrencyCode,
  Destination,
  Exam,
  Expense,
  ISODate,
  PaymentMethod,
  TimelineEvent,
  Transport,
  TransportDecision,
  TransportOption,
  Trip,
  TripPhase,
  TripPurpose,
  WorkSchedule,
  CategoryRole,
} from "@/lib/types";
import { commit, del, getData, upsert } from "./store";
import type { Change } from "@/lib/data/repository";
import { uid } from "@/lib/utils";
import { DEFAULT_CATEGORY_TEMPLATE, DEFAULT_CHECKLIST_TEMPLATE } from "@/lib/data/defaults";
import { DEFAULT_WORK_SCHEDULE } from "@/lib/calc/work";
import { paidFor, type BookingSource } from "@/lib/calc/bookings";
import { addDays, diffDays } from "@/lib/calc/dates";
import { sortedLegs } from "@/lib/calc/transport";

const now = () => new Date().toISOString();

/* ------------------------------ settings ------------------------------ */

export function setActiveTrip(id: string) {
  commit({ op: "settings", patch: { activeTripId: id } });
}

export function setSimulatedDate(date: ISODate | null) {
  commit({ op: "settings", patch: { simulatedDate: date } });
}

export function setSimulatedTime(time: string | null) {
  commit({ op: "settings", patch: { simulatedTime: time } });
}

export function setTheme(theme: "system" | "light" | "dark") {
  commit({ op: "settings", patch: { theme } });
}

export function setUserName(name: string) {
  commit({ op: "user", patch: { name } });
}

/* ------------------------------ trips ------------------------------ */

export interface NewTripInput {
  name: string;
  destinations: string[];
  startDate: ISODate;
  endDate: ISODate;
  purpose: TripPurpose;
  currency: CurrencyCode;
  totalBudget: number;
  work: WorkSchedule;
}

export function createTrip(input: NewTripInput): string {
  const id = uid("trip");
  const ts = now();
  const trip: Trip = {
    id,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    purpose: input.purpose,
    currency: input.currency,
    totalBudget: input.totalBudget,
    workSchedule: input.work,
    createdAt: ts,
    updatedAt: ts,
  };
  const changes: Change[] = [upsert("trips", trip)];

  // Destinations spread evenly across the dates (editable later).
  const total = Math.max(1, diffDays(input.startDate, input.endDate));
  const n = input.destinations.length;
  input.destinations.forEach((name, i) => {
    const arrive = addDays(input.startDate, Math.round((total * i) / Math.max(1, n)));
    const depart = i === n - 1 ? input.endDate : addDays(input.startDate, Math.round((total * (i + 1)) / n));
    changes.push(
      upsert("destinations", { id: uid("dest"), tripId: id, name, arriveDate: arrive, departDate: depart, order: i }),
    );
  });

  // One phase covering the trip — users split it later.
  changes.push(
    upsert("phases", {
      id: uid("phase"),
      tripId: id,
      name: input.destinations.length ? input.destinations.join(" · ") : input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      location: input.destinations[0] ?? input.name,
      purposes: [input.purpose === "mixed" ? "custom" : input.purpose, ...(input.work.enabled && input.purpose !== "remote_work" ? (["remote_work"] as TripPurpose[]) : [])],
      budget: input.totalBudget || undefined,
      order: 0,
    }),
  );

  DEFAULT_CATEGORY_TEMPLATE.forEach((c, i) =>
    changes.push(
      upsert("categories", {
        id: uid("cat"),
        tripId: id,
        name: c.name,
        icon: c.icon,
        kind: c.kind,
        role: c.role,
        planned: Math.round((input.totalBudget * c.share) / 100) * 100,
        order: i,
      }),
    ),
  );

  const checklistId = uid("cl");
  changes.push(upsert("checklists", { id: checklistId, tripId: id, name: "Packing", isTemplate: false }));
  DEFAULT_CHECKLIST_TEMPLATE.forEach((item, i) =>
    changes.push(
      upsert("checklistItems", {
        id: uid("ci"),
        checklistId,
        section: item.section,
        name: item.name,
        quantity: item.quantity,
        packed: false,
        needToBuy: false,
        order: i,
      }),
    ),
  );

  changes.push({ op: "settings", patch: { activeTripId: id, simulatedDate: null } });
  commit(...changes);
  return id;
}

export function updateTrip(id: string, patch: Partial<Trip>) {
  const trip = getData().trips.find((t) => t.id === id);
  if (!trip) return;
  commit(upsert("trips", { ...trip, ...patch, updatedAt: now() }));
}

export function updateWorkSchedule(tripId: string, patch: Partial<WorkSchedule>) {
  const trip = getData().trips.find((t) => t.id === tripId);
  if (!trip) return;
  updateTrip(tripId, { workSchedule: { ...DEFAULT_WORK_SCHEDULE, ...trip.workSchedule, ...patch } });
}

export function toggleDayOff(tripId: string, date: ISODate) {
  const trip = getData().trips.find((t) => t.id === tripId);
  if (!trip) return;
  const set = new Set(trip.workSchedule.daysOff);
  if (set.has(date)) set.delete(date);
  else set.add(date);
  updateWorkSchedule(tripId, { daysOff: [...set].sort() });
}

export function deleteTrip(id: string) {
  const d = getData();
  const changes: Change[] = [del("trips", id)];
  const collections = [
    "phases", "destinations", "events", "transports", "decisions", "accommodations",
    "bookings", "exams", "expenses", "categories", "checklists",
  ] as const;
  for (const c of collections) {
    for (const r of d[c] as { id: string; tripId: string | null }[]) if (r.tripId === id) changes.push(del(c, r.id));
  }
  const clIds = new Set(d.checklists.filter((c) => c.tripId === id).map((c) => c.id));
  for (const i of d.checklistItems) if (clIds.has(i.checklistId)) changes.push(del("checklistItems", i.id));
  const nextActive = d.trips.find((t) => t.id !== id)?.id ?? null;
  changes.push({ op: "settings", patch: { activeTripId: nextActive } });
  commit(...changes);
}

/* ------------------------------ phases & destinations ------------------------------ */

export function savePhase(phase: Omit<TripPhase, "id" | "order"> & { id?: string; order?: number }) {
  const d = getData();
  const existing = phase.id ? d.phases.find((p) => p.id === phase.id) : undefined;
  const record: TripPhase = {
    ...phase,
    id: phase.id ?? uid("phase"),
    order: phase.order ?? existing?.order ?? d.phases.filter((p) => p.tripId === phase.tripId).length,
  };
  commit(upsert("phases", record));
  return record.id;
}

export function deletePhase(id: string) {
  const changes: Change[] = [del("phases", id)];
  for (const e of getData().expenses.filter((x) => x.phaseId === id)) {
    changes.push(upsert("expenses", { ...e, phaseId: undefined }));
  }
  commit(...changes);
}

export function saveDestination(dest: Omit<Destination, "id" | "order"> & { id?: string; order?: number }) {
  const d = getData();
  const record: Destination = {
    ...dest,
    id: dest.id ?? uid("dest"),
    order: dest.order ?? d.destinations.filter((x) => x.tripId === dest.tripId).length,
  };
  commit(upsert("destinations", record));
  return record.id;
}

export function deleteDestination(id: string) {
  commit(del("destinations", id));
}

export function reorderDestinations(tripId: string, orderedIds: string[]) {
  const d = getData();
  commit(
    ...orderedIds
      .map((id, i) => {
        const dest = d.destinations.find((x) => x.id === id && x.tripId === tripId);
        return dest ? upsert("destinations", { ...dest, order: i }) : null;
      })
      .filter((c): c is Change => !!c),
  );
}

/* ------------------------------ timeline events ------------------------------ */

export function saveEvent(event: Omit<TimelineEvent, "id" | "order"> & { id?: string; order?: number }) {
  const d = getData();
  const existing = event.id ? d.events.find((e) => e.id === event.id) : undefined;
  const sameDay = d.events.filter((e) => e.tripId === event.tripId && e.date === event.date);
  const record: TimelineEvent = {
    ...existing,
    ...event,
    id: event.id ?? uid("ev"),
    order:
      event.order ??
      (existing && existing.date === event.date ? existing.order : Math.max(0, ...sameDay.map((e) => e.order)) + 1),
  };
  commit(upsert("events", record));
  return record.id;
}

export function deleteEvent(id: string) {
  const changes: Change[] = [del("events", id)];
  for (const e of getData().expenses.filter((x) => x.linked?.kind === "event" && x.linked.id === id)) {
    changes.push(upsert("expenses", { ...e, linked: undefined }));
  }
  commit(...changes);
}

export function reorderEvents(orderedIds: string[]) {
  const d = getData();
  commit(
    ...orderedIds
      .map((id, i) => {
        const e = d.events.find((x) => x.id === id);
        return e ? upsert("events", { ...e, order: i + 1 }) : null;
      })
      .filter((c): c is Change => !!c),
  );
}

export function moveEvent(id: string, direction: -1 | 1) {
  const d = getData();
  const e = d.events.find((x) => x.id === id);
  if (!e) return;
  const siblings = d.events
    .filter((x) => x.tripId === e.tripId && x.date === e.date && !x.startTime)
    .sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((x) => x.id === id);
  const swap = siblings[idx + direction];
  if (!swap) return;
  const ids = siblings.map((s) => s.id);
  [ids[idx], ids[idx + direction]] = [ids[idx + direction], ids[idx]];
  reorderEvents(ids);
}

export function keepEventDespiteWork(id: string, keep = true) {
  const e = getData().events.find((x) => x.id === id);
  if (e) commit(upsert("events", { ...e, keepDespiteWork: keep }));
}

/* ------------------------------ expenses ------------------------------ */

export function saveExpense(expense: Omit<Expense, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
  const record: Expense = { ...expense, id: expense.id ?? uid("exp"), createdAt: expense.createdAt ?? now() };
  commit(upsert("expenses", record));
  return record.id;
}

export function deleteExpense(id: string) {
  const d = getData();
  const changes: Change[] = [del("expenses", id)];
  const item = d.checklistItems.find((i) => i.expenseId === id);
  if (item) changes.push(upsert("checklistItems", { ...item, expenseId: undefined }));
  commit(...changes);
}

export function restoreExpense(e: Expense) {
  commit(upsert("expenses", e));
}

/* ------------------------------ budget ------------------------------ */

export function updateTotalBudget(tripId: string, total: number) {
  updateTrip(tripId, { totalBudget: total });
}

export function saveCategory(cat: Omit<BudgetCategory, "id" | "order"> & { id?: string; order?: number }) {
  const d = getData();
  const record: BudgetCategory = {
    ...cat,
    id: cat.id ?? uid("cat"),
    order: cat.order ?? d.categories.filter((c) => c.tripId === cat.tripId).length,
  };
  commit(upsert("categories", record));
  return record.id;
}

/** Archive keeps history intact; expenses stay attributed. */
export function archiveCategory(id: string) {
  const c = getData().categories.find((x) => x.id === id);
  if (c) commit(upsert("categories", { ...c, archived: true }));
}

export function categoryForRole(tripId: string, role: CategoryRole) {
  const cats = getData().categories.filter((c) => c.tripId === tripId && !c.archived);
  return cats.find((c) => c.role === role) ?? cats.find((c) => c.role === "misc") ?? cats[0];
}

/* ------------------------------ bookings & payments ------------------------------ */

const SOURCE_ROLE: Record<Exclude<BookingSource, "decision">, CategoryRole> = {
  accommodation: "accommodation",
  transport: "long_transport",
  event: "activities",
  booking: "activities",
};

/**
 * Make the total paid for a booking equal `target` by adding (or trimming) linked expenses.
 * Keeps Money and Bookings consistent without a separate "amount paid" field.
 */
export function syncPayment(
  tripId: string,
  source: Exclude<BookingSource, "decision">,
  id: string,
  target: number,
  opts: { label: string; date: ISODate; method?: PaymentMethod; location?: string },
) {
  const d = getData();
  const current = paidFor(d.expenses.filter((e) => e.tripId === tripId), source, id);
  const diff = Math.round(target - current);
  if (diff === 0) return;
  const changes: Change[] = [];
  if (diff > 0) {
    const cat = categoryForRole(tripId, SOURCE_ROLE[source]);
    if (!cat) return;
    changes.push(
      upsert("expenses", {
        id: uid("exp"),
        tripId,
        amount: diff,
        categoryId: cat.id,
        merchant: opts.label,
        location: opts.location,
        date: opts.date,
        paymentMethod: opts.method ?? "upi",
        linked: { kind: source, id },
        notes: current > 0 ? "Balance payment" : undefined,
        createdAt: now(),
      }),
    );
  } else {
    // Remove most recent linked payments first.
    let toRemove = -diff;
    const linked = d.expenses
      .filter((e) => e.linked?.kind === source && e.linked.id === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const e of linked) {
      if (toRemove <= 0) break;
      if (e.amount <= toRemove) {
        changes.push(del("expenses", e.id));
        toRemove -= e.amount;
      } else {
        changes.push(upsert("expenses", { ...e, amount: e.amount - toRemove }));
        toRemove = 0;
      }
    }
  }
  commit(...changes);
}

export function setBookingStatus(source: BookingSource, id: string, status: BookingStatus) {
  const d = getData();
  if (source === "accommodation") {
    const a = d.accommodations.find((x) => x.id === id);
    if (a) commit(upsert("accommodations", { ...a, booking: { ...a.booking, status } }));
  } else if (source === "transport") {
    const t = d.transports.find((x) => x.id === id);
    if (t) commit(upsert("transports", { ...t, booking: { ...t.booking, status } }));
  } else if (source === "event") {
    const e = d.events.find((x) => x.id === id);
    if (e?.booking) commit(upsert("events", { ...e, booking: { ...e.booking, status } }));
  } else if (source === "booking") {
    const b = d.bookings.find((x) => x.id === id);
    if (b) commit(upsert("bookings", { ...b, booking: { ...b.booking, status } }));
  }
}

export function saveAccommodation(a: Omit<Accommodation, "id"> & { id?: string }) {
  const record: Accommodation = { ...a, id: a.id ?? uid("acc") };
  commit(upsert("accommodations", record));
  return record.id;
}

export function deleteAccommodation(id: string) {
  commit(...unlinkExpenses("accommodation", id), del("accommodations", id));
}

export function saveTransport(t: Omit<Transport, "id"> & { id?: string }) {
  const record: Transport = { ...t, id: t.id ?? uid("tr"), legs: sortedLegs(t.legs) };
  commit(upsert("transports", record));
  return record.id;
}

export function deleteTransport(id: string) {
  const d = getData();
  const changes: Change[] = [...unlinkExpenses("transport", id), del("transports", id)];
  for (const dec of d.decisions.filter((x) => x.transportId === id)) {
    changes.push(upsert("decisions", { ...dec, transportId: undefined, chosenOptionId: undefined }));
  }
  commit(...changes);
}

export function saveBooking(b: Omit<Booking, "id"> & { id?: string }) {
  const record: Booking = { ...b, id: b.id ?? uid("bk") };
  commit(upsert("bookings", record));
  return record.id;
}

export function deleteBooking(id: string) {
  commit(...unlinkExpenses("booking", id), del("bookings", id));
}

function unlinkExpenses(kind: NonNullable<Expense["linked"]>["kind"], id: string): Change[] {
  return getData()
    .expenses.filter((e) => e.linked?.kind === kind && e.linked.id === id)
    .map((e) => upsert("expenses", { ...e, linked: undefined }));
}

/* ------------------------------ exams ------------------------------ */

export function saveExam(x: Omit<Exam, "id"> & { id?: string }) {
  const record: Exam = { ...x, id: x.id ?? uid("exam") };
  commit(upsert("exams", record));
  return record.id;
}

export function deleteExam(id: string) {
  commit(del("exams", id));
}

/* ------------------------------ transport decisions ------------------------------ */

export function saveDecision(dec: Omit<TransportDecision, "id"> & { id?: string }) {
  const record: TransportDecision = { ...dec, id: dec.id ?? uid("dec") };
  commit(upsert("decisions", record));
  return record.id;
}

export function deleteDecision(id: string) {
  commit(del("decisions", id));
}

export function saveOption(decisionId: string, option: TransportOption) {
  const dec = getData().decisions.find((d) => d.id === decisionId);
  if (!dec) return;
  const exists = dec.options.some((o) => o.id === option.id);
  commit(
    upsert("decisions", {
      ...dec,
      options: exists ? dec.options.map((o) => (o.id === option.id ? option : o)) : [...dec.options, option],
    }),
  );
}

export function deleteOption(decisionId: string, optionId: string) {
  const dec = getData().decisions.find((d) => d.id === decisionId);
  if (!dec) return;
  commit(upsert("decisions", { ...dec, options: dec.options.filter((o) => o.id !== optionId) }));
}

/** Turn a compared option into a planned journey on the timeline (status: need to book). */
export function chooseOption(decisionId: string, optionId: string) {
  const d = getData();
  const dec = d.decisions.find((x) => x.id === decisionId);
  const opt = dec?.options.find((o) => o.id === optionId);
  if (!dec || !opt) return;
  const changes: Change[] = [];
  const transportId = dec.transportId ?? uid("tr");
  const existing = d.transports.find((t) => t.id === transportId);
  changes.push(
    upsert("transports", {
      id: transportId,
      tripId: dec.tripId,
      from: dec.from,
      to: dec.to,
      legs: sortedLegs(opt.legs).map((l) => ({ ...l, id: uid("leg") })),
      extras: opt.extras.map((e) => ({ ...e, id: uid("x") })),
      booking: existing?.booking ?? { status: "need_to_book", deadline: addDays(dec.date, -5), deadlineLabel: "Book before" },
      decisionId: dec.id,
      notes: opt.notes,
    }),
  );
  changes.push(upsert("decisions", { ...dec, chosenOptionId: optionId, transportId }));
  commit(...changes);
  return transportId;
}

export function reopenDecision(decisionId: string) {
  const dec = getData().decisions.find((x) => x.id === decisionId);
  if (!dec) return;
  const changes: Change[] = [upsert("decisions", { ...dec, chosenOptionId: undefined, transportId: undefined })];
  if (dec.transportId) {
    changes.push(...unlinkExpenses("transport", dec.transportId));
    changes.push(del("transports", dec.transportId));
  }
  commit(...changes);
}

/* ------------------------------ checklist ------------------------------ */

export function saveChecklistItem(item: Omit<ChecklistItem, "id" | "order"> & { id?: string; order?: number }) {
  const d = getData();
  const existing = item.id ? d.checklistItems.find((i) => i.id === item.id) : undefined;
  const record: ChecklistItem = {
    ...existing,
    ...item,
    id: item.id ?? uid("ci"),
    order: item.order ?? existing?.order ?? Math.max(0, ...d.checklistItems.map((i) => i.order)) + 1,
  };
  commit(upsert("checklistItems", record));
  return record.id;
}

export function togglePacked(id: string) {
  const i = getData().checklistItems.find((x) => x.id === id);
  if (i) commit(upsert("checklistItems", { ...i, packed: !i.packed }));
}

export function deleteChecklistItem(id: string) {
  commit(del("checklistItems", id));
}

/** Mark a need-to-buy item as bought and log it as a Shopping expense. */
export function markBought(itemId: string, tripId: string, amount: number, date: ISODate, method: PaymentMethod = "upi") {
  const d = getData();
  const item = d.checklistItems.find((i) => i.id === itemId);
  const cat = categoryForRole(tripId, "shopping");
  if (!item || !cat) return;
  const expenseId = uid("exp");
  commit(
    upsert("expenses", {
      id: expenseId,
      tripId,
      amount,
      categoryId: cat.id,
      merchant: item.name,
      date,
      paymentMethod: method,
      linked: { kind: "checklist", id: item.id },
      createdAt: now(),
    }),
    upsert("checklistItems", { ...item, needToBuy: false, actualCost: amount, expenseId }),
  );
}

export function ensureChecklist(tripId: string) {
  const d = getData();
  const existing = d.checklists.find((c) => c.tripId === tripId && !c.isTemplate);
  if (existing) return existing.id;
  const id = uid("cl");
  commit(upsert("checklists", { id, tripId, name: "Packing", isTemplate: false }));
  return id;
}

/** Save the current trip's list (unchecked) as a reusable template. */
export function saveChecklistAsTemplate(checklistId: string, name: string) {
  const d = getData();
  const templateId = uid("cl");
  const items = d.checklistItems.filter((i) => i.checklistId === checklistId);
  commit(
    upsert("checklists", { id: templateId, tripId: null, name, isTemplate: true }),
    ...items.map((i) =>
      upsert("checklistItems", {
        ...i,
        id: uid("ci"),
        checklistId: templateId,
        packed: false,
        expenseId: undefined,
        actualCost: undefined,
      }),
    ),
  );
  return templateId;
}

/** Add template items that are not already on the list. */
export function applyTemplate(templateId: string, checklistId: string) {
  const d = getData();
  const existing = new Set(
    d.checklistItems.filter((i) => i.checklistId === checklistId).map((i) => `${i.section}|${i.name.toLowerCase()}`),
  );
  let order = Math.max(0, ...d.checklistItems.map((i) => i.order));
  const toAdd = d.checklistItems
    .filter((i) => i.checklistId === templateId && !existing.has(`${i.section}|${i.name.toLowerCase()}`))
    .map((i) => upsert("checklistItems", { ...i, id: uid("ci"), checklistId, packed: false, order: ++order }));
  commit(...toAdd);
  return toAdd.length;
}

export function deleteTemplate(templateId: string) {
  const d = getData();
  commit(
    del("checklists", templateId),
    ...d.checklistItems.filter((i) => i.checklistId === templateId).map((i) => del("checklistItems", i.id)),
  );
}
