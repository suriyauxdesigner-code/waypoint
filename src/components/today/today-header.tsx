"use client";

import { CloudFog, CloudRain, CloudSun, MapPin, Sun } from "lucide-react";
import { MobileTopBar } from "@/components/shell/page-header";
import type { WeatherSnapshot } from "@/lib/weather";
import { toMinutes } from "@/lib/calc/dates";
import { cn } from "@/lib/utils";

export function greeting(time: string) {
  const m = toMinutes(time);
  if (m < 12 * 60) return "Good morning";
  if (m < 17 * 60) return "Good afternoon";
  return "Good evening";
}

const WEATHER_ICON = { sun: Sun, "cloud-sun": CloudSun, "cloud-rain": CloudRain, "cloud-fog": CloudFog };

/**
 * The navy trip hero (the reference's photo header): who/where/when at a glance.
 * Full-bleed on phones with the day card overlapping its bottom edge; a rounded panel on desktop.
 */
export function TripHero({
  kicker,
  title,
  meta,
  location,
  weather,
  className,
  children,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  location?: string;
  weather?: WeatherSnapshot | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const W = weather ? WEATHER_ICON[weather.icon] : null;
  return (
    <header
      className={cn(
        "relative -mx-4 overflow-hidden bg-[oklch(0.25_0.06_266)] px-4 pb-16 pt-safe text-white sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-8 lg:rounded-card lg:px-8 lg:pb-8 lg:pt-8",
        "dark:bg-[oklch(0.24_0.05_266)]",
        className,
      )}
    >
      {/* soft route-line motif */}
      <svg aria-hidden viewBox="0 0 400 200" className="pointer-events-none absolute -right-10 top-6 h-56 w-auto opacity-[0.12] lg:right-6">
        <path d="M10 170 C 90 170, 110 60, 200 60 S 320 140, 390 30" fill="none" stroke="white" strokeWidth="3" strokeDasharray="1 12" strokeLinecap="round" />
        <circle cx="390" cy="30" r="9" fill="white" />
        <circle cx="10" cy="170" r="6" fill="white" />
      </svg>
      <MobileTopBar inverted className="pt-2" />
      <div className="relative mt-5 lg:mt-0">
        {kicker && <p className="text-[14px] text-white/70">{kicker}</p>}
        <h1 className="mt-1 text-[28px] font-semibold leading-[1.15] tracking-tight lg:text-[32px]">{title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-white/80">
          {meta}
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" /> {location}
            </span>
          )}
          {weather && W && (
            <span className="flex items-center gap-1.5" title="Typical weather for this month">
              <W className="size-4" />
              <span className="tabular">
                {weather.high}° / {weather.low}°
              </span>
            </span>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}
