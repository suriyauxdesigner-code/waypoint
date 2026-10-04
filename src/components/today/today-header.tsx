"use client";

import { ChevronLeft, ChevronRight, CloudFog, CloudRain, CloudSun, MapPin, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileMenu } from "@/components/shell/page-header";
import { LogoMark } from "@/components/shell/logo";
import type { Trip, TripPhase } from "@/lib/types";
import { fmtLong, monthName, parseISO, toMinutes } from "@/lib/calc/dates";
import { PURPOSE_LABEL } from "@/lib/labels";
import type { WeatherSnapshot } from "@/lib/weather";

function greeting(time: string) {
  const m = toMinutes(time);
  if (m < 12 * 60) return "Good morning";
  if (m < 17 * 60) return "Good afternoon";
  return "Good evening";
}

const WEATHER_ICON = { sun: Sun, "cloud-sun": CloudSun, "cloud-rain": CloudRain, "cloud-fog": CloudFog };

export function TodayHeader({
  name,
  trip,
  route,
  dayNum,
  totalDays,
  location,
  phase,
  date,
  isToday,
  nowTime,
  weather,
  onPrev,
  onNext,
  onToday,
  canPrev,
  canNext,
}: {
  name: string;
  trip: Trip;
  route: string;
  dayNum: number;
  totalDays: number;
  location: string;
  phase?: TripPhase;
  date: string;
  isToday: boolean;
  nowTime: string;
  weather: WeatherSnapshot | null;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const W = weather ? WEATHER_ICON[weather.icon] : null;
  return (
    <header className="pt-safe">
      <div className="flex h-14 items-center justify-between lg:hidden">
        <LogoMark className="size-7" />
        <MobileMenu />
      </div>
      <div className="lg:pt-10">
        <p className="text-[13px] text-muted-foreground">
          {isToday ? `${greeting(nowTime)}, ${name}` : "Looking at another day"}
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-[1.15] tracking-tight lg:text-[30px]">{route || trip.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground tabular">
            Day {dayNum} <span className="text-muted-foreground">of {totalDays}</span>
          </span>
          <span aria-hidden className="text-border-strong">·</span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {location}
          </span>
          {phase && (
            <>
              <span aria-hidden className="text-border-strong">·</span>
              <span>
                {phase.name} · {phase.purposes.map((p) => (p === "custom" && phase.customPurpose ? phase.customPurpose : PURPOSE_LABEL[p])).join(" + ")}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-y py-2.5">
        <div className="flex min-w-0 items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous day" onClick={onPrev} disabled={!canPrev}>
            <ChevronLeft />
          </Button>
          <div className="min-w-0 px-1">
            <p className="truncate text-[14px] font-medium">{fmtLong(date)}</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Next day" onClick={onNext} disabled={!canNext}>
            <ChevronRight />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" className="ml-1" onClick={onToday}>
              Today
            </Button>
          )}
        </div>
        {weather && W && (
          <div
            className="flex shrink-0 items-center gap-2 text-[13px]"
            title={`Typical ${monthName(parseISO(date).getUTCMonth(), true)} weather — live forecast arrives when a weather provider is connected.`}
          >
            <W className="size-4 text-muted-foreground" />
            <span className="tabular font-medium">
              {weather.high}°<span className="text-muted-foreground">/{weather.low}°</span>
            </span>
            <span className="hidden text-muted-foreground sm:inline">{weather.summary}</span>
            {weather.source === "climate" && (
              <Badge tone="outline" className="hidden sm:inline-flex">
                Typical
              </Badge>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
