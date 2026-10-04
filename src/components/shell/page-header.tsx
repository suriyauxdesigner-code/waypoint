"use client";

import Link from "next/link";
import { CircleUserRound, ListChecks, Plus, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActiveTrip, useData } from "@/lib/store/hooks";
import { setActiveTrip } from "@/lib/store/actions";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";

/** Mobile-only overflow: utilities + trip switching (desktop has them in the sidebar). */
export function MobileMenu() {
  const data = useData();
  const trip = useActiveTrip();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu"
        className="grid size-10 place-content-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring lg:hidden"
      >
        <CircleUserRound className="size-[22px]" strokeWidth={1.8} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem asChild>
          <Link href="/checklist">
            <ListChecks /> Checklist
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Switch trip</DropdownMenuLabel>
        {data.trips.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={() => setActiveTrip(t.id)} className={cn(t.id === trip?.id && "font-medium")}>
            <span>{t.coverEmoji ?? "🧭"}</span>
            <span className="truncate">{t.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild>
          <Link href="/new">
            <Plus /> New trip
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PageHeader({
  title,
  eyebrow,
  actions,
  className,
  children,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("pt-safe", className)}>
      <div className="flex min-h-14 items-center gap-3 pt-2 lg:min-h-0 lg:pt-8">
        <LogoMark className="size-7 shrink-0 lg:hidden" />
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="eyebrow hidden lg:block">{eyebrow}</div>}
          {title && <h1 className="truncate text-[20px] font-semibold tracking-tight lg:text-[22px]">{title}</h1>}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <MobileMenu />
        </div>
      </div>
      {children}
    </header>
  );
}
