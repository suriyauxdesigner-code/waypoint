"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, MoneyInput, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EVENT_ICONS } from "@/components/common/icons";
import { useActiveTrip, useData, useToday } from "@/lib/store/hooks";
import { deleteEvent, saveEvent, syncPayment } from "@/lib/store/actions";
import { useZodForm } from "@/lib/use-form";
import { eventWorkOverlap } from "@/lib/calc/work";
import { EVENT_TYPE_LABEL } from "@/lib/calc/timeline";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BookingStatus, EventType } from "@/lib/types";
import { BookingFields, WorkConflictNotice, type BookingFieldValues } from "./shared";
import type { SheetRequest } from "./sheets-provider";
import { paidFor } from "@/lib/calc/bookings";
import { toMinutes } from "@/lib/calc/dates";

const TYPES: EventType[] = ["activity", "food", "free_time", "work_session", "errand", "note"];

const schema = z
  .object({
    title: z.string().trim().min(1, "Give it a name").max(80),
    type: z.enum(["activity", "food", "free_time", "note", "work_session", "errand", "other"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    anytime: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    location: z.string().trim().max(80).optional(),
    cost: z.string().optional(),
    notes: z.string().trim().max(500).optional(),
    needsBooking: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.anytime && !v.startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Add a start time or choose Anytime" });
    if (!v.anytime && v.startTime && v.endTime && toMinutes(v.endTime) <= toMinutes(v.startTime))
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "End must be after start" });
    if (v.cost && (Number.isNaN(Number(v.cost)) || Number(v.cost) < 0)) ctx.addIssue({ code: "custom", path: ["cost"], message: "Enter a valid amount" });
  });

