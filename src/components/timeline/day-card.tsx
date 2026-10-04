"use client";

import { Bed, ChevronRight } from "lucide-react";
import type { DayPlan } from "@/lib/calc/timeline";
import type { Trip } from "@/lib/types";
import { useSheets } from "@/components/forms/sheets-provider";
import { cn } from "@/lib/utils";
import { DayTimeline } from "./day-timeline";

/** A day as one card: header (date · meta), the timeline, and where you sleep tonight. */
export function DayCard({
  plan,
  trip,
  header,
  isToday,
  nowTime,
  editable = true,
  hints,
  compact,
  showStay = true,
  className,
  id,
}: {
  plan: DayPlan;
  trip: Trip;
  header: React.ReactNode;
  isToday?: boolean;
  nowTime?: string;
  editable?: boolean;
  hints?: boolean;
  compact?: boolean;
  showStay?: boolean;
  className?: string;
  id?: string;
}) {
  const sheets = useSheets();
  return (
    <section id={id} className={cn("card", className)}>
      {header}
      <div className="px-3 pb-3 pt-4 lg:px-4">
        <DayTimeline plan={plan} trip={trip} isToday={isToday} nowTime={nowTime} editable={editable} hints={hints} compact={compact} />
      </div>
      {showStay && plan.stayTonight && (
        <button
          type="button"
          onClick={() => sheets.open({ type: "accommodation", id: plan.stayTonight!.id })}
          className="flex w-full items-center gap-3 border-t px-4 py-3 text-left transition-colors hover:bg-surface-2 lg:px-5"
        >
          <Bed className="size-[18px] shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[14px]">
            <span className="text-muted-foreground">Tonight · </span>
            <span className="font-medium">{plan.stayTonight.property}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
        </button>
      )}
    </section>
  );
}
