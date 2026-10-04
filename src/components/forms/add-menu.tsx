"use client";

import { Bed, Receipt, StickyNote, Ticket, TrainFront, CalendarCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { useSheets, type SheetRequest } from "./sheets-provider";

export const ADD_OPTIONS: { key: string; label: string; hint: string; icon: LucideIcon; request: SheetRequest }[] = [
  { key: "expense", label: "Expense", hint: "Log money spent", icon: Receipt, request: { type: "expense" } },
  { key: "activity", label: "Activity", hint: "Plan something to do", icon: Ticket, request: { type: "event", eventType: "activity" } },
  { key: "transport", label: "Transport", hint: "Bus, train, flight…", icon: TrainFront, request: { type: "transport" } },
  { key: "stay", label: "Accommodation", hint: "Hostel, hotel, homestay", icon: Bed, request: { type: "accommodation" } },
  { key: "booking", label: "Booking", hint: "Tickets, tours, forms", icon: CalendarCheck, request: { type: "booking" } },
  { key: "note", label: "Note", hint: "Reminder on a day", icon: StickyNote, request: { type: "event", eventType: "note" } },
];

export function AddMenuSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const sheets = useSheets();
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Add to trip">
      <div className="grid grid-cols-2 gap-2 pb-2">
        {ADD_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => sheets.open(o.request)}
            className="flex min-h-[76px] flex-col items-start justify-between gap-2 rounded-xl border bg-surface p-3.5 text-left transition-colors hover:bg-muted active:scale-[0.98] outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <o.icon className="size-5 text-muted-foreground" />
            <span>
              <span className="block text-[15px] font-medium leading-tight">{o.label}</span>
              <span className="block text-[12px] text-muted-foreground">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </ResponsiveSheet>
  );
}
