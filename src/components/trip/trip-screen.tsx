"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, List, Map as MapIcon, Scale } from "lucide-react";
import { useActiveTrip, useData, useToday } from "@/lib/store/hooks";
import { fmtRange } from "@/lib/calc/dates";
import { totalTripDays } from "@/lib/calc/trip";
import { PageHeader } from "@/components/shell/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PhaseBand } from "./phase-band";
import { DateStrip, TripTimeline } from "./trip-timeline";
import { TripCalendar } from "./trip-calendar";
import { TripMap } from "./trip-map";
import { NewDecisionSheet } from "@/components/transport/new-decision-sheet";
import { describeSchedule } from "@/lib/calc/work";
import { useSheets } from "@/components/forms/sheets-provider";

type View = "timeline" | "calendar" | "map";

export function TripScreen() {
  const trip = useActiveTrip()!;
  const data = useData();
  const { today } = useToday();
  const params = useSearchParams();
  const router = useRouter();
  const sheets = useSheets();
  const view = (params.get("view") as View) || "timeline";
  const paramDate = params.get("date") ?? undefined;
  const inTrip = (d?: string) => !!d && d >= trip.startDate && d <= trip.endDate;
  const defaultDate = inTrip(paramDate) ? paramDate! : inTrip(today) ? today : trip.startDate;
  const [selected, setSelected] = React.useState(defaultDate);
  const [focus, setFocus] = React.useState<string | undefined>(inTrip(paramDate) ? paramDate : inTrip(today) ? today : undefined);
  const [newDecision, setNewDecision] = React.useState(false);

  // Follow ?date= when it changes (adjusting state during render, not in an effect).
  const [seenParam, setSeenParam] = React.useState(paramDate);
  if (paramDate !== seenParam) {
    setSeenParam(paramDate);
    if (inTrip(paramDate)) {
      setSelected(paramDate!);
      setFocus(paramDate);
    }
  }

  const setView = (v: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("view", v);
    router.replace(`/trip?${sp.toString()}`, { scroll: false });
  };

  const pick = (d: string) => {
    setSelected(d);
    setFocus(d);
    // force re-scroll even when tapping the same date twice
    if (d === focus) {
      const el = document.getElementById(`day-${d}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const destinations = data.destinations.filter((d) => d.tripId === trip.id).length;

  return (
    <div>
      <PageHeader
        eyebrow="Trip"
        title={trip.name}
        actions={
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => setNewDecision(true)}>
            <Scale /> Compare transport
          </Button>
        }
      >
        <p className="mt-1 text-[13px] text-muted-foreground">
          {fmtRange(trip.startDate, trip.endDate)} · {totalTripDays(trip)} days · {destinations} places
          {trip.workSchedule.enabled && (
            <>
              {" · "}
              <button type="button" className="underline-offset-4 hover:underline" onClick={() => sheets.open({ type: "work" })}>
                Work {describeSchedule(trip.workSchedule)}
              </button>
            </>
          )}
        </p>
      </PageHeader>

      <div className="mt-6">
        <PhaseBand trip={trip} today={today} />
      </div>

      <Tabs value={view} onValueChange={setView} className="mt-8">
        <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 pt-2 pb-2 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          <div className="flex items-center justify-between gap-3">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="timeline">
                <List /> Timeline
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarDays /> Calendar
              </TabsTrigger>
              <TabsTrigger value="map">
                <MapIcon /> Map
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="icon-sm" className="shrink-0 sm:hidden" aria-label="Compare transport" onClick={() => setNewDecision(true)}>
              <Scale />
            </Button>
          </div>
          {view === "timeline" && (
            <div className="mt-2">
              <DateStrip trip={trip} today={today} selected={selected} onSelect={pick} />
            </div>
          )}
        </div>
        <TabsContent value="timeline" className="pt-2 outline-none">
          <TripTimeline trip={trip} today={today} focusDate={focus} />
        </TabsContent>
        <TabsContent value="calendar" className="pt-6 outline-none">
          <TripCalendar trip={trip} today={today} selected={selected} onSelect={setSelected} />
        </TabsContent>
        <TabsContent value="map" className="pt-6 outline-none">
          <TripMap trip={trip} today={today} />
        </TabsContent>
      </Tabs>
      {newDecision && <NewDecisionSheet onClose={() => setNewDecision(false)} />}
    </div>
  );
}
