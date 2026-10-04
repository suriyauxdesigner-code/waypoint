"use client";

import { Bed, ChevronRight, Receipt, StickyNote, Ticket, TrainFront, CalendarCheck } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import type { LucideIcon } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { useSheets, type SheetRequest } from "./sheets-provider";

export const ADD_OPTIONS: { key: string; label: string; hint: string; icon: LucideIcon; request: SheetRequest }[] = [
  { key: "expense", label: "Expense", hint: "Log what you actually spent", icon: Receipt, request: { type: "expense" } },
  { key: "activity", label: "Plan", hint: "Something to do, eat or see", icon: Ticket, request: { type: "event", eventType: "activity" } },
  { key: "transport", label: "Transport", hint: "Bus, train, flight…", icon: TrainFront, request: { type: "transport" } },
  { key: "stay", label: "Stay", hint: "Hostel, hotel, homestay", icon: Bed, request: { type: "accommodation" } },
  { key: "booking", label: "Booking", hint: "Tickets, tours, passes", icon: CalendarCheck, request: { type: "booking" } },
  { key: "note", label: "Note", hint: "A reminder on a day", icon: StickyNote, request: { type: "event", eventType: "note" } },
];

export function AddMenuSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const sheets = useSheets();
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Add to your trip" description="Pick what you want to note down">
      <ul className="-mx-2 grid grid-cols-1 gap-1 pb-1 sm:grid-cols-2">
        {ADD_OPTIONS.map((o) => (
          <li key={o.key}>
            <button
              type="button"
              onClick={() => sheets.open(o.request)}
              className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors outline-none hover:bg-muted active:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <IconChip icon={o.icon} tone={o.key === "expense" ? "accent" : "neutral"} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium leading-tight">{o.label}</span>
                <span className="block text-[13px] text-muted-foreground">{o.hint}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </ResponsiveSheet>
  );
}
