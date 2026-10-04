"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Bed, TrainFront, Ticket, FileText, Trash2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, MoneyInput, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useActiveTrip, useData, useToday } from "@/lib/store/hooks";
import { deleteBooking, saveBooking, syncPayment } from "@/lib/store/actions";
import { useZodForm } from "@/lib/use-form";
import { paidFor } from "@/lib/calc/bookings";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookingFields, type BookingFieldValues } from "./shared";
import { useSheets, type SheetRequest } from "./sheets-provider";

const schema = z
  .object({
    title: z.string().trim().min(1, "What are you booking?").max(80),
    kind: z.enum(["activity", "other"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    endDate: z.string().optional(),
    location: z.string().max(80).optional(),
    price: z.string().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Enter a valid price"),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.date, { path: ["endDate"], message: "End can't be before start" });

export function BookingSheet({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: Extract<SheetRequest, { type: "booking" }>;
}) {
  const data = useData();
  const trip = useActiveTrip();
  const { today } = useToday();
  const sheets = useSheets();
  const existing = request.id ? data.bookings.find((b) => b.id === request.id) : undefined;
  const start = request.date ?? (trip && today >= trip.startDate && today <= trip.endDate ? today : trip?.startDate ?? today);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const form = useZodForm(schema, {
    title: existing?.title ?? "",
    kind: existing?.kind ?? ("activity" as "activity" | "other"),
    date: existing?.date ?? start,
    endDate: existing?.endDate ?? "",
    location: existing?.location ?? "",
    price: existing ? String(existing.price) : "",
    notes: existing?.notes ?? "",
  });
  const { values, set, errors } = form;
  const [booking, setBooking] = React.useState<BookingFieldValues>({
    status: existing?.booking.status ?? "need_to_book",
    platform: existing?.booking.platform ?? "",
    reference: existing?.booking.reference ?? "",
    deadline: existing?.booking.deadline ?? "",
    paid: existing ? String(paidFor(data.expenses, "booking", existing.id) || "") : "",
  });

  if (!trip) return null;
  const symbol = currencySymbol(trip.currency);
  const price = Number(values.price) || 0;

  const submit = form.handleSubmit((v) => {
    const paid = Number(booking.paid) || 0;
    if (paid > price) {
      form.setErrors({ paid: "Paid can't exceed the price" });
      return;
    }
    const id = saveBooking({
      id: existing?.id,
      tripId: trip.id,
      title: v.title,
      kind: v.kind,
      date: v.date,
      endDate: v.endDate || undefined,
      location: v.location || undefined,
      price: Math.round(price),
      booking: {
        status: booking.status,
        platform: booking.platform || undefined,
        reference: booking.reference || undefined,
        deadline: booking.deadline || undefined,
        deadlineLabel: booking.status === "need_to_book" ? "Book before" : undefined,
      },
      notes: v.notes || undefined,
    });
    syncPayment(trip.id, "booking", id, paid, { label: v.title, date: today, location: v.location || undefined });
    toast.success(existing ? "Booking updated" : "Booking added");
    onOpenChange(false);
  });

  return (
    <>
      <ResponsiveSheet
        open={open}
        onOpenChange={onOpenChange}
        title={existing ? "Edit booking" : "Add booking"}
        footer={
          <>
            {existing && (
              <Button variant="destructive-ghost" onClick={() => setConfirmDelete(true)} className="lg:mr-auto lg:flex-none">
                <Trash2 /> Delete
              </Button>
            )}
            <Button type="submit" form="bk-form" size="lg" className="lg:h-10">
              {existing ? "Save changes" : "Add booking"}
            </Button>
          </>
        }
      >
        <form id="bk-form" onSubmit={submit} className="grid grid-cols-1 gap-5" noValidate>
          {!existing && (
            <div className="grid grid-cols-1 gap-2">
              <span className="text-[13px] font-medium">What are you booking?</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { k: "stay", label: "Stay", icon: Bed, onClick: () => sheets.open({ type: "accommodation", date: values.date }) },
                  { k: "transport", label: "Transport", icon: TrainFront, onClick: () => sheets.open({ type: "transport", date: values.date }) },
                  { k: "activity", label: "Activity", icon: Ticket, onClick: () => set("kind", "activity") },
                  { k: "other", label: "Other", icon: FileText, onClick: () => set("kind", "other") },
                ].map((o) => {
                  const on = values.kind === o.k;
                  return (
                    <button
                      key={o.k}
                      type="button"
                      onClick={o.onClick}
                      aria-pressed={on}
                      className={cn(
                        "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-[12px] font-medium transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
                      )}
                    >
                      <o.icon className="size-4" />
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Field label="Name" htmlFor="bk-title" error={errors.title}>
            <Input id="bk-title" placeholder="e.g. Houseboat day cruise" value={values.title} aria-invalid={!!errors.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="bk-date" error={errors.date}>
              <Input id="bk-date" type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Until" htmlFor="bk-end" optional error={errors.endDate}>
              <Input id="bk-end" type="date" value={values.endDate} aria-invalid={!!errors.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
            <Field label="Location" htmlFor="bk-loc" optional>
              <Input id="bk-loc" value={values.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Price" htmlFor="bk-price" error={errors.price}>
              <MoneyInput id="bk-price" symbol={symbol} placeholder="0" value={values.price} onChange={(e) => set("price", e.target.value)} />
            </Field>
          </div>
          <BookingFields values={booking} set={(k, v) => setBooking((b) => ({ ...b, [k]: v }))} total={price} symbol={symbol} idPrefix="bk" errors={errors} />
          <Field label="Notes" htmlFor="bk-notes" optional>
            <Textarea id="bk-notes" rows={2} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </form>
      </ResponsiveSheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this booking?"
        onConfirm={() => {
          if (existing) deleteBooking(existing.id);
          onOpenChange(false);
          toast("Booking deleted");
        }}
      />
    </>
  );
}
