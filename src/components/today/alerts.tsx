"use client";

import Link from "next/link";
import { ArrowRight, Bed, Briefcase, Luggage, Moon, Route, Ticket, Wallet } from "lucide-react";
import type { TravelAlert } from "@/lib/calc/alerts";
import { cn } from "@/lib/utils";

const ICONS = { luggage: Luggage, briefcase: Briefcase, bed: Bed, wallet: Wallet, route: Route, moon: Moon, ticket: Ticket };

export function AlertList({ alerts }: { alerts: TravelAlert[] }) {
  if (!alerts.length) {
    return <p className="py-3 text-[13px] text-muted-foreground">All clear — nothing needs your attention.</p>;
  }
  return (
    <ul className="divide-y rounded-xl border bg-surface">
      {alerts.map((a) => {
        const Icon = ICONS[a.icon];
        const inner = (
          <>
            <span
              className={cn(
                "mt-0.5 grid size-7 shrink-0 place-content-center rounded-full [&_svg]:size-3.5",
                a.tone === "warning" && "bg-warning-soft text-warning-foreground",
                a.tone === "danger" && "bg-danger-soft text-danger",
                a.tone === "positive" && "bg-positive-soft text-positive",
                a.tone === "info" && "bg-info-soft text-info",
              )}
            >
              <Icon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium leading-snug">{a.title}</span>
              {a.detail && <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{a.detail}</span>}
            </span>
            {a.href && <ArrowRight className="mt-1 size-4 shrink-0 text-subtle-foreground" />}
          </>
        );
        return (
          <li key={a.id}>
            {a.href ? (
              <Link href={a.href} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50">
                {inner}
              </Link>
            ) : (
              <div className="flex items-start gap-3 px-4 py-3.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
