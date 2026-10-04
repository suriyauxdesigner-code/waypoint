"use client";

import * as React from "react";
import { Bed, GraduationCap, Route } from "lucide-react";
import { useData } from "@/lib/store/hooks";
import { buildDay, timelineContext, type DayPlan } from "@/lib/calc/timeline";
import { addDays, eachDay, fmtLong, monthName, parseISO, toISO } from "@/lib/calc/dates";
import { MODE_ICONS } from "@/components/common/icons";
import { DayTimeline } from "@/components/timeline/day-timeline";
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
    <div className="flex flex-wrap items-center gap-1 text-muted-foreground [&_svg]:size-3">
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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid grid-cols-1 gap-8">
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
            <section key={`${year}-${month}`} aria-label={`${monthName(month, true)} ${year}`}>
              <h3 className="mb-2 text-[15px] font-semibold tracking-tight">
                {monthName(month, true)} <span className="font-normal text-muted-foreground">{year}</span>
              </h3>
              <div className="grid grid-cols-7 border-l border-t">
                {WEEK.map((w) => (
                  <div key={w} className="border-b border-r px-1.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {w}
                  </div>
                ))}
                {visible.map((d, i) => {
                  if (!d) return <div key={`e${i}`} className="min-h-[68px] border-b border-r bg-surface-2/40" />;
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
                        "relative flex min-h-[68px] flex-col gap-1 border-b border-r p-1.5 text-left transition-colors sm:min-h-[84px]",
                        inTrip ? "bg-surface hover:bg-muted/60" : "bg-surface-2/40 text-subtle-foreground",
                        isSel && "outline-2 -outline-offset-2 outline-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 place-content-center rounded-full text-[12px] font-medium tabular",
                          isToday && "bg-signal text-white",
                        )}
                      >
                        {parseISO(d).getUTCDate()}
                      </span>
                      {p && <Markers plan={p} />}
                      {p?.isWorkDay && <span aria-label="Work day" className="absolute inset-x-1.5 bottom-1.5 h-1 rounded-full work-stripes" />}
                      {p?.stayTonight && !p.isWorkDay && <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 h-px bg-border-strong" />}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
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
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold tracking-tight">{fmtLong(selected)}</h3>
          <div className="flex gap-1">
            <button type="button" className="h-8 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-muted disabled:opacity-40" disabled={selected <= trip.startDate} onClick={() => onSelect(addDays(selected, -1))}>
              Prev
            </button>
            <button type="button" className="h-8 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-muted disabled:opacity-40" disabled={selected >= trip.endDate} onClick={() => onSelect(addDays(selected, 1))}>
              Next
            </button>
          </div>
        </div>
        <div className="mt-3">
          <DayTimeline plan={plan} trip={trip} isToday={selected === today} editable />
        </div>
      </aside>
    </div>
  );
}
