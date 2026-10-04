"use client";

import * as React from "react";
import { Bed, GraduationCap, Route } from "lucide-react";
import { useData } from "@/lib/store/hooks";
import { buildDay, timelineContext, type DayPlan } from "@/lib/calc/timeline";
import { addDays, eachDay, fmtLong, monthName, parseISO, toISO } from "@/lib/calc/dates";
import { MODE_ICONS } from "@/components/common/icons";
import { DayCard } from "@/components/timeline/day-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ISODate, Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthsBetween(start: ISODate, end: ISODate) {
  const out: { year: number; month: number }[] = [];
  const s = parseISO(start);
  const e = parseISO(end);
  let y = s.getUTCFullYear();
  let m = s.getUTCMonth();
  while (y < e.getUTCFullYear() || (y === e.getUTCFullYear() && m <= e.getUTCMonth())) {
    out.push({ year: y, month: m });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
}

function Markers({ plan }: { plan: DayPlan }) {
  const leg = plan.items.find((i) => i.kind === "leg");
  const decision = plan.items.some((i) => i.kind === "decision");
  const checkIn = plan.items.some((i) => i.kind === "check_in");
  const exam = plan.items.some((i) => i.kind === "exam");
  const activities = plan.items.filter((i) => i.kind === "event" && i.eventType !== "note" && i.eventType !== "errand").length;
  const LegIcon = leg?.mode ? MODE_ICONS[leg.mode] : null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 text-muted-foreground sm:justify-start [&_svg]:size-3">
      {LegIcon && <LegIcon aria-label="Transport" />}
      {decision && <Route aria-label="Undecided transport" className="text-warning-foreground" />}
      {checkIn && <Bed aria-label="Check-in" />}
      {exam && <GraduationCap aria-label="Exam" className="text-signal-foreground" />}
      {activities > 0 && (
        <span className="flex gap-0.5" aria-label={`${activities} plans`}>
          {Array.from({ length: Math.min(activities, 3) }).map((_, i) => (
            <span key={i} className="size-1 rounded-full bg-foreground/50" />
          ))}
        </span>
      )}
    </div>
  );
}

export function TripCalendar({ trip, today, selected, onSelect }: { trip: Trip; today: string; selected: ISODate; onSelect: (d: ISODate) => void }) {
  const data = useData();
  const ctx = React.useMemo(() => timelineContext(data, trip), [data, trip]);
  const months = monthsBetween(trip.startDate, trip.endDate);
  const plan = React.useMemo(() => buildDay(ctx, selected), [ctx, selected]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
      <div className="grid grid-cols-1 gap-6">
        {months.map(({ year, month }) => {
          const first = toISO(new Date(Date.UTC(year, month, 1)));
          const last = toISO(new Date(Date.UTC(year, month + 1, 0)));
          const lead = (parseISO(first).getUTCDay() + 6) % 7; // Monday-first
          const cells: (ISODate | null)[] = [...Array(lead).fill(null), ...eachDay(first, last)];
          while (cells.length % 7) cells.push(null);
          // Only show weeks that touch the trip.
          const weeks: (ISODate | null)[][] = [];
          for (let w = 0; w < cells.length; w += 7) weeks.push(cells.slice(w, w + 7));
          const visible = weeks.filter((wk) => wk.some((d) => d && d >= trip.startDate && d <= trip.endDate)).flat();
          return (
            <section key={`${year}-${month}`} aria-label={`${monthName(month, true)} ${year}`} className="card p-3 lg:p-4">
              <h3 className="mb-2 px-1 text-[17px] font-semibold tracking-tight">
                {monthName(month, true)} <span className="font-normal text-muted-foreground">{year}</span>
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {WEEK.map((w) => (
                  <div key={w} className="py-1 text-center text-[12px] font-medium text-muted-foreground">
                    {w.slice(0, 1)}<span className="hidden sm:inline">{w.slice(1)}</span>
                  </div>
                ))}
                {visible.map((d, i) => {
                  if (!d) return <div key={`e${i}`} className="min-h-[60px]" />;
                  const inTrip = d >= trip.startDate && d <= trip.endDate;
                  const p = inTrip ? buildDay(ctx, d) : null;
                  const isSel = d === selected;
                  const isToday = d === today;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!inTrip}
                      onClick={() => onSelect(d)}
                      aria-pressed={isSel}
                      aria-label={fmtLong(d)}
                      className={cn(
                        "relative flex min-h-[60px] flex-col items-center gap-1 rounded-xl p-1 text-left transition-colors sm:min-h-[84px] sm:items-start sm:p-1.5",
                        inTrip ? "bg-surface-2 hover:bg-muted" : "text-subtle-foreground/60",
                        isSel && "bg-accent-soft ring-2 ring-accent",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 place-content-center rounded-full text-[14px] font-medium tabular",
                          isToday && "bg-signal text-white",
                        )}
                      >
                        {parseISO(d).getUTCDate()}
                      </span>
                      {p && <Markers plan={p} />}
                      {p?.isWorkDay && <span aria-label="Work day" className="absolute inset-x-1.5 bottom-1.5 h-1 rounded-full bg-foreground/20" />}
                      {p?.stayTonight && !p.isWorkDay && <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 h-px bg-border-strong" />}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <ul className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-[13px] text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-5 rounded-full work-stripes" /> Work
          </li>
          <li className="flex items-center gap-1.5">
            <MODE_ICONS.train className="size-3" /> Transport
          </li>
          <li className="flex items-center gap-1.5">
            <Bed className="size-3" /> Check-in
          </li>
          <li className="flex items-center gap-1.5">
            <GraduationCap className="size-3 text-signal-foreground" /> Exam
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-foreground/50" /> Activities
          </li>
        </ul>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <DayCard
          plan={plan}
          trip={trip}
          isToday={selected === today}
          header={
            <div className="flex min-h-14 items-center gap-1 border-b px-2 py-2">
              <Button variant="ghost" size="icon-sm" aria-label="Previous day" disabled={selected <= trip.startDate} onClick={() => onSelect(addDays(selected, -1))}>
                <ChevronLeft />
              </Button>
              <p className="min-w-0 flex-1 truncate text-center text-[16px] font-semibold tracking-tight">{fmtLong(selected)}</p>
              <Button variant="ghost" size="icon-sm" aria-label="Next day" disabled={selected >= trip.endDate} onClick={() => onSelect(addDays(selected, 1))}>
                <ChevronRight />
              </Button>
            </div>
          }
        />
      </aside>
    </div>
  );
}
