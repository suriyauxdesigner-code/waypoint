"use client";

import * as React from "react";
import { ArrowRight, Briefcase, Coffee } from "lucide-react";
import { useData } from "@/lib/store/hooks";
import { buildDay, timelineContext } from "@/lib/calc/timeline";
import { dayName, eachDay, fmtRange, monthName, parseISO } from "@/lib/calc/dates";
import { locationOn, phasesForTrip } from "@/lib/calc/trip";
import { PURPOSE_LABEL } from "@/lib/labels";
import { money } from "@/lib/format";
import { DayTimeline } from "@/components/timeline/day-timeline";
import { Badge } from "@/components/ui/badge";
import { useSheets } from "@/components/forms/sheets-provider";
import type { Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DateStrip({
  trip,
  today,
  selected,
  onSelect,
}: {
  trip: Trip;
  today: string;
  selected?: string;
  onSelect: (d: string) => void;
}) {
  const days = eachDay(trip.startDate, trip.endDate);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-date="${selected ?? today}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selected, today]);
  return (
    <div ref={ref} className="no-scrollbar flex gap-1 overflow-x-auto">
      {days.map((d) => {
        const date = parseISO(d);
        const isSel = d === selected;
        const isToday = d === today;
        return (
          <button
            key={d}
            type="button"
            data-date={d}
            onClick={() => onSelect(d)}
            aria-pressed={isSel}
            className={cn(
              "flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-center transition-colors",
              isSel ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              d < today && !isSel && "text-subtle-foreground",
            )}
          >
            <span className={cn("text-[10px] font-medium uppercase", !isSel && "text-muted-foreground")}>{dayName(d).slice(0, 2)}</span>
            <span className="text-[16px] font-semibold tabular leading-tight">{date.getUTCDate()}</span>
            <span className={cn("mt-0.5 size-1 rounded-full", isToday ? (isSel ? "bg-primary-foreground" : "bg-signal") : "bg-transparent")} />
          </button>
        );
      })}
    </div>
  );
}

export function TripTimeline({ trip, today, focusDate }: { trip: Trip; today: string; focusDate?: string }) {
  const data = useData();
  const sheets = useSheets();
  const ctx = React.useMemo(() => timelineContext(data, trip), [data, trip]);
  const phases = phasesForTrip(data, trip.id);
  const days = eachDay(trip.startDate, trip.endDate);

  React.useEffect(() => {
    if (!focusDate) return;
    const el = document.getElementById(`day-${focusDate}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [focusDate]);

  return (
    <div className="grid grid-cols-1 gap-1">
      {days.map((date) => {
        const plan = buildDay(ctx, date);
        const phaseStart = phases.find((p) => p.startDate === date);
        const d = parseISO(date);
        const loc = locationOn(data, trip, date);
        const isToday = date === today;
        return (
          <React.Fragment key={date}>
            {phaseStart && (
              <button
                type="button"
                onClick={() => sheets.open({ type: "phase", id: phaseStart.id })}
                className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-foreground pt-3 text-left first:mt-0"
              >
                <span className="eyebrow !text-foreground">Phase {phases.indexOf(phaseStart) + 1}</span>
                <span className="text-[17px] font-semibold tracking-tight">{phaseStart.name}</span>
                <span className="text-[13px] text-muted-foreground">
                  {fmtRange(phaseStart.startDate, phaseStart.endDate)} ·{" "}
                  {phaseStart.purposes.map((p) => (p === "custom" && phaseStart.customPurpose ? phaseStart.customPurpose : PURPOSE_LABEL[p])).join(" + ")}
                  {phaseStart.budget ? ` · ${money(phaseStart.budget, trip.currency)}` : ""}
                </span>
              </button>
            )}
            <section id={`day-${date}`} aria-label={`${dayName(date, true)} ${d.getUTCDate()} ${monthName(d.getUTCMonth(), true)}`} className="scroll-mt-36 py-4">
              <header className="mb-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("eyebrow", isToday && "!text-signal-foreground")}>
                    {monthName(d.getUTCMonth(), true)} {String(d.getUTCDate()).padStart(2, "0")} · {dayName(date)}
                    {isToday && " · Today"}
                  </p>
                  <h3 className="mt-0.5 flex items-center gap-1.5 truncate text-[15px] font-semibold uppercase tracking-wide">
                    {plan.transfer ? (
                      <>
                        {plan.transfer.from} <ArrowRight className="size-3.5 shrink-0" /> {plan.transfer.to}
                      </>
                    ) : (
                      loc
                    )}
                  </h3>
                </div>
                <div className="flex shrink-0 gap-1">
                  {plan.isWorkDay && (
                    <Badge tone="outline">
                      <Briefcase /> {trip.workSchedule.start}–{trip.workSchedule.end}
                    </Badge>
                  )}
                  {plan.isDayOff && (
                    <Badge tone="signal">
                      <Coffee /> Day off
                    </Badge>
                  )}
                </div>
              </header>
              <DayTimeline plan={plan} trip={trip} isToday={isToday} editable hints={false} />
            </section>
            <div className="h-px bg-border" />
          </React.Fragment>
        );
      })}
    </div>
  );
}
