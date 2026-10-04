"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ADD_OPTIONS } from "@/components/forms/add-menu";
import { useSheets } from "@/components/forms/sheets-provider";
import { useActiveTrip, useData, useToday } from "@/lib/store/hooks";
import { fmtWeekdayDate } from "@/lib/calc/dates";
import { checklistProgress } from "@/lib/calc/checklist";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";
import { Wordmark } from "./logo";
import { TripSwitcher } from "./trip-switcher";

function NavLink({ item, active, trailing }: { item: NavItem; active: boolean; trailing?: React.ReactNode }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <item.icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
      <span className="flex-1">{item.label}</span>
      {trailing}
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  const sheets = useSheets();
  const data = useData();
  const trip = useActiveTrip();
  const { today, simulated } = useToday();
  const cl = trip ? data.checklists.find((c) => c.tripId === trip.id && !c.isTemplate) : undefined;
  const progress = checklistProgress(cl ? data.checklistItems.filter((i) => i.checklistId === cl.id) : []);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r bg-surface px-4 py-5 lg:flex">
      <div className="px-2 pb-5">
        <Link href="/" className="outline-none">
          <Wordmark />
        </Link>
      </div>
      <TripSwitcher />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="mt-4 w-full justify-start">
            <Plus /> Add to trip
            <kbd className="ml-auto rounded border border-primary-foreground/20 px-1.5 font-mono text-[10px] text-primary-foreground/70">A</kbd>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[232px]">
          {ADD_OPTIONS.map((o) => (
            <DropdownMenuItem key={o.key} onSelect={() => sheets.open(o.request)}>
              <o.icon /> {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <nav aria-label="Primary" className="mt-6 grid gap-1">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(path)} />
        ))}
      </nav>
      <div className="mx-3 my-4 h-px bg-border" />
      <nav aria-label="Utilities" className="grid grid-cols-1 gap-1">
        {SECONDARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={item.match(path)}
            trailing={
              item.href === "/checklist" && progress.total > 0 ? (
                <span className="text-[12px] tabular text-subtle-foreground">
                  {progress.packed}/{progress.total}
                </span>
              ) : undefined
            }
          />
        ))}
      </nav>

      <div className="mt-auto">
        {simulated && (
          <Link
            href="/settings#date"
            className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <CalendarClock className="size-4" />
            <span>
              Viewing as <span className="font-medium text-foreground">{fmtWeekdayDate(today)}</span>
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
}
