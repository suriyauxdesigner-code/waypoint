"use client";

import * as React from "react";
import type { DaySpend } from "@/lib/calc/budget";
import { fmtDayMonth, dayName } from "@/lib/calc/dates";
import { money } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Day-to-day spend per day (single series, ink) against today's safe-daily line.
 * Stays and long-distance tickets are excluded so the bars reflect daily habits.
 */
export function DailySpendChart({
  days,
  target,
  currency,
  today,
}: {
  days: DaySpend[];
  target: number;
  currency: CurrencyCode;
  today: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const [showTable, setShowTable] = React.useState(false);
  if (days.length === 0) return null;
  const H = 140;
  const max = Math.max(target * 1.2, ...days.map((d) => d.daily), 1);
  const y = (v: number) => H - (v / max) * H;
  const active = hover !== null ? days[hover] : null;

  return (
    <figure>
      <div className="relative">
        {/* target line */}
        <div className="pointer-events-none absolute inset-x-0 z-[1] border-t border-dashed border-foreground/50" style={{ top: y(target) }} aria-hidden>
          <span className="absolute -top-5 left-0 rounded bg-background/90 px-1 text-[11px] text-muted-foreground tabular">
            safe {money(target, currency)}/day
          </span>
        </div>
        <div className="flex items-end gap-[2px]" style={{ height: H }} role="img" aria-label={`Daily spend for ${days.length} days, safe daily spend ${money(target, currency)}`} onMouseLeave={() => setHover(null)}>
          {days.map((d, i) => {
            const h = Math.max(2, (d.daily / max) * H);
            const over = d.daily > target;
            return (
              <button
                key={d.date}
                type="button"
                className="group relative flex h-full flex-1 items-end outline-none"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(i)}
                aria-label={`${fmtDayMonth(d.date)}: ${money(d.daily, currency)} day-to-day`}
              >
                <span
                  className={cn(
                    "w-full rounded-t-[4px] transition-colors",
                    d.date === today ? "bg-signal" : over ? "bg-foreground" : "bg-foreground/55",
                    hover === i && "bg-foreground",
                  )}
                  style={{ height: h }}
                />
              </button>
            );
          })}
        </div>
        {active && hover !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-surface px-2.5 py-1.5 text-[12px] shadow-md"
            style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
          >
            <p className="font-medium">
              {dayName(active.date)}, {fmtDayMonth(active.date)}
            </p>
            <p className="tabular">Day-to-day {money(active.daily, currency)}</p>
            <p className="tabular text-muted-foreground">Incl. bookings {money(active.total, currency)}</p>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular">
        <span>{fmtDayMonth(days[0].date)}</span>
        <span>{fmtDayMonth(days[days.length - 1].date)}</span>
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
        <span>
          Day-to-day spend · <span className="text-signal-foreground">today</span> highlighted · stays & long-distance tickets excluded
        </span>
        <button type="button" className="shrink-0 underline-offset-4 hover:underline" onClick={() => setShowTable((s) => !s)}>
          {showTable ? "Hide table" : "Table"}
        </button>
      </figcaption>
      {showTable && (
        <table className="mt-2 w-full text-[12px] tabular">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Day-to-day</th>
              <th className="py-1 text-right font-medium">Incl. bookings</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date} className="border-t">
                <td className="py-1">{fmtDayMonth(d.date)}</td>
                <td className="py-1 text-right">{money(d.daily, currency)}</td>
                <td className="py-1 text-right">{money(d.total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
