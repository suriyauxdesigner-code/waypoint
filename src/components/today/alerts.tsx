"use client";

import * as React from "react";
import Link from "next/link";
import { Bed, Briefcase, ChevronDown, ChevronRight, Luggage, Moon, Route, Ticket, Wallet } from "lucide-react";
import type { TravelAlert } from "@/lib/calc/alerts";
import { IconChip } from "@/components/ui/icon-chip";
import { cn } from "@/lib/utils";

const ICONS = { luggage: Luggage, briefcase: Briefcase, bed: Bed, wallet: Wallet, route: Route, moon: Moon, ticket: Ticket };

/** Things that need attention — the first few shown, the rest one tap away. */
export function AlertList({ alerts, initial = 2 }: { alerts: TravelAlert[]; initial?: number }) {
  const [all, setAll] = React.useState(false);
  if (!alerts.length) {
    return <p className="card px-4 py-4 text-[14px] text-muted-foreground lg:px-5">All clear — nothing needs your attention.</p>;
  }
  const shown = all ? alerts : alerts.slice(0, initial);
  return (
    <div className="card">
      <ul className="divide-y">
        {shown.map((a) => {
          const inner = (
            <>
              <IconChip icon={ICONS[a.icon]} size="sm" tone={a.tone === "info" ? "accent" : a.tone} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium leading-snug">{a.title}</span>
                {a.detail && <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">{a.detail}</span>}
              </span>
              {a.href && <ChevronRight className="mt-1 size-4 shrink-0 text-subtle-foreground" />}
            </>
          );
          return (
            <li key={a.id}>
              {a.href ? (
                <Link href={a.href} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 lg:px-5">
                  {inner}
                </Link>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3.5 lg:px-5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {alerts.length > initial && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="flex h-12 w-full items-center justify-center gap-1.5 border-t text-[14px] font-medium text-accent-foreground transition-colors hover:bg-surface-2"
        >
          {all ? "Show less" : `Show ${alerts.length - initial} more`}
          <ChevronDown className={cn("size-4 transition-transform", all && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
