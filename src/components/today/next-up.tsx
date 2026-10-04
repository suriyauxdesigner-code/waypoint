"use client";

import Link from "next/link";
import { GraduationCap, Route } from "lucide-react";
import type { NextUp } from "@/lib/calc/alerts";
import { fmtDayMonth, relativeDayLabel } from "@/lib/calc/dates";
import { money } from "@/lib/format";
import type { CurrencyCode, TransportMode } from "@/lib/types";
import { MODE_ICONS } from "@/components/common/icons";
import { STATUS_LABEL } from "@/lib/calc/bookings";
import { cn } from "@/lib/utils";

/** "Next up" as a travel ticket — navy body, blue stub (the reference's flight card). */
export function NextUpBlock({ next, today, currency, firstMode }: { next?: NextUp; today: string; currency: CurrencyCode; firstMode?: TransportMode }) {
  if (!next) {
    return (
      <div className="card px-5 py-6 text-center">
        <p className="text-[15px] font-medium">No transport planned yet</p>
        <p className="mt-0.5 text-[14px] text-muted-foreground">Add your next journey and it shows up here.</p>
      </div>
    );
  }
  const Icon = next.kind === "exam" ? GraduationCap : next.kind === "decision" ? Route : MODE_ICONS[firstMode ?? "other"];
  const [from, to] = next.title.includes(" → ") ? next.title.split(" → ") : [next.title, ""];
  const statusLabel =
    next.status === "undecided" ? "Not decided" : next.status === "confirmed" ? (next.kind === "exam" ? "Scheduled" : "Booked") : STATUS_LABEL[next.status];
  const attention = next.status === "undecided" || next.status === "need_to_book";

  return (
    <Link
      href={next.href}
      className="group block overflow-hidden rounded-card shadow-[0_12px_28px_-14px_rgb(16_24_40/0.5)] outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring active:scale-[0.99]"
    >
      <div className="bg-[oklch(0.25_0.06_266)] px-5 pb-4 pt-4 text-white">
        <div className="flex items-center justify-between gap-3 text-[13px] text-white/70">
          <span className="flex items-center gap-1.5">
            <Icon className="size-4" /> {next.subtitle}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[12px] font-medium",
              attention ? "bg-warning text-[oklch(0.25_0.05_70)]" : "bg-white/15 text-white",
            )}
          >
            {statusLabel}
          </span>
        </div>
        {to ? (
          <div className="mt-3 flex items-center gap-3">
            <p className="min-w-0 truncate text-[20px] font-semibold tracking-tight">{from}</p>
            <span aria-hidden className="relative h-px min-w-6 flex-1 border-t border-dashed border-white/40">
              <span className="absolute -right-0.5 -top-[3px] size-1.5 rounded-full bg-white/70" />
            </span>
            <p className="min-w-0 truncate text-right text-[20px] font-semibold tracking-tight">{to}</p>
          </div>
        ) : (
          <p className="mt-3 truncate text-[20px] font-semibold tracking-tight">{next.title}</p>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-3 bg-accent px-5 py-3 text-white">
        <div className="min-w-0">
          <dd className="truncate text-[15px] font-semibold">{relativeDayLabel(next.date, today)}</dd>
          <dt className="text-[12px] text-white/75">{fmtDayMonth(next.date)}</dt>
        </div>
        <div className="min-w-0">
          <dd className="truncate text-[15px] font-semibold tabular">{next.time ?? "—"}</dd>
          <dt className="text-[12px] text-white/75">{next.kind === "exam" ? "Starts" : "Departs"}</dt>
        </div>
        <div className="min-w-0">
          <dd className="truncate text-[15px] font-semibold tabular">{next.cost !== undefined ? money(next.cost, currency) : "—"}</dd>
          <dt className="text-[12px] text-white/75">{next.kind === "decision" ? "From" : "Planned"}</dt>
        </div>
      </dl>
    </Link>
  );
}
