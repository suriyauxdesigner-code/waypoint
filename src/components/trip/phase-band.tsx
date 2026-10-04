"use client";

import { ChevronRight, Plus } from "lucide-react";
import { useSheets } from "@/components/forms/sheets-provider";
import { useData } from "@/lib/store/hooks";
import { diffDays, fmtRange } from "@/lib/calc/dates";
import { phasesForTrip, totalTripDays } from "@/lib/calc/trip";
import { phaseSpend } from "@/lib/calc/budget";
import { PURPOSE_LABEL } from "@/lib/labels";
import { money } from "@/lib/format";
import { Meter } from "@/components/ui/progress";
import type { Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Trip phases drawn to scale across the trip, with spend vs. phase budget. */
export function PhaseBand({ trip, today }: { trip: Trip; today: string }) {
  const data = useData();
  const sheets = useSheets();
  const phases = phasesForTrip(data, trip.id);
  const total = totalTripDays(trip);
  const todayPos = today >= trip.startDate && today <= trip.endDate ? (diffDays(trip.startDate, today) + 0.5) / total : null;

  if (phases.length === 0) {
    return (
      <button
        type="button"
        onClick={() => sheets.open({ type: "phase" })}
        className="flex w-full items-center gap-3 rounded-card border border-dashed border-border-strong px-4 py-3.5 text-left text-[14px] text-muted-foreground transition-colors hover:bg-surface"
      >
        <Plus className="size-4 shrink-0" />
        <span>Split the trip into parts (e.g. backpacking, then exams), each with its own budget. Optional.</span>
      </button>
    );
  }

  return (
    <section aria-label="Trip phases" className="card">
      <div className="px-4 pb-1 pt-4 lg:px-5">
        <div className="relative flex h-2 gap-1" aria-hidden>
          {phases.map((p, i) => {
            const start = Math.max(0, diffDays(trip.startDate, p.startDate));
            const len = Math.max(1, diffDays(p.startDate, p.endDate) + (i === phases.length - 1 ? 1 : 0));
            return (
              <span
                key={p.id}
                className={cn("h-full rounded-full", i % 2 === 0 ? "bg-accent" : "bg-accent/40")}
                style={{ flexGrow: len, flexBasis: 0, marginLeft: i === 0 && start > 0 ? `${(start / total) * 100}%` : undefined }}
              />
            );
          })}
          {todayPos !== null && <span className="absolute -top-1 h-4 w-1 rounded-full bg-signal ring-2 ring-surface" style={{ left: `${todayPos * 100}%` }} title="Today" />}
        </div>
      </div>
      <ul className="divide-y">
        {phases.map((p, i) => {
          const spent = phaseSpend(data, p.id);
          const current = today >= p.startDate && today <= p.endDate && phases[i + 1]?.startDate !== today;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => sheets.open({ type: "phase", id: p.id })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 lg:px-5"
              >
                <span className={cn("size-2.5 shrink-0 rounded-full", i % 2 === 0 ? "bg-accent" : "bg-accent/40")} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                    {p.name}
                    {current && <span className="text-[12px] font-medium text-signal-foreground">Now</span>}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">
                    {fmtRange(p.startDate, p.endDate)} · {p.purposes.map((x) => (x === "custom" && p.customPurpose ? p.customPurpose : PURPOSE_LABEL[x])).join(" + ")}
                  </span>
                  {p.budget ? <Meter value={spent / p.budget} tone={spent > p.budget ? "danger" : "default"} className="mt-2 h-1" label={`${p.name} budget used`} /> : null}
                </span>
                {p.budget ? (
                  <span className="shrink-0 text-right text-[13px] tabular text-muted-foreground">
                    <span className="block text-[15px] font-semibold text-foreground">{money(spent, trip.currency)}</span>
                    of {money(p.budget, trip.currency)}
                  </span>
                ) : null}
                <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => sheets.open({ type: "phase" })}
        className="flex h-11 w-full items-center gap-2 border-t px-4 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground lg:px-5"
      >
        <Plus className="size-4" /> Add phase
      </button>
    </section>
  );
}
