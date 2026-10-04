"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { EventType, ISODate, TransportMode } from "@/lib/types";

/** Carried over when a plan turns out to be a journey. */
export interface TransportPrefill {
  mode?: TransportMode;
  from?: string;
  to?: string;
  departTime?: string;
  arriveTime?: string;
  cost?: string;
}

const ExpenseSheet = dynamic(() => import("./expense-sheet").then((m) => m.ExpenseSheet));
const EventSheet = dynamic(() => import("./event-sheet").then((m) => m.EventSheet));
const TransportSheet = dynamic(() => import("./transport-sheet").then((m) => m.TransportSheet));
const AccommodationSheet = dynamic(() => import("./accommodation-sheet").then((m) => m.AccommodationSheet));
const BookingSheet = dynamic(() => import("./booking-sheet").then((m) => m.BookingSheet));
const PhaseSheet = dynamic(() => import("./phase-sheet").then((m) => m.PhaseSheet));
const ExamSheet = dynamic(() => import("./exam-sheet").then((m) => m.ExamSheet));
const WorkSheet = dynamic(() => import("./work-sheet").then((m) => m.WorkSheet));
const AddMenuSheet = dynamic(() => import("./add-menu").then((m) => m.AddMenuSheet));

export type SheetRequest =
  | { type: "add-menu" }
  | { type: "expense"; id?: string; date?: ISODate; categoryId?: string }
  | { type: "event"; id?: string; date?: ISODate; eventType?: EventType }
  | { type: "transport"; id?: string; date?: ISODate; prefill?: TransportPrefill }
  | { type: "accommodation"; id?: string; date?: ISODate }
  | { type: "booking"; id?: string; date?: ISODate }
  | { type: "phase"; id?: string }
  | { type: "exam"; id?: string; date?: ISODate }
  | { type: "work"; date?: ISODate };

interface SheetsCtx {
  open: (req: SheetRequest) => void;
  close: () => void;
}

const Ctx = React.createContext<SheetsCtx | null>(null);

export function useSheets() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useSheets must be used within SheetsProvider");
  return ctx;
}

export function SheetsProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = React.useState<SheetRequest | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);

  const open = React.useCallback((r: SheetRequest) => {
    setReq(r);
    setNonce((n) => n + 1);
    setIsOpen(true);
  }, []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const value = React.useMemo(() => ({ open, close }), [open, close]);

  const onOpenChange = (o: boolean) => setIsOpen(o);
  const common = { open: isOpen, onOpenChange };

  return (
    <Ctx.Provider value={value}>
      {children}
      {req?.type === "add-menu" && <AddMenuSheet key={nonce} {...common} />}
      {req?.type === "expense" && <ExpenseSheet key={nonce} {...common} request={req} />}
      {req?.type === "event" && <EventSheet key={nonce} {...common} request={req} />}
      {req?.type === "transport" && <TransportSheet key={nonce} {...common} request={req} />}
      {req?.type === "accommodation" && <AccommodationSheet key={nonce} {...common} request={req} />}
      {req?.type === "booking" && <BookingSheet key={nonce} {...common} request={req} />}
      {req?.type === "phase" && <PhaseSheet key={nonce} {...common} request={req} />}
      {req?.type === "exam" && <ExamSheet key={nonce} {...common} request={req} />}
      {req?.type === "work" && <WorkSheet key={nonce} {...common} request={req} />}
    </Ctx.Provider>
  );
}
