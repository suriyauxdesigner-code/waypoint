"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, MoneyInput, Select, Textarea } from "@/components/ui/input";
import { useActiveTrip, useData, useToday } from "@/lib/store/hooks";
import { deleteTransport, saveTransport, syncPayment } from "@/lib/store/actions";
import { MODE_LABEL, journeyWorkOverlap, realCost, ticketCost, travelDurationMin } from "@/lib/calc/transport";
import { paidFor } from "@/lib/calc/bookings";
import { absMinutes, fmtDuration } from "@/lib/calc/dates";
import { currencySymbol, money } from "@/lib/format";
import { uid } from "@/lib/utils";
import type { TransportLeg, TransportMode } from "@/lib/types";
import { BookingFields, SectionLabel, WorkConflictNotice, type BookingFieldValues } from "./shared";
import type { SheetRequest } from "./sheets-provider";
import { ConfirmDialog } from "@/components/ui/confirm";

export const MODES: TransportMode[] = ["bus", "train", "flight", "cab", "auto", "ferry", "metro", "scooter", "walk", "other"];

export interface LegDraft {
  id: string;
  mode: TransportMode;
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
  operator: string;
  number: string;
  cost: string;
}

export const legSchema = z
  .object({
    id: z.string(),
    mode: z.enum(["bus", "train", "flight", "cab", "auto", "ferry", "metro", "scooter", "walk", "other"]),
    from: z.string().trim().min(1, "From?"),
    to: z.string().trim().min(1, "To?"),
    departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date"),
    departTime: z.string().regex(/^\d{2}:\d{2}$/, "Time"),
    arriveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date"),
    arriveTime: z.string().regex(/^\d{2}:\d{2}$/, "Time"),
    operator: z.string().optional(),
    number: z.string().optional(),
    cost: z.string().refine((c) => c === "" || (!Number.isNaN(Number(c)) && Number(c) >= 0), "Invalid"),
  })
  .superRefine((l, ctx) => {
    if (l.departDate && l.departTime && l.arriveDate && l.arriveTime && absMinutes(l.arriveDate, l.arriveTime) <= absMinutes(l.departDate, l.departTime))
      ctx.addIssue({ code: "custom", path: ["arriveTime"], message: "Arrival must be after departure" });
  });

export function toLeg(d: LegDraft): TransportLeg {
  return {
    id: d.id,
    mode: d.mode,
    from: d.from.trim(),
    to: d.to.trim(),
    departDate: d.departDate,
    departTime: d.departTime,
    arriveDate: d.arriveDate,
    arriveTime: d.arriveTime,
    operator: d.operator.trim() || undefined,
    number: d.number.trim() || undefined,
    cost: Math.round(Number(d.cost) || 0),
  };
}

export function fromLeg(l: TransportLeg): LegDraft {
  return { ...l, operator: l.operator ?? "", number: l.number ?? "", cost: l.cost ? String(l.cost) : "" };
}

export function blankLeg(date: string, from = "", to = ""): LegDraft {
  return { id: uid("leg"), mode: "bus", from, to, departDate: date, departTime: "", arriveDate: date, arriveTime: "", operator: "", number: "", cost: "" };
}

/** Validate a list of leg drafts; returns per-leg error maps. */
export function validateLegs(legs: LegDraft[]) {
  const errs: Record<string, string>[] = legs.map(() => ({}));
  let ok = legs.length > 0;
  legs.forEach((l, i) => {
    const r = legSchema.safeParse(l);
    if (!r.success) {
      ok = false;
      for (const issue of r.error.issues) {
        const k = String(issue.path[0]);
        if (!errs[i][k]) errs[i][k] = issue.message;
      }
    }
  });
  return { ok, errs };
}

