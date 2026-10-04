import type {
  DecisionPriority,
  Transport,
  TransportDecision,
  TransportLeg,
  TransportMode,
  TransportOption,
  WorkSchedule,
} from "@/lib/types";
import { absMinutes, fmtDuration } from "./dates";
import { workOverlapMinutes } from "./work";
import { sum } from "@/lib/utils";

export const MODE_LABEL: Record<TransportMode, string> = {
  bus: "Bus",
  train: "Train",
  flight: "Flight",
  cab: "Cab",
  auto: "Auto",
  ferry: "Ferry",
  metro: "Metro",
  scooter: "Scooter",
  walk: "Walk",
  other: "Other",
};

export function legDurationMin(leg: TransportLeg) {
  return Math.max(0, absMinutes(leg.arriveDate, leg.arriveTime) - absMinutes(leg.departDate, leg.departTime));
}

export function sortedLegs(legs: TransportLeg[]) {
  return [...legs].sort(
    (a, b) => absMinutes(a.departDate, a.departTime) - absMinutes(b.departDate, b.departTime),
  );
}

/** Door-to-door travel time: first departure → last arrival (includes layovers). */
export function travelDurationMin(legs: TransportLeg[]) {
  if (!legs.length) return 0;
  const s = sortedLegs(legs);
  const first = s[0];
  const last = s.reduce((acc, l) =>
    absMinutes(l.arriveDate, l.arriveTime) > absMinutes(acc.arriveDate, acc.arriveTime) ? l : acc,
  );
  return Math.max(0, absMinutes(last.arriveDate, last.arriveTime) - absMinutes(first.departDate, first.departTime));
}

export function ticketCost(legs: TransportLeg[]) {
  return sum(legs, (l) => l.cost);
}

/** Total real cost = tickets + every extra (station transfers, food, baggage…). */
export function realCost(item: { legs: TransportLeg[]; extras: { amount: number }[] }) {
  return ticketCost(item.legs) + sum(item.extras, (e) => e.amount);
}

export function modeSummary(legs: TransportLeg[]) {
  const modes: string[] = [];
  for (const l of sortedLegs(legs)) {
    const label = MODE_LABEL[l.mode];
    if (modes[modes.length - 1] !== label) modes.push(label);
  }
  return modes.join(" + ");
}

export function journeyWorkOverlap(legs: TransportLeg[], ws: WorkSchedule | undefined) {
  if (!legs.length) return 0;
  const s = sortedLegs(legs);
  const first = s[0];
  const last = s[s.length - 1];
  return workOverlapMinutes(first.departDate, first.departTime, last.arriveDate, last.arriveTime, ws);
}

export function transportDeparture(t: Pick<Transport, "legs">) {
  const s = sortedLegs(t.legs);
  return s[0];
}

export function transportArrival(t: Pick<Transport, "legs">) {
  const s = sortedLegs(t.legs);
  return s[s.length - 1];
}

/* ------------------------------------------------------------------ */
/* Decision engine                                                     */
/* ------------------------------------------------------------------ */

export const PRIORITY_WEIGHTS: Record<
  DecisionPriority,
  { cost: number; time: number; work: number; comfort: number }
> = {
  money: { cost: 0.6, time: 0.15, work: 0.15, comfort: 0.1 },
  balanced: { cost: 0.35, time: 0.3, work: 0.2, comfort: 0.15 },
  time: { cost: 0.15, time: 0.55, work: 0.2, comfort: 0.1 },
};

export const PRIORITY_LABEL: Record<DecisionPriority, string> = {
  money: "Save money",
  balanced: "Balanced",
  time: "Save time",
};

export interface OptionMetrics {
  option: TransportOption;
  ticket: number;
  extras: number;
  total: number;
  durationMin: number;
  workOverlapMin: number;
  transfers: number;
  comfort: number;
  /** Compared with the cheapest option. */
  extraCostVsCheapest: number;
  timeSavedVsCheapestMin: number;
  costPerHourSaved: number | null;
  scores: { cost: number; time: number; work: number; comfort: number };
  weighted: { cost: number; time: number; work: number; comfort: number };
  totalScore: number;
}

export interface DecisionResult {
  metrics: OptionMetrics[];
  cheapest?: OptionMetrics;
  fastest?: OptionMetrics;
  leastDisruptive?: OptionMetrics;
  bestValue?: OptionMetrics;
  reasons: string[];
}

/** 1 = best, 0 = worst, linear between. Ties (max === min) score 1 for everyone. */
function normaliseLowerBetter(v: number, min: number, max: number) {
  if (max === min) return 1;
  return (max - v) / (max - min);
}

