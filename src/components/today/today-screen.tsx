"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ListChecks, PartyPopper } from "lucide-react";
import { useActiveTrip, useData, useDayPlan, useMoney, useToday } from "@/lib/store/hooks";
import { addDays, fmtLong, fmtRange, fmtWeekdayDate } from "@/lib/calc/dates";
import { dayNumber, daysUntilStart, locationOn, phaseOn, phasesForTrip, routeLabel, totalTripDays, tripStage } from "@/lib/calc/trip";
import { buildAlerts, nextUp } from "@/lib/calc/alerts";
import { transportDeparture } from "@/lib/calc/transport";
import { upcomingDeadlines } from "@/lib/calc/bookings";
import { checklistProgress } from "@/lib/calc/checklist";
import { climateProvider } from "@/lib/weather";
import { money, plural } from "@/lib/format";
import { sum } from "@/lib/utils";
import { DayCard } from "@/components/timeline/day-card";
import { SectionHeading } from "@/components/common/section";
import { BudgetBar } from "@/components/common/money";
import { useSheets } from "@/components/forms/sheets-provider";
import { Meter } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PURPOSE_LABEL } from "@/lib/labels";
import { TripHero, greeting } from "./today-header";
import { NextUpBlock } from "./next-up";
import { BudgetCard } from "./budget-status";
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
  const dayNum = dayNumber(trip, viewDate);
  const total = totalTripDays(trip);

  const dayHeader = (
    <div className="flex min-h-14 items-center gap-1 border-b px-2 py-2 lg:px-3">
      <Button variant="ghost" size="icon-sm" aria-label="Previous day" onClick={() => setViewDate((d) => addDays(d, -1))} disabled={viewDate <= trip.startDate}>
        <ChevronLeft />
      </Button>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-[16px] font-semibold tracking-tight">{isToday ? "Today" : fmtWeekdayDate(viewDate)}</p>
        <p className="text-[12px] text-muted-foreground">
          {isToday ? fmtWeekdayDate(viewDate) : `Day ${dayNum} of ${total}`}
          {phase ? ` · ${phase.name}` : ""}
        </p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label="Next day" onClick={() => setViewDate((d) => addDays(d, 1))} disabled={viewDate >= trip.endDate}>
        <ChevronRight />
      </Button>
    </div>
  );

  return (
    <div>
      <TripHero
        kicker={`${greeting(nowTime)}, ${data.user.name}`}
        title={routeLabel(data, trip.id) || trip.name}
        meta={
          <span className="font-medium text-white">
            Day {dayNumber(trip, today)} <span className="font-normal text-white/70">of {total}</span>
          </span>
        }
        location={locationOn(data, trip, today)}
        weather={climateProvider.get(locationOn(data, trip, today), today)}
      />

      <div className="relative -mt-10 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="min-w-0">
          <DayCard plan={plan} trip={trip} header={dayHeader} isToday={isToday} nowTime={nowTime} />
          {!isToday && (
            <div className="mt-3 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setViewDate(today)}>
                Back to today
              </Button>
            </div>
          )}
          {weather && !isToday && (
            <p className="mt-2 text-center text-[13px] text-muted-foreground">
              {location} · usually {weather.high}°/{weather.low}° · {weather.summary}
            </p>
          )}
        </div>

        <aside className="grid min-w-0 grid-cols-1 content-start gap-8">
          <section>
            <SectionHeading title="Next up" action="Plan" href={next?.href ?? "/trip"} className="mb-3" />
            <NextUpBlock next={next} today={today} currency={trip.currency} firstMode={nextTransport ? transportDeparture(nextTransport)?.mode : undefined} />
          </section>
          <section>
            <SectionHeading title="Money" action="Budget" href="/money" className="mb-3" />
            <BudgetCard m={m} currency={trip.currency} onAdd={() => sheets.open({ type: "expense" })} />
          </section>
          <section>
            <SectionHeading title="Heads up" count={alerts.length || undefined} className="mb-3" />
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
  const sheets = useSheets();
  const { today } = useToday();
  const m = useMoney(trip, today)!;
  const deadlines = upcomingDeadlines(m.bookings, today).slice(0, 4);
  const cl = data.checklists.find((c) => c.tripId === trip.id && !c.isTemplate);
  const progress = checklistProgress(cl ? data.checklistItems.filter((i) => i.checklistId === cl.id) : []);
  const days = daysUntilStart(trip, today);
  const plan = useDayPlan(trip, trip.startDate)!;
  const planned = sum(m.categories, (c) => c.planned);
  const route = routeLabel(data, trip.id);

  return (
    <div>
      <TripHero
        kicker={`Hi ${data.user.name} — your trip starts in`}
        title={<span className="tabular">{plural(days, "day")}</span>}
        meta={<span className="font-medium text-white">{trip.name}</span>}
      >
        <p className="mt-1.5 text-[14px] text-white/70">
          {[fmtRange(trip.startDate, trip.endDate), route !== trip.name ? route : ""].filter(Boolean).join(" · ")}
        </p>
      </TripHero>

      <div className="relative -mt-10 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="min-w-0">
          <DayCard
            plan={plan}
            trip={trip}
            header={
              <div className="flex min-h-14 items-center justify-between gap-3 border-b px-4 py-3 lg:px-5">
                <div>
                  <p className="text-[16px] font-semibold tracking-tight">Day 1</p>
                  <p className="text-[13px] text-muted-foreground">{fmtLong(trip.startDate)}</p>
                </div>
                <Link href="/trip" className="flex h-9 items-center gap-0.5 rounded-lg px-2 text-[14px] font-medium text-accent-foreground hover:bg-accent-soft">
                  Full plan <ChevronRight className="size-4" />
                </Link>
              </div>
            }
          />
        </div>
        <aside className="grid min-w-0 grid-cols-1 content-start gap-8">
          <section>
            <SectionHeading title="Budget" action="Details" href="/money" className="mb-3" />
            <Link href="/money" className="card block p-4 transition-colors hover:bg-surface-2 lg:p-5">
              <p className="text-[15px] font-medium text-muted-foreground">Trip budget</p>
              <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight tabular">{money(trip.totalBudget, trip.currency)}</p>
              <BudgetBar budget={m.budget} spent={m.spent} committed={m.committed} className="mt-4" />
              <dl className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <dt className="text-[13px] text-muted-foreground">Planned</dt>
                  <dd className="text-[15px] font-semibold tabular">{money(planned, trip.currency)}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted-foreground">Paid</dt>
                  <dd className="text-[15px] font-semibold tabular">{money(m.spent, trip.currency)}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted-foreground">Left</dt>
                  <dd className="text-[15px] font-semibold tabular">{money(m.remaining, trip.currency)}</dd>
                </div>
              </dl>
            </Link>
          </section>
          <section>
            <SectionHeading title="To book" count={deadlines.length || undefined} action="Bookings" href="/bookings" className="mb-3" />
            {deadlines.length ? (
              <ul className="card divide-y">
                {deadlines.map((d) => (
                  <li key={d.key} className="flex items-center justify-between gap-3 px-4 py-3.5 text-[14px] lg:px-5">
                    <span className="min-w-0 font-medium">{d.label}</span>
                    <span className="shrink-0 tabular text-muted-foreground">{money(d.view.price, trip.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card px-4 py-4 text-[14px] text-muted-foreground">Nothing waiting to be booked.</p>
            )}
          </section>
          <section>
            <SectionHeading title="Packing" action="Checklist" href="/checklist" className="mb-3" />
            <Link href="/checklist" className="card block p-4 transition-colors hover:bg-surface-2 lg:p-5">
              <p className="flex items-center gap-2 text-[15px] font-medium">
                <ListChecks className="size-[18px] text-muted-foreground" /> {progress.packed} of {progress.total} packed
              </p>
              <Meter value={progress.ratio} tone={progress.ratio === 1 ? "positive" : "default"} className="mt-3 h-2" label="Packing progress" />
            </Link>
          </section>
          <Button variant="outline" onClick={() => sheets.open({ type: "add-menu" })}>
            Add a stay, journey or plan
          </Button>
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
      <TripHero kicker="Trip complete" title="Welcome back" meta={<span className="text-white">{trip.name}</span>}>
        <p className="mt-1.5 text-[14px] text-white/70">
          {totalTripDays(trip)} days · {plural(dests, "place")} · {PURPOSE_LABEL[trip.purpose]}
        </p>
      </TripHero>
      <div className="relative mx-auto -mt-10 max-w-lg lg:mt-8">
        <div className="card flex flex-col items-center px-5 py-8 text-center">
          <PartyPopper className="size-7 text-signal" />
          <dl className="mt-6 grid w-full grid-cols-3 divide-x">
            <div>
              <dt className="text-[13px] text-muted-foreground">Spent</dt>
              <dd className="text-[17px] font-semibold tabular">{money(m.spent, trip.currency)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted-foreground">{m.remaining >= 0 ? "Saved" : "Over"}</dt>
              <dd className={m.remaining >= 0 ? "text-[17px] font-semibold tabular text-positive" : "text-[17px] font-semibold tabular text-danger"}>
                {money(Math.abs(m.remaining), trip.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted-foreground">Per day</dt>
              <dd className="text-[17px] font-semibold tabular">{money(m.avgDaily, trip.currency)}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
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