export function EventSheet({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: Extract<SheetRequest, { type: "event" }>;
}) {
  const data = useData();
  const trip = useActiveTrip();
  const { today } = useToday();
  const existing = request.id ? data.events.find((e) => e.id === request.id) : undefined;
  const startRef = React.useRef<HTMLInputElement>(null);
  const initialDate =
    existing?.date ??
    request.date ??
    (trip && today >= trip.startDate && today <= trip.endDate ? today : trip?.startDate ?? today);

  const form = useZodForm(schema, {
    title: existing?.title ?? "",
    type: (existing?.type ?? request.eventType ?? "activity") as EventType,
    date: initialDate,
    anytime: existing ? !existing.startTime : request.eventType === "note",
    startTime: existing?.startTime ?? "",
    endTime: existing?.endTime ?? "",
    location: existing?.location ?? "",
    cost: existing?.cost ? String(existing.cost) : "",
    notes: existing?.notes ?? "",
    needsBooking: !!existing?.booking,
  });
  const { values, set, errors } = form;
  const [booking, setBooking] = React.useState<BookingFieldValues>({
    status: existing?.booking?.status ?? ("need_to_book" as BookingStatus),
    platform: existing?.booking?.platform ?? "",
    reference: existing?.booking?.reference ?? "",
    deadline: existing?.booking?.deadline ?? "",
    paid: existing ? String(paidFor(data.expenses, "event", existing.id) || "") : "",
  });
  const [ack, setAck] = React.useState(!!existing?.keepDespiteWork);

  const overlap =
    trip && !values.anytime && values.type !== "work_session"
      ? eventWorkOverlap(values.date, values.startTime || undefined, values.endTime || undefined, trip.workSchedule)
      : 0;

  // Re-arm the warning if the time changes.
  const timeKey = `${values.date}|${values.startTime}|${values.endTime}`;
  const prevKey = React.useRef(timeKey);
  React.useEffect(() => {
    if (prevKey.current !== timeKey && !existing?.keepDespiteWork) setAck(false);
    prevKey.current = timeKey;
  }, [timeKey, existing?.keepDespiteWork]);

  if (!trip) return null;
  const symbol = currencySymbol(trip.currency);
  const isNote = values.type === "note";
  const outsideTrip = values.date < trip.startDate || values.date > trip.endDate;

  const submit = form.handleSubmit((v) => {
    const cost = v.cost ? Math.round(Number(v.cost)) : undefined;
    if (v.needsBooking && (Number(booking.paid) || 0) > (cost ?? 0)) {
      form.setErrors({ paid: "Paid can't exceed the cost" });
      return;
    }
    const id = saveEvent({
      id: existing?.id,
      tripId: trip.id,
      date: v.date,
      type: v.type,
      title: v.title,
      startTime: v.anytime ? undefined : v.startTime || undefined,
      endTime: v.anytime ? undefined : v.endTime || undefined,
      location: v.location || undefined,
      cost,
      notes: v.notes || undefined,
      keepDespiteWork: overlap > 0 ? true : undefined,
      booking: v.needsBooking
        ? {
            status: booking.status,
            platform: booking.platform || undefined,
            reference: booking.reference || undefined,
            deadline: booking.deadline || undefined,
            deadlineLabel: booking.status === "need_to_book" ? "Book by" : undefined,
          }
        : undefined,
    });
    if (v.needsBooking) {
      syncPayment(trip.id, "event", id, Math.min(Number(booking.paid) || 0, cost ?? 0), {
        label: v.title,
        date: today,
        location: v.location || undefined,
      });
    }
    toast.success(existing ? "Saved" : `${isNote ? "Note" : EVENT_TYPE_LABEL[v.type]} added`);
    onOpenChange(false);
  });

  const remove = () => {
    if (!existing) return;
    const snapshot = structuredClone(existing);
    deleteEvent(existing.id);
    onOpenChange(false);
    toast("Removed from timeline", { action: { label: "Undo", onClick: () => saveEvent(snapshot) } });
  };

  const needsChoice = overlap > 0 && !ack;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? `Edit ${isNote ? "note" : "plan"}` : isNote ? "Add note" : "Add to timeline"}
      footer={
        <>
          {existing && (
            <Button variant="destructive-ghost" onClick={remove} className="lg:mr-auto lg:flex-none">
              <Trash2 /> Delete
            </Button>
          )}
          <Button type="submit" form="event-form" size="lg" className="lg:h-10">
            {needsChoice ? "Save anyway" : existing ? "Save changes" : "Add"}
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} className="grid grid-cols-1 gap-4" noValidate>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0 lg:flex-wrap">
          {TYPES.map((t) => {
            const Icon = EVENT_ICONS[t];
            const on = values.type === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => set("type", t)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
                )}
              >
                <Icon className="size-3.5" /> {EVENT_TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>

        <Field label={isNote ? "Note" : "What"} htmlFor="ev-title" error={errors.title}>
          <Input
            id="ev-title"
            autoFocus={!existing}
            placeholder={isNote ? "e.g. Ask hostel about luggage storage" : "e.g. Sunrise viewpoint"}
            value={values.title}
            aria-invalid={!!errors.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Date"
            htmlFor="ev-date"
            error={errors.date}
            hint={outsideTrip ? "Outside your trip dates" : undefined}
            className="col-span-2 sm:col-span-1"
          >
            <Input id="ev-date" type="date" value={values.date} min={trip.startDate} max={trip.endDate} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <div className="col-span-2 flex items-center justify-between gap-3 self-end rounded-md border px-3 h-11 lg:h-10 sm:col-span-1">
            <label htmlFor="ev-anytime" className="text-[13px] font-medium">
              Anytime
              <span className="block text-[11px] font-normal text-muted-foreground">No fixed time</span>
            </label>
            <Switch id="ev-anytime" checked={values.anytime} onCheckedChange={(c) => set("anytime", c)} />
          </div>
        </div>

        {!values.anytime && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" htmlFor="ev-start" error={errors.startTime}>
              <Input id="ev-start" ref={startRef} type="time" value={values.startTime} aria-invalid={!!errors.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </Field>
            <Field label="End" htmlFor="ev-end" optional error={errors.endTime}>
              <Input id="ev-end" type="time" value={values.endTime} aria-invalid={!!errors.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </Field>
          </div>
        )}

        <WorkConflictNotice
          minutes={trip.workSchedule.protectWorkHours ? overlap : 0}
          acknowledged={ack}
          onKeep={() => setAck(true)}
          onChangeTime={() => {
            startRef.current?.focus();
            startRef.current?.showPicker?.();
          }}
        />

        {!isNote && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location" htmlFor="ev-loc" optional className="col-span-2 sm:col-span-1">
              <Input id="ev-loc" placeholder="Where" value={values.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Expected cost" htmlFor="ev-cost" optional error={errors.cost} className="col-span-2 sm:col-span-1">
              <MoneyInput id="ev-cost" symbol={symbol} placeholder="0" value={values.cost} onChange={(e) => set("cost", e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Notes" htmlFor="ev-notes" optional>
          <Textarea id="ev-notes" rows={2} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        {!isNote && (
          <div className="rounded-lg border">
            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
              <label htmlFor="ev-booking" className="text-[13px] font-medium">
                Needs a booking
                <span className="block text-[12px] font-normal text-muted-foreground">Track it in Bookings with status and payment</span>
              </label>
              <Switch id="ev-booking" checked={values.needsBooking} onCheckedChange={(c) => set("needsBooking", c)} />
            </div>
            {values.needsBooking && (
              <div className="border-t px-3.5 py-3.5">
                <BookingFields
                  values={booking}
                  set={(k, v) => setBooking((b) => ({ ...b, [k]: v }))}
                  total={Number(values.cost) || 0}
                  symbol={symbol}
                  idPrefix="ev"
                  deadlineLabel="Book / confirm by"
                  errors={errors}
                />
              </div>
            )}
          </div>
        )}
      </form>
    </ResponsiveSheet>
  );
}
