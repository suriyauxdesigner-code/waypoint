import type { AppData, BudgetCategory, CategoryRole, Expense, ISODate, Trip } from "@/lib/types";
import { sum } from "@/lib/utils";
import { addDays, diffDays, eachDay } from "./dates";
import { bookingsForTrip, committedBalance, type BookingView } from "./bookings";
import { daysCompleted, daysRemaining, phasesForTrip, totalTripDays } from "./trip";
import { money, pct } from "@/lib/format";

export interface CategorySummary {
  category: BudgetCategory;
  planned: number;
  actual: number;
  remaining: number;
  /** Still to pay for bookings / planned purchases attributed to this category. */
  committed: number;
  /** Fraction of planned used by actual spend. */
  usedRatio: number;
  /** For daily categories: actual vs. pro-rated plan to date. */
  pace?: { expected: number; diff: number; ratio: number };
}

export interface DaySpend {
  date: ISODate;
  total: number;
  daily: number;
}

export interface Insight {
  id: string;
  tone: "positive" | "warning" | "neutral" | "danger";
  title: string;
  detail?: string;
}

export interface MoneySummary {
  budget: number;
  spent: number;
  remaining: number;
  usedRatio: number;
  totalDays: number;
  daysRemaining: number;
  daysElapsed: number;
  safeDaily: number;
  committed: number;
  plannedPurchases: number;
  safeDailyAfterCommitted: number;
  spentToday: number;
  todayTarget: number;
  todayDelta: number; // positive = under target
  todayExpenses: Expense[];
  avgDaily: number; // all spend / elapsed days (incl. today)
  avgDailyDiscretionary: number;
  projectedEndBalance: number;
  categories: CategorySummary[];
  days: DaySpend[];
  insights: Insight[];
  bookings: BookingView[];
}

const ROLE_FOR_BOOKING: Record<BookingView["kind"], CategoryRole> = {
  stay: "accommodation",
  transport: "long_transport",
  activity: "activities",
  other: "misc",
};

export function categoriesForTrip(data: AppData, tripId: string) {
  return data.categories
    .filter((c) => c.tripId === tripId && !c.archived)
    .sort((a, b) => a.order - b.order);
}

export function expensesForTrip(data: AppData, tripId: string) {
  return data.expenses
    .filter((e) => e.tripId === tripId)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? "") || b.createdAt.localeCompare(a.createdAt));
}

