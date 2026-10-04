"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ListChecks, PartyPopper } from "lucide-react";
import { useActiveTrip, useData, useDayPlan, useMoney, useToday } from "@/lib/store/hooks";
import { addDays, fmtLong, fmtRange } from "@/lib/calc/dates";
import { dayNumber, daysUntilStart, locationOn, phaseOn, phasesForTrip, routeLabel, totalTripDays, tripStage } from "@/lib/calc/trip";
import { buildAlerts, nextUp } from "@/lib/calc/alerts";
import { transportDeparture } from "@/lib/calc/transport";
import { upcomingDeadlines } from "@/lib/calc/bookings";
import { checklistProgress } from "@/lib/calc/checklist";
import { climateProvider } from "@/lib/weather";
import { money, pct, plural } from "@/lib/format";
import { DayTimeline } from "@/components/timeline/day-timeline";
import { SectionHeading } from "@/components/common/section";
import { useSheets } from "@/components/forms/sheets-provider";
import { Meter } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { TodayHeader } from "./today-header";
import { NextUpBlock } from "./next-up";
import { BudgetStatus, TodaySpend } from "./budget-status";
import { AlertList } from "./alerts";

export function TodayScreen() {
  const data = useData();
  const trip = useActiveTrip()!;
  const { today, nowTime } = useToday();
  const stage = tripStage(trip, today);

  if (stage === "upcoming") return <BeforeTrip />;
  if (stage === "completed") return <AfterTrip />;
  return <DuringTrip key={trip.id + today} today={today} nowTime={nowTime} data={data} />;
}