export function LegEditor({
  legs,
  setLegs,
  errors,
  symbol,
}: {
  legs: LegDraft[];
  setLegs: (fn: (l: LegDraft[]) => LegDraft[]) => void;
  errors: Record<string, string>[];
  symbol: string;
}) {
  const update = (i: number, patch: Partial<LegDraft>) =>
    setLegs((ls) =>
      ls.map((l, idx) => {
        if (idx !== i) return l;
        const next = { ...l, ...patch };
        // Keep arrival date sensible when departure date changes.
        if (patch.departDate && (!l.arriveDate || l.arriveDate < patch.departDate)) next.arriveDate = patch.departDate;
        return next;
      }),
    );
  return (
    <div className="grid grid-cols-1 gap-3">
      {legs.map((leg, i) => {
        const e = errors[i] ?? {};
        return (
          <div key={leg.id} className="rounded-lg border">
            <div className="flex items-center justify-between border-b bg-surface-2/60 px-3 py-2">
              <span className="eyebrow">Leg {i + 1}</span>
              {legs.length > 1 && (
                <Button variant="ghost" size="icon-sm" aria-label={`Remove leg ${i + 1}`} onClick={() => setLegs((ls) => ls.filter((_, idx) => idx !== i))}>
                  <X />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 p-3">
              <Field label="Mode" htmlFor={`${leg.id}-mode`}>
                <Select id={`${leg.id}-mode`} value={leg.mode} onChange={(ev) => update(i, { mode: ev.target.value as TransportMode })}>
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {MODE_LABEL[m]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ticket cost" htmlFor={`${leg.id}-cost`} error={e.cost}>
                <MoneyInput id={`${leg.id}-cost`} symbol={symbol} placeholder="0" value={leg.cost} onChange={(ev) => update(i, { cost: ev.target.value })} />
              </Field>
              <Field label="From" htmlFor={`${leg.id}-from`} error={e.from}>
                <Input id={`${leg.id}-from`} value={leg.from} aria-invalid={!!e.from} onChange={(ev) => update(i, { from: ev.target.value })} />
              </Field>
              <Field label="To" htmlFor={`${leg.id}-to`} error={e.to}>
                <Input id={`${leg.id}-to`} value={leg.to} aria-invalid={!!e.to} onChange={(ev) => update(i, { to: ev.target.value })} />
              </Field>
              <Field label="Departs" htmlFor={`${leg.id}-dd`} error={e.departDate || e.departTime}>
                <div className="grid grid-cols-[1fr_auto] gap-1.5">
                  <Input id={`${leg.id}-dd`} type="date" value={leg.departDate} aria-invalid={!!e.departDate} onChange={(ev) => update(i, { departDate: ev.target.value })} />
                  <Input aria-label="Departure time" type="time" className="w-[118px]" value={leg.departTime} aria-invalid={!!e.departTime} onChange={(ev) => update(i, { departTime: ev.target.value })} />
                </div>
              </Field>
              <Field label="Arrives" htmlFor={`${leg.id}-ad`} error={e.arriveDate || e.arriveTime}>
                <div className="grid grid-cols-[1fr_auto] gap-1.5">
                  <Input id={`${leg.id}-ad`} type="date" value={leg.arriveDate} aria-invalid={!!e.arriveDate} onChange={(ev) => update(i, { arriveDate: ev.target.value })} />
                  <Input aria-label="Arrival time" type="time" className="w-[118px]" value={leg.arriveTime} aria-invalid={!!e.arriveTime} onChange={(ev) => update(i, { arriveTime: ev.target.value })} />
                </div>
              </Field>
              <Field label="Operator" htmlFor={`${leg.id}-op`} optional>
                <Input id={`${leg.id}-op`} placeholder="KSRTC, IndiGo…" value={leg.operator} onChange={(ev) => update(i, { operator: ev.target.value })} />
              </Field>
              <Field label="Number / class" htmlFor={`${leg.id}-no`} optional>
                <Input id={`${leg.id}-no`} placeholder="12626 · 3A" value={leg.number} onChange={(ev) => update(i, { number: ev.target.value })} />
              </Field>
            </div>
          </div>
        );
      })}
      <Button
        variant="outline"
        onClick={() =>
          setLegs((ls) => {
            const last = ls[ls.length - 1];
            return [...ls, blankLeg(last?.arriveDate || last?.departDate || "", last?.to ?? "")];
          })
        }
      >
        <Plus /> Add connecting leg
      </Button>
    </div>
  );
}

export interface ExtraDraft {
  id: string;
  label: string;
  amount: string;
}

export function ExtrasEditor({ extras, setExtras, symbol }: { extras: ExtraDraft[]; setExtras: (fn: (e: ExtraDraft[]) => ExtraDraft[]) => void; symbol: string }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {extras.map((x, i) => (
        <div key={x.id} className="grid grid-cols-[1fr_120px_auto] gap-2">
          <Input aria-label="Extra cost label" placeholder="e.g. Station transport" value={x.label} onChange={(e) => setExtras((xs) => xs.map((y, idx) => (idx === i ? { ...y, label: e.target.value } : y)))} />
          <MoneyInput aria-label="Extra cost amount" symbol={symbol} placeholder="0" value={x.amount} onChange={(e) => setExtras((xs) => xs.map((y, idx) => (idx === i ? { ...y, amount: e.target.value } : y)))} />
          <Button variant="ghost" size="icon" aria-label="Remove extra" onClick={() => setExtras((xs) => xs.filter((_, idx) => idx !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setExtras((xs) => [...xs, { id: uid("x"), label: "", amount: "" }])}>
        <Plus /> Add extra cost
      </Button>
    </div>
  );
}

export function TransportSheet({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: Extract<SheetRequest, { type: "transport" }>;
}) {
  const data = useData();
  const trip = useActiveTrip();
  const { today } = useToday();
  const existing = request.id ? data.transports.find((t) => t.id === request.id) : undefined;
  const startDate = request.date ?? (trip && today >= trip.startDate && today <= trip.endDate ? today : trip?.startDate ?? today);

  const [from, setFrom] = React.useState(existing?.from ?? "");
  const [to, setTo] = React.useState(existing?.to ?? "");
  const [legs, setLegs] = React.useState<LegDraft[]>(existing ? existing.legs.map(fromLeg) : [blankLeg(startDate)]);
  const [extras, setExtras] = React.useState<ExtraDraft[]>(
    existing?.extras.map((e) => ({ id: e.id, label: e.label, amount: String(e.amount) })) ?? [],
  );
  const [notes, setNotes] = React.useState(existing?.notes ?? "");
  const [booking, setBooking] = React.useState<BookingFieldValues>({
    status: existing?.booking.status ?? "need_to_book",
    platform: existing?.booking.platform ?? "",
    reference: existing?.booking.reference ?? "",
    deadline: existing?.booking.deadline ?? "",
    paid: existing ? String(paidFor(data.expenses, "transport", existing.id) || "") : "",
  });
  const [legErrors, setLegErrors] = React.useState<Record<string, string>[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [ack, setAck] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  if (!trip) return null;
  const symbol = currencySymbol(trip.currency);

  // Default the journey endpoints from the legs when left blank.
  const effectiveFrom = from.trim() || legs[0]?.from || "";
  const effectiveTo = to.trim() || legs[legs.length - 1]?.to || "";

  const validLegs = legs.filter((l) => legSchema.safeParse(l).success).map(toLeg);
  const overlap = trip.workSchedule.protectWorkHours ? journeyWorkOverlap(validLegs, trip.workSchedule) : 0;
  const tickets = ticketCost(validLegs);
  const total = realCost({ legs: validLegs, extras: extras.map((x) => ({ amount: Number(x.amount) || 0 })) });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateLegs(legs);
    setLegErrors(v.errs);
    const errs: Record<string, string> = {};
    if (!effectiveFrom) errs.from = "Where from?";
    if (!effectiveTo) errs.to = "Where to?";
    const paid = Number(booking.paid) || 0;
    if (paid < 0 || Number.isNaN(paid)) errs.paid = "Enter a valid amount";
    if (paid > ticketCost(legs.map(toLeg))) errs.paid = "Paid can't exceed the ticket cost";
    setErrors(errs);
    if (!v.ok || Object.keys(errs).length) {
      toast.error("Check the highlighted fields");
      return;
    }
    const id = saveTransport({
      id: existing?.id,
      tripId: trip.id,
      from: effectiveFrom,
      to: effectiveTo,
      legs: legs.map(toLeg),
      extras: extras.filter((x) => x.label.trim() && Number(x.amount) > 0).map((x) => ({ id: x.id, label: x.label.trim(), amount: Math.round(Number(x.amount)) })),
      booking: {
        status: booking.status,
        platform: booking.platform || undefined,
        reference: booking.reference || undefined,
        deadline: booking.deadline || undefined,
        deadlineLabel: booking.status === "need_to_book" ? "Book before" : undefined,
      },
      decisionId: existing?.decisionId,
      notes: notes.trim() || undefined,
    });
    syncPayment(trip.id, "transport", id, paid, { label: `${effectiveFrom} → ${effectiveTo}`, date: today, location: effectiveFrom });
    toast.success(existing ? "Journey updated" : "Journey added to your timeline");
    onOpenChange(false);
  };

  return (
    <>
      <ResponsiveSheet
        open={open}
        onOpenChange={onOpenChange}
        wide
        title={existing ? "Edit transport" : "Add transport"}
        description="One journey can have several legs — e.g. bus to Ernakulam, then train to Varkala."
        footer={
          <>
            {existing && (
              <Button variant="destructive-ghost" onClick={() => setConfirmDelete(true)} className="lg:mr-auto lg:flex-none">
                <Trash2 /> Delete
              </Button>
            )}
            <Button type="submit" form="transport-form" size="lg" className="lg:h-10">
              {overlap > 0 && !ack ? "Save anyway" : existing ? "Save changes" : "Add journey"}
            </Button>
          </>
        }
      >
        <form id="transport-form" onSubmit={submit} className="grid grid-cols-1 gap-5" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="tr-from" error={errors.from} hint={!from && legs[0]?.from ? `Uses “${legs[0].from}”` : undefined}>
              <Input id="tr-from" placeholder="e.g. Munnar" value={from} aria-invalid={!!errors.from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To" htmlFor="tr-to" error={errors.to} hint={!to && legs[legs.length - 1]?.to ? `Uses “${legs[legs.length - 1].to}”` : undefined}>
              <Input id="tr-to" placeholder="e.g. Varkala" value={to} aria-invalid={!!errors.to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>

          <SectionLabel>Legs</SectionLabel>
          <LegEditor legs={legs} setLegs={setLegs} errors={legErrors} symbol={symbol} />

          <WorkConflictNotice
            minutes={overlap}
            acknowledged={ack}
            onKeep={() => setAck(true)}
            onChangeTime={() => document.querySelector<HTMLInputElement>("input[aria-label='Departure time']")?.focus()}
          />

          <SectionLabel>Extra costs</SectionLabel>
          <ExtrasEditor extras={extras} setExtras={setExtras} symbol={symbol} />

          {validLegs.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-muted px-3.5 py-3 text-[13px]">
              <span>
                <span className="text-muted-foreground">Tickets </span>
                <span className="font-medium tabular">{money(tickets, trip.currency)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Real cost </span>
                <span className="font-medium tabular">{money(total, trip.currency)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Door to door </span>
                <span className="font-medium tabular">{fmtDuration(travelDurationMin(validLegs))}</span>
              </span>
            </div>
          )}

          <SectionLabel>Booking</SectionLabel>
          <BookingFields
            values={booking}
            set={(k, v) => setBooking((b) => ({ ...b, [k]: v }))}
            total={tickets}
            symbol={symbol}
            idPrefix="tr"
            deadlineLabel="Book before"
            errors={errors}
          />

          <Field label="Notes" htmlFor="tr-notes" optional>
            <Textarea id="tr-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </form>
      </ResponsiveSheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this journey?"
        description="It will be removed from your timeline and bookings. Any payments stay in Money, unlinked."
        onConfirm={() => {
          if (existing) deleteTransport(existing.id);
          onOpenChange(false);
          toast("Journey deleted");
        }}
      />
    </>
  );
}
