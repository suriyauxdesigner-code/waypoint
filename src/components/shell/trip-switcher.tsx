"use client";

import Link from "next/link";
import { Check, ChevronDown, ChevronsUpDown, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActiveTrip, useData } from "@/lib/store/hooks";
import { setActiveTrip } from "@/lib/store/actions";
import { fmtRange } from "@/lib/calc/dates";
import { cn } from "@/lib/utils";

function TripMenu({ align = "start" }: { align?: "start" | "end" }) {
  const data = useData();
  const trip = useActiveTrip();
  return (
    <DropdownMenuContent align={align} className="w-72">
      <DropdownMenuLabel>Your trips</DropdownMenuLabel>
      {data.trips.map((t) => (
        <DropdownMenuItem key={t.id} onSelect={() => setActiveTrip(t.id)} className="h-auto py-2.5 lg:h-auto lg:py-2">
          <span className="text-lg">{t.coverEmoji ?? "🧭"}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{t.name}</span>
            <span className="block text-[12px] text-muted-foreground">{fmtRange(t.startDate, t.endDate)}</span>
          </span>
          {t.id === trip?.id && <Check className="!text-accent" />}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/new">
          <Plus /> Plan a new trip
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

/** Sidebar version: full card with dates. */
export function TripSwitcher({ className }: { className?: string }) {
  const trip = useActiveTrip();
  if (!trip) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring data-[state=open]:bg-muted",
          className,
        )}
      >
        <span className="grid size-9 shrink-0 place-content-center rounded-full bg-muted text-base">{trip.coverEmoji ?? "🧭"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium leading-tight">{trip.name}</span>
          <span className="block text-[12px] text-muted-foreground">{fmtRange(trip.startDate, trip.endDate)}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <TripMenu />
    </DropdownMenu>
  );
}

/** Mobile header version: a compact pill. */
export function TripPill({ className, inverted }: { className?: string; inverted?: boolean }) {
  const trip = useActiveTrip();
  if (!trip) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Trip: ${trip.name}. Switch trip`}
        className={cn(
          "flex h-10 min-w-0 max-w-[62vw] items-center gap-2 rounded-full pl-1 pr-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring",
          inverted ? "bg-white/12 text-white hover:bg-white/20" : "card hover:bg-muted",
          className,
        )}
      >
        <span className={cn("grid size-8 shrink-0 place-content-center rounded-full text-[15px]", inverted ? "bg-white/15" : "bg-muted")}>
          {trip.coverEmoji ?? "🧭"}
        </span>
        <span className="truncate text-[14px] font-medium">{trip.name}</span>
        <ChevronDown className={cn("size-4 shrink-0", inverted ? "text-white/70" : "text-muted-foreground")} />
      </DropdownMenuTrigger>
      <TripMenu />
    </DropdownMenu>
  );
}
