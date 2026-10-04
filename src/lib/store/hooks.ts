"use client";

import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "./store";
import { localNowHHmm, localTodayISO } from "@/lib/calc/dates";
import { computeMoney } from "@/lib/calc/budget";
import { buildDay, timelineContext } from "@/lib/calc/timeline";
import type { ISODate, Trip } from "@/lib/types";

export function useData() {
  return useStore((s) => s.data);
}

export function useStatus() {
  return useStore(useShallow((s) => ({ status: s.status, error: s.error })));
}

export function useActiveTrip(): Trip | undefined {
  const data = useData();
  return useMemo(() => {
    const id = data.settings.activeTripId;
    return data.trips.find((t) => t.id === id) ?? data.trips[0];
  }, [data.settings.activeTripId, data.trips]);
}

/** Current clock, re-rendering every minute so "now" stays fresh on Today. */
export function useClock() {
  const [tick, setTick] = useState(() => ({ date: localTodayISO(), time: localNowHHmm() }));
  useEffect(() => {
    const t = setInterval(() => setTick({ date: localTodayISO(), time: localNowHHmm() }), 60_000);
    return () => clearInterval(t);
  }, []);
  return tick;
}

export function useToday(): { today: ISODate; nowTime: string; simulated: boolean } {
  const settings = useStore((s) => s.data.settings);
  const clock = useClock();
  return {
    today: settings.simulatedDate ?? clock.date,
    nowTime: settings.simulatedTime ?? clock.time,
    simulated: !!settings.simulatedDate,
  };
}

export function useMoney(trip: Trip | undefined, today: ISODate) {
  const data = useData();
  return useMemo(() => (trip ? computeMoney(data, trip, today) : null), [data, trip, today]);
}

export function useDayPlan(trip: Trip | undefined, date: ISODate) {
  const data = useData();
  return useMemo(() => (trip ? buildDay(timelineContext(data, trip), date) : null), [data, trip, date]);
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}
