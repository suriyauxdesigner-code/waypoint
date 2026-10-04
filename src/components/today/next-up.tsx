"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NextUp } from "@/lib/calc/alerts";
import { fmtShort, relativeDayLabel } from "@/lib/calc/dates";
import { money } from "@/lib/format";
import type { CurrencyCode, TransportMode } from "@/lib/types";
import { MODE_ICONS } from "@/components/common/icons";
import { STATUS_LABEL } from "@/lib/calc/bookings";

export function NextUpBlock({ next, today, currency, firstMode }: { next?: NextUp; today: string; currency: CurrencyCode; firstMode?: TransportMode }) {
  if (!next) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-5 text-center">
        <p className="text-[14px] font-medium">No transport booked yet.</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Add your first route and it shows up here.</p>
      </div>
    );
  }
  const Icon = next.kind === "exam" ? GraduationCap : next.kind === "decision" ? Route : MODE_ICONS[firstMode ?? "other"];
  const [mon, day] = fmtShort(next.date).split(" ");
  const status =
    next.status === "undecided" ? (
      <Badge tone="warning">Not decided</Badge>
    ) : next.status === "confirmed" ? (
      <Badge tone="positive">{next.kind === "exam" ? "Scheduled" : "Booked"}</Badge>
    ) : (
      <Badge tone={next.status === "need_to_book" ? "warning" : "neutral"}>{STATUS_LABEL[next.status]}</Badge>
    );
  return (
    <Link
      href={next.href}
      className="group flex items-stretch overflow-hidden rounded-xl border bg-surface transition-colors hover:border-border-strong"
    >
      <div className="flex w-[68px] shrink-0 flex-col items-center justify-center border-r border-dashed bg-surface-2/60 py-3">
        <span className="eyebrow !text-[10px]">{mon}</span>
        <span className="text-[24px] font-semibold leading-none tracking-tight tabular">{day}</span>
        <span className="mt-1 text-[10px] text-muted-foreground">{relativeDayLabel(next.date, today)}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight">{next.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Icon className="size-3.5" />
            {next.subtitle}
            {next.time && <span className="tabular">· {next.time}</span>}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {status}
            {next.cost !== undefined && (
              <span className="text-[13px] font-medium tabular">
                {next.kind === "decision" ? "from " : ""}
                {money(next.cost, currency)}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