export function computeMoney(data: AppData, trip: Trip, today: ISODate): MoneySummary {
  const expenses = expensesForTrip(data, trip.id);
  const categories = categoriesForTrip(data, trip.id);
  const catById = new Map(data.categories.filter((c) => c.tripId === trip.id).map((c) => [c.id, c]));
  const dailyCatIds = new Set(categories.filter((c) => c.kind === "daily").map((c) => c.id));

  const budget = trip.totalBudget;
  const spent = sum(expenses, (e) => e.amount);
  const remaining = budget - spent;
  const totalDays = totalTripDays(trip);
  const left = Math.max(daysRemaining(trip, today), 0);
  const elapsedInclToday = Math.min(totalDays, Math.max(0, daysCompleted(trip, today) + (today >= trip.startDate && today <= trip.endDate ? 1 : 0)));

  const todayExpenses = expenses.filter((e) => e.date === today);
  const spentToday = sum(todayExpenses, (e) => e.amount);
  const spentBeforeToday = spent - spentToday;
  const divisor = Math.max(1, left);
  const safeDaily = left > 0 ? remaining / divisor : 0;
  const todayTarget = left > 0 ? (budget - spentBeforeToday) / divisor : 0;

  const bookings = bookingsForTrip(data, trip.id);
  const bookingCommitted = committedBalance(bookings);

  const checklistIds = new Set(data.checklists.filter((c) => c.tripId === trip.id).map((c) => c.id));
  const purchases = data.checklistItems.filter(
    (i) => checklistIds.has(i.checklistId) && i.needToBuy && i.includeInBudget && !i.expenseId,
  );
  const plannedPurchases = sum(purchases, (i) => (i.estimatedCost ?? 0) * Math.max(1, i.quantity));
  const committed = bookingCommitted + plannedPurchases;
  const safeDailyAfterCommitted = left > 0 ? (remaining - committed) / divisor : 0;

  // Daily series (trip start → min(today, end))
  const lastDay = today < trip.endDate ? today : trip.endDate;
  const dayList = today >= trip.startDate ? eachDay(trip.startDate, lastDay) : [];
  const days: DaySpend[] = dayList.map((date) => {
    const dayEx = expenses.filter((e) => e.date === date);
    return {
      date,
      total: sum(dayEx, (e) => e.amount),
      daily: sum(dayEx.filter((e) => dailyCatIds.has(e.categoryId)), (e) => e.amount),
    };
  });

  const discretionaryTotal = sum(days, (d) => d.daily);
  const avgDaily = elapsedInclToday > 0 ? sum(days, (d) => d.total) / elapsedInclToday : 0;
  // Exclude today from the discretionary average when it is still in progress.
  const fullDays = days.filter((d) => d.date < today);
  const avgDailyDiscretionary = fullDays.length
    ? sum(fullDays, (d) => d.daily) / fullDays.length
    : elapsedInclToday > 0
      ? discretionaryTotal / elapsedInclToday
      : 0;
  const projectedEndBalance =
    remaining - committed - avgDailyDiscretionary * Math.max(0, left - (spentToday > 0 ? 1 : 0));

  // Categories
  const committedByRole = new Map<CategoryRole, number>();
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const role = ROLE_FOR_BOOKING[b.kind];
    committedByRole.set(role, (committedByRole.get(role) ?? 0) + b.balance);
  }
  committedByRole.set("shopping", (committedByRole.get("shopping") ?? 0) + plannedPurchases);

  const elapsedRatio = elapsedInclToday / totalDays;
  const catSummaries: CategorySummary[] = categories.map((c) => {
    const actual = sum(
      expenses.filter((e) => e.categoryId === c.id),
      (e) => e.amount,
    );
    const committedHere = c.role ? (committedByRole.get(c.role) ?? 0) : 0;
    const s: CategorySummary = {
      category: c,
      planned: c.planned,
      actual,
      remaining: c.planned - actual,
      committed: committedHere,
      usedRatio: c.planned > 0 ? actual / c.planned : actual > 0 ? 1 : 0,
    };
    if (c.kind === "daily" && c.planned > 0 && elapsedInclToday > 0) {
      const expected = c.planned * elapsedRatio;
      s.pace = { expected, diff: actual - expected, ratio: expected > 0 ? (actual - expected) / expected : 0 };
    }
    return s;
  });

  // Uncategorised (archived/deleted category) spend still counts toward spent, shown as Misc.
  void catById;

  const insights = buildInsights({
    trip,
    today,
    data,
    remaining,
    committed,
    projectedEndBalance,
    days,
    categories: catSummaries,
    elapsedInclToday,
    todayDelta: todayTarget - spentToday,
    spentToday,
    left,
    avgDailyDiscretionary,
  });

  return {
    budget,
    spent,
    remaining,
    usedRatio: budget > 0 ? spent / budget : 0,
    totalDays,
    daysRemaining: left,
    daysElapsed: elapsedInclToday,
    safeDaily,
    committed,
    plannedPurchases,
    safeDailyAfterCommitted,
    spentToday,
    todayTarget,
    todayDelta: todayTarget - spentToday,
    todayExpenses,
    avgDaily,
    avgDailyDiscretionary,
    projectedEndBalance,
    categories: catSummaries,
    days,
    insights,
    bookings,
  };
}

