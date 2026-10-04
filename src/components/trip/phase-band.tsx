"use client";

import { Plus } from "lucide-react";
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

  return (
    <section aria-label="Trip phases">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">Phases</h2>
        <button
          type="button"
          onClick={() => sheets.open({ type: "phase" })}
          className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" /> Phase
        </button>
      </div>

      {phases.length === 0 ? (
        <button
          type="button"
          onClick={() => sheets.open({ type: "phase" })}
          className="mt-2 w-full rounded-lg border border-dashed px-4 py-4 text-left text-[13px] text-muted-foreground hover:bg-muted"
        >
          Split your trip into phases — e.g. backpacking, then exams — each with its own budget.
        </button>
      ) : (
        <>
          {/* Scale bar */}
          <div className="relative mt-2.5 flex h-2 gap-0.5" aria-hidden>
            {phases.map((p, i) => {
              const start = Math.max(0, diffDays(trip.startDate, p.startDate));
              const len = Math.max(1, diffDays(p.startDate, p.endDate) + (i === phases.length - 1 ? 1 : 0));
              return (
                <span
                  key={p.id}
                  className={cn("h-full rounded-full", i % 2 === 0 ? "bg-foreground/80" : "bg-foreground/35")}
                  style={{ flexGrow: len, flexBasis: 0, marginLeft: i === 0 && start > 0 ? `${(start / total) * 100}%` : undefined }}
                />
              );
            })}
            {todayPos !== null && (
              <span className="absolute -top-1 h-4 w-0.5 rounded bg-signal" style={{ left: `${todayPos * 100}%` }} title="Today" />
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {phases.map((p, i) => {
              const spent = phaseSpend(data, p.id);
              const current = today >= p.startDate && today <= p.endDate && (phases[i + 1]?.startDate !== today);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => sheets.open({ type: "phase", id: p.id })}
                  className={cn(
                    "rounded-lg border bg-surface px-3.5 py-3 text-left transition-colors hover:border-border-strong",
                    current && "border-foreground/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="eyebrow !text-[10px]">
                        Phase {i + 1}
                        {current && <span className="ml-1.5 text-signal-foreground">· Now</span>}
                      </p>
                      <p className="mt-0.5 truncate text-[15px] font-semibold tracking-tight">{p.name}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {fmtRange(p.startDate, p.endDate)} · {p.purposes.map((x) => (x === "custom" && p.customPurpose ? p.customPurpose : PURPOSE_LABEL[x])).join(" + ")}
                      </p>
                    </div>
                    {p.budget ? (
                      <p className="shrink-0 text-right text-[12px] tabular text-muted-foreground">
                        <span className="block text-[14px] font-semibold text-foreground">{money(p.budget, trip.currency)}</span>
                        budget
                      </p>
                    ) : null}
                  </div>
                  {p.budget ? (
                    <div className="mt-2.5">
                      <Meter value={spent / p.budget} tone={spent > p.budget ? "danger" : "default"} label={`${p.name} budget used`} />
                      <p className="mt-1 text-[11px] text-muted-foreground tabular">{money(spent, trip.currency)} spent</p>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