function DuringTrip({ today, nowTime, data }: { today: string; nowTime: string; data: ReturnType<typeof useData> }) {
  const trip = useActiveTrip()!;
  const sheets = useSheets();
  const [viewDate, setViewDate] = React.useState(today);
  const isToday = viewDate === today;
  const plan = useDayPlan(trip, viewDate)!;
  const m = useMoney(trip, today)!;
  const phases = phasesForTrip(data, trip.id);
  const phase = phaseOn(phases, viewDate);
  const location = locationOn(data, trip, viewDate);
  const alerts = React.useMemo(() => buildAlerts(data, trip, today, nowTime, m), [data, trip, today, nowTime, m]);
  const next = React.useMemo(() => nextUp(data, trip, today, nowTime), [data, trip, today, nowTime]);
  const nextTransport = next?.kind === "transport" ? data.transports.find((t) => t.id === next.id) : undefined;
  const weather = climateProvider.get(location, viewDate);

  const header = (
    <TodayHeader
      name={data.user.name}
      trip={trip}
      route={routeLabel(data, trip.id)}
      dayNum={dayNumber(trip, viewDate)}
      totalDays={totalTripDays(trip)}
      location={location}
      phase={phase}
      date={viewDate}
      isToday={isToday}
      nowTime={nowTime}
      weather={weather}
      onPrev={() => setViewDate((d) => addDays(d, -1))}
      onNext={() => setViewDate((d) => addDays(d, 1))}
      onToday={() => setViewDate(today)}
      canPrev={viewDate > trip.startDate}
      canNext={viewDate < trip.endDate}
    />
  );

  return (
    <div>
      {header}
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <section aria-labelledby="timeline-h" className="min-w-0">
          <SectionHeading
            title={isToday ? "Today’s timeline" : "Timeline"}
            action="Open in Trip"
            href={`/trip?date=${viewDate}`}
            className="mb-3"
          />
          <span id="timeline-h" className="sr-only">
            Timeline for {fmtLong(viewDate)}
          </span>
          <DayTimeline plan={plan} trip={trip} isToday={isToday} nowTime={nowTime} editable />
          {plan.stayTonight && (
            <button
              type="button"
              onClick={() => sheets.open({ type: "accommodation", id: plan.stayTonight!.id })}
              className="mt-4 flex w-full items-center justify-between gap-3 border-t pt-3.5 text-left text-[13px]"
            >
              <span className="text-muted-foreground">
                Tonight · <span className="font-medium text-foreground">{plan.stayTonight.property}</span>
              </span>
              <ArrowRight className="size-4 text-subtle-foreground" />
            </button>
          )}
        </section>

        <aside className="grid min-w-0 grid-cols-1 content-start gap-8">
          <section>
            <SectionHeading title="Next up" className="mb-2.5" />
            <NextUpBlock next={next} today={today} currency={trip.currency} firstMode={nextTransport ? transportDeparture(nextTransport)?.mode : undefined} />
          </section>
          <section>
            <SectionHeading title="Budget" action="Money" href="/money" className="mb-2.5" />
            <div className="grid grid-cols-1 gap-2">
              <BudgetStatus m={m} currency={trip.currency} />
              <TodaySpend m={m} currency={trip.currency} onAdd={() => sheets.open({ type: "expense" })} />
            </div>
          </section>
          <section>
            <SectionHeading title="Heads up" count={alerts.length} className="mb-2.5" />
            <AlertList alerts={alerts} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function BeforeTrip() {
  const data = useData();
  const trip = useActiveTrip()!;
  const { today } = useToday();
  const m = useMoney(trip, today)!;
  const deadlines = upcomingDeadlines(m.bookings, today).slice(0, 4);
  const cl = data.checklists.find((c) => c.tripId === trip.id && !c.isTemplate);
  const progress = checklistProgress(cl ? data.checklistItems.filter((i) => i.checklistId === cl.id) : []);
  const days = daysUntilStart(trip, today);
  const plan = useDayPlan(trip, trip.startDate)!;

  return (
    <div>
      <PageHeader eyebrow="Upcoming trip" />
      <div className="mt-2 lg:mt-4">
        <p className="text-[13px] text-muted-foreground">Hi {data.user.name} — your trip starts in</p>
        <h1 className="mt-1 text-[30px] font-semibold tracking-tight tabular">{plural(days, "day")}</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {[trip.name, fmtRange(trip.startDate, trip.endDate), routeLabel(data, trip.id)].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ")}
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <section>
          <SectionHeading title={`Day 1 · ${fmtLong(trip.startDate)}`} action="Plan trip" href="/trip" className="mb-3" />
          <DayTimeline plan={plan} trip={trip} editable />
        </section>
        <aside className="grid min-w-0 grid-cols-1 content-start gap-8">
          <section>
            <SectionHeading title="To book" count={deadlines.length} action="Bookings" href="/bookings" className="mb-2.5" />
            {deadlines.length ? (
              <ul className="divide-y rounded-xl border bg-surface">
                {deadlines.map((d) => (
                  <li key={d.key} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                    <span className="font-medium">{d.label}</span>
                    <span className="shrink-0 text-muted-foreground tabular">{money(d.view.price, trip.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">Nothing waiting to be booked.</p>
            )}
          </section>
          <section>
            <SectionHeading title="Packing" action="Checklist" href="/checklist" className="mb-2.5" />
            <Link href="/checklist" className="block rounded-xl border bg-surface p-4">
              <p className="flex items-center gap-2 text-[14px] font-medium">
                <ListChecks className="size-4 text-muted-foreground" /> {progress.packed} / {progress.total} packed
              </p>
              <Meter value={progress.ratio} className="mt-3" label="Packing progress" />
            </Link>
          </section>
          <section>
            <SectionHeading title="Budget" action="Money" href="/money" className="mb-2.5" />
            <p className="text-[24px] font-semibold tracking-tight tabular">{money(trip.totalBudget, trip.currency)}</p>
            <p className="text-[13px] text-muted-foreground">
              {money(m.spent, trip.currency)} paid in advance · {pct(m.usedRatio)} used
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function AfterTrip() {
  const data = useData();
  const trip = useActiveTrip()!;
  const { today } = useToday();
  const m = useMoney(trip, today)!;
  const dests = data.destinations.filter((d) => d.tripId === trip.id).length;
  return (
    <div>
      <PageHeader eyebrow="Trip complete" />
      <div className="mx-auto mt-10 max-w-md text-center">
        <div className="mx-auto grid size-12 place-content-center rounded-full bg-muted">
          <PartyPopper className="size-6 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-[26px] font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {trip.name} · {totalTripDays(trip)} days · {plural(dests, "place")}
        </p>
        <dl className="mt-8 grid grid-cols-3 divide-x rounded-xl border bg-surface py-4">
          <div>
            <dt className="text-[12px] text-muted-foreground">Spent</dt>
            <dd className="font-semibold tabular">{money(m.spent, trip.currency)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">{m.remaining >= 0 ? "Saved" : "Over"}</dt>
            <dd className="font-semibold tabular">{money(Math.abs(m.remaining), trip.currency)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">Per day</dt>
            <dd className="font-semibold tabular">{money(m.avgDaily, trip.currency)}</dd>
          </div>
        </dl>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/money">See spending</Link>
          </Button>
          <Button asChild>
            <Link href="/new">Plan the next one</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