function buildInsights(ctx: {
  trip: Trip;
  today: ISODate;
  data: AppData;
  remaining: number;
  committed: number;
  projectedEndBalance: number;
  days: DaySpend[];
  categories: CategorySummary[];
  elapsedInclToday: number;
  todayDelta: number;
  spentToday: number;
  left: number;
  avgDailyDiscretionary: number;
}): Insight[] {
  const out: Insight[] = [];
  const c = ctx.trip.currency;

  if (ctx.left > 0 && ctx.elapsedInclToday >= 2) {
    // Projection
    if (ctx.projectedEndBalance >= 0) {
      out.push({
        id: "projection",
        tone: "positive",
        title: `At your current pace you'll finish with about ${money(roundTo(ctx.projectedEndBalance, 100), c)} left.`,
        detail: `Based on your average day-to-day spend so far, plus ${money(ctx.committed, c)} still to pay for bookings and purchases.`,
      });
    } else {
      const sustainable = Math.max(0, (ctx.remaining - ctx.committed) / Math.max(1, ctx.left));
      out.push({
        id: "projection",
        tone: "warning",
        title: `At your current pace you'll run about ${money(roundTo(-ctx.projectedEndBalance, 100), c)} short.`,
        detail: `To finish on budget, keep day-to-day spend near ${money(roundTo(sustainable, 10), c)}/day — you've averaged ${money(roundTo(ctx.avgDailyDiscretionary, 10), c)}. ${money(ctx.committed, c)} is still to pay for bookings and purchases.`,
      });
    }
  }

  // Category pace (daily categories)
  const paced = ctx.categories
    .filter((s) => s.pace && Math.abs(s.pace.diff) >= 100 && Math.abs(s.pace.ratio) >= 0.1)
    .sort((a, b) => Math.abs(b.pace!.diff) - Math.abs(a.pace!.diff));
  const positives = paced.filter((p) => p.pace!.diff < 0).slice(0, 1);
  const negatives = paced.filter((p) => p.pace!.diff > 0).slice(0, 3 - positives.length);
  for (const s of [...positives, ...negatives]) {
    const name = s.category.name;
    if (s.pace!.diff < 0) {
      out.push({
        id: `pace-${s.category.id}`,
        tone: "positive",
        title: `You've spent ${pct(Math.abs(s.pace!.ratio))} less than planned on ${name.toLowerCase()}.`,
        detail: `${money(s.actual, c)} so far vs. ${money(s.pace!.expected, c)} expected by today.`,
      });
    } else {
      out.push({
        id: `pace-${s.category.id}`,
        tone: "warning",
        title: `${name} is ${money(s.pace!.diff, c)} over pace.`,
        detail: `${money(s.actual, c)} so far vs. ${money(s.pace!.expected, c)} expected by today.`,
      });
    }
  }

  // Fixed categories: what happens once bookings are paid
  for (const s of ctx.categories.filter((x) => x.category.kind === "fixed" && x.planned > 0)) {
    const projected = s.actual + s.committed;
    if (projected > s.planned * 1.02 && projected - s.planned >= 200) {
      out.push({
        id: `fixed-${s.category.id}`,
        tone: "warning",
        title: `${s.category.name} will be ${money(projected - s.planned, c)} over budget once bookings are paid.`,
        detail: `${money(s.actual, c)} paid + ${money(s.committed, c)} to pay vs. ${money(s.planned, c)} planned.`,
      });
    }
  }

  // Trend: last 3 full days vs previous 3
  const full = ctx.days.filter((d) => d.date < ctx.today);
  if (full.length >= 6) {
    const last3 = full.slice(-3);
    const prev3 = full.slice(-6, -3);
    const a = sum(last3, (d) => d.daily) / 3;
    const b = sum(prev3, (d) => d.daily) / 3;
    const diff = a - b;
    if (Math.abs(diff) >= 100) {
      out.push({
        id: "trend",
        tone: diff > 0 ? "warning" : "positive",
        title: `Your average daily spend ${diff > 0 ? "increased" : "dropped"} by ${money(Math.abs(diff), c)} over the last 3 days.`,
        detail: `Day-to-day spend only — stays and long-distance tickets excluded.`,
      });
    }
  } else if (full.length >= 4) {
    const last2 = full.slice(-2);
    const prev = full.slice(0, -2);
    const a = sum(last2, (d) => d.daily) / last2.length;
    const b = sum(prev, (d) => d.daily) / prev.length;
    const diff = a - b;
    if (Math.abs(diff) >= 100) {
      out.push({
        id: "trend",
        tone: diff > 0 ? "warning" : "positive",
        title: `Your average daily spend ${diff > 0 ? "increased" : "dropped"} by ${money(Math.abs(diff), c)} over the last 2 days.`,
        detail: `Day-to-day spend only — stays and long-distance tickets excluded.`,
      });
    }
  }

  // Phase budgets vs trip budget
  const phases = phasesForTrip(ctx.data, ctx.trip.id);
  const phaseTotal = sum(phases, (p) => p.budget ?? 0);
  if (phases.length && phaseTotal > ctx.trip.totalBudget) {
    out.push({
      id: "phases",
      tone: "neutral",
      title: `Phase budgets add up to ${money(phaseTotal, c)} — ${money(phaseTotal - ctx.trip.totalBudget, c)} more than your trip budget.`,
      detail: `Lower a phase budget or raise the trip budget so they agree.`,
    });
  }

  return out;
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}

/** Spend for a phase (expenses tagged with the phase, or falling in its dates when untagged). */
export function phaseSpend(data: AppData, phaseId: string) {
  const phase = data.phases.find((p) => p.id === phaseId);
  if (!phase) return 0;
  const phases = phasesForTrip(data, phase.tripId);
  return sum(
    data.expenses.filter((e) => {
      if (e.tripId !== phase.tripId) return false;
      if (e.phaseId) return e.phaseId === phaseId;
      // Boundary day belongs to the later phase.
      const owner = phases.filter((p) => e.date >= p.startDate && e.date <= p.endDate).pop();
      return owner?.id === phaseId;
    }),
    (e) => e.amount,
  );
}

export function recentDays(today: ISODate, n: number) {
  return Array.from({ length: n }, (_, i) => addDays(today, -i));
}

export function daysBetweenInclusive(a: ISODate, b: ISODate) {
  return diffDays(a, b) + 1;
}
