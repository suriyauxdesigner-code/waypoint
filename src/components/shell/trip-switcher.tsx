"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActiveTrip, useData } from "@/lib/store/hooks";
import { setActiveTrip } from "@/lib/store/actions";
import { fmtRange } from "@/lib/calc/dates";
import { cn } from "@/lib/utils";

export function TripSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const data = useData();
  const trip = useActiveTrip();
  if (!trip) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring data-[state=open]:bg-muted",
          className,
        )}
      >
        <span className="grid size-8 shrink-0 place-content-center rounded-md border bg-surface text-base">{trip.coverEmoji ?? "🧭"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-tight">{trip.name}</span>
          {!compact && <span className="block text-[12px] text-muted-foreground">{fmtRange(trip.startDate, trip.endDate)}</span>}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Trips</DropdownMenuLabel>
        {data.trips.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={() => setActiveTrip(t.id)}>
            <span className="text-base">{t.coverEmoji ?? "🧭"}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{t.name}</span>
              <span className="block text-[11px] text-muted-foreground">{fmtRange(t.startDate, t.endDate)}</span>
            </span>
            {t.id === trip.id && <Check className="!text-foreground" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/new">
            <Plus /> New trip
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
