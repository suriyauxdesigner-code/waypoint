"use client";

import * as React from "react";
import { ArrowRight, Briefcase, Coffee } from "lucide-react";
import { useData } from "@/lib/store/hooks";
import { buildDay, timelineContext } from "@/lib/calc/timeline";
import { dayName, diffDays, eachDay, fmtRange, monthName, parseISO } from "@/lib/calc/dates";
import { locationOn, phasesForTrip } from "@/lib/calc/trip";
import { PURPOSE_LABEL } from "@/lib/labels";
import { money } from "@/lib/format";
import { DayCard } from "@/components/timeline/day-card";
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
    <div ref={ref} className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
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
            aria-label={`${dayName(d, true)} ${date.getUTCDate()}`}
            className={cn(
              "flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-center transition-colors",
              isSel ? "bg-primary text-primary-foreground" : "card hover:bg-muted",
              d < today && !isSel && "text-subtle-foreground",
            )}
          >
            <span className={cn("text-[12px] font-medium", !isSel && "text-muted-foreground")}>{dayName(d).slice(0, 3)}</span>
            <span className="text-[17px] font-semibold leading-tight tabular">{date.getUTCDate()}</span>
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
      const y = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [focusDate]);

  return (
    <div className="grid grid-cols-1 gap-4">
      {days.map((date) => {
        const plan = buildDay(ctx, date);
        const phaseStart = phases.find((p) => p.startDate === date);
        const d = parseISO(date);
        const loc = locationOn(data, trip, date);
        const isToday = date === today;
        const dayNum = diffDays(trip.startDate, date) + 1;
        return (
          <React.Fragment key={date}>
            {phaseStart && (
              <button
                type="button"
                onClick={() => sheets.open({ type: "phase", id: phaseStart.id })}
                className="mt-4 rounded-xl px-1 text-left first:mt-0"
              >
                <p className="text-[13px] font-medium text-accent-foreground">Phase {phases.indexOf(phaseStart) + 1}</p>
                <p className="text-[22px] font-semibold tracking-tight">{phaseStart.name}</p>
                <p className="text-[14px] text-muted-foreground">
                  {fmtRange(phaseStart.startDate, phaseStart.endDate)} ·{" "}
                  {phaseStart.purposes.map((p) => (p === "custom" && phaseStart.customPurpose ? phaseStart.customPurpose : PURPOSE_LABEL[p])).join(" + ")}
                  {phaseStart.budget ? ` · ${money(phaseStart.budget, trip.currency)}` : ""}
                </p>
              </button>
            )}
            <DayCard
              id={`day-${date}`}
              className={cn("scroll-mt-40", isToday && "ring-2 ring-signal/50")}
              plan={plan}
              trip={trip}
              isToday={isToday}
              hints={false}
              compact
              showStay={false}
              header={
                <header
                  aria-label={`${dayName(date, true)} ${d.getUTCDate()} ${monthName(d.getUTCMonth(), true)}`}
                  className="flex min-h-14 items-center justify-between gap-3 border-b px-4 py-3 lg:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold tracking-tight">
                      {dayName(date)}, {d.getUTCDate()} {monthName(d.getUTCMonth())}
                      {isToday && <span className="ml-2 text-[13px] font-medium text-signal-foreground">Today</span>}
                    </p>
                    <p className="flex items-center gap-1 truncate text-[13px] text-muted-foreground">
                      {plan.transfer ? (
                        <>
                          {plan.transfer.from} <ArrowRight className="size-3.5 shrink-0" /> {plan.transfer.to}
                        </>
                      ) : (
                        loc
                      )}
                      {plan.stayTonight && <span className="truncate"> · {plan.stayTonight.property}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {plan.isDayOff && (
                      <Badge tone="signal">
                        <Coffee /> Day off
                      </Badge>
                    )}
                    {plan.isWorkDay && (
                      <Badge tone="neutral" className="hidden sm:inline-flex">
                        <Briefcase /> Work
                      </Badge>
                    )}
                    <span className="text-[14px] tabular text-muted-foreground">Day {dayNum}</span>
                  </div>
                </header>
              }
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