export function evaluateDecision(
  decision: Pick<TransportDecision, "options" | "priority">,
  ws: WorkSchedule | undefined,
): DecisionResult {
  const base = decision.options.map((option) => {
    const ticket = ticketCost(option.legs);
    const extras = sum(option.extras, (e) => e.amount);
    return {
      option,
      ticket,
      extras,
      total: ticket + extras,
      durationMin: travelDurationMin(option.legs),
      workOverlapMin: journeyWorkOverlap(option.legs, ws),
      transfers: Math.max(0, option.legs.length - 1),
      comfort: option.comfort,
    };
  });
  if (!base.length) return { metrics: [], reasons: [] };

  const min = (k: keyof (typeof base)[number]) => Math.min(...base.map((b) => b[k] as number));
  const max = (k: keyof (typeof base)[number]) => Math.max(...base.map((b) => b[k] as number));
  const cheapestBase = [...base].sort((a, b) => a.total - b.total || a.durationMin - b.durationMin)[0];
  const w = PRIORITY_WEIGHTS[decision.priority];

  // Convenience blends comfort (1–5) and number of changes.
  const convenienceRaw = (b: (typeof base)[number]) => b.comfort - b.transfers * 0.75;
  const convMin = Math.min(...base.map(convenienceRaw));
  const convMax = Math.max(...base.map(convenienceRaw));

  const metrics: OptionMetrics[] = base.map((b) => {
    const scores = {
      cost: normaliseLowerBetter(b.total, min("total"), max("total")),
      time: normaliseLowerBetter(b.durationMin, min("durationMin"), max("durationMin")),
      work: normaliseLowerBetter(b.workOverlapMin, min("workOverlapMin"), max("workOverlapMin")),
      comfort: convMax === convMin ? 1 : (convenienceRaw(b) - convMin) / (convMax - convMin),
    };
    const weighted = {
      cost: scores.cost * w.cost * 100,
      time: scores.time * w.time * 100,
      work: scores.work * w.work * 100,
      comfort: scores.comfort * w.comfort * 100,
    };
    const extraCost = b.total - cheapestBase.total;
    const saved = cheapestBase.durationMin - b.durationMin;
    return {
      ...b,
      extraCostVsCheapest: extraCost,
      timeSavedVsCheapestMin: saved,
      costPerHourSaved: saved > 0 && extraCost > 0 ? extraCost / (saved / 60) : null,
      scores,
      weighted,
      totalScore: weighted.cost + weighted.time + weighted.work + weighted.comfort,
    };
  });

  const cheapest = [...metrics].sort((a, b) => a.total - b.total || a.durationMin - b.durationMin)[0];
  const fastest = [...metrics].sort((a, b) => a.durationMin - b.durationMin || a.total - b.total)[0];
  const leastDisruptive = [...metrics].sort((a, b) => a.workOverlapMin - b.workOverlapMin || a.total - b.total)[0];
  const bestValue = [...metrics].sort((a, b) => b.totalScore - a.totalScore)[0];

  const reasons: string[] = [];
  if (bestValue) {
    const factors = (Object.keys(bestValue.weighted) as (keyof OptionMetrics["weighted"])[])
      .sort((a, b) => bestValue.weighted[b] - bestValue.weighted[a])
      .slice(0, 2);
    const names = { cost: "cost", time: "travel time", work: "work disruption", comfort: "convenience" };
    reasons.push(
      `${bestValue.option.label} scores ${Math.round(bestValue.totalScore)}/100 with "${PRIORITY_LABEL[decision.priority]}" weights — strongest on ${factors.map((f) => names[f]).join(" and ")}.`,
    );
    if (bestValue !== cheapest && bestValue.costPerHourSaved) {
      reasons.push(
        `It costs ₹${Math.round(bestValue.extraCostVsCheapest).toLocaleString("en-IN")} more than ${cheapest.option.label} but saves ${fmtDuration(bestValue.timeSavedVsCheapestMin)} — about ₹${Math.round(bestValue.costPerHourSaved).toLocaleString("en-IN")} per hour saved.`,
      );
    }
    if (bestValue === cheapest) reasons.push(`It is also the cheapest option.`);
    if (bestValue.workOverlapMin > 0)
      reasons.push(`Heads up: it overlaps ${fmtDuration(bestValue.workOverlapMin)} of your work hours.`);
  }

  return { metrics, cheapest, fastest, leastDisruptive, bestValue, reasons };
}
