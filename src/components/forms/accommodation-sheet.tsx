"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Laptop, Trash2, WashingMachine, Wifi } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, MoneyInput, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useActiveTrip, useData, useToday } from "@/lib/store/hooks";
import { deleteAccommodation, saveAccommodation, syncPayment } from "@/lib/store/actions";
import { useZodForm } from "@/lib/use-form";
import { paidFor } from "@/lib/calc/bookings";
import { nights as countNights } from "@/lib/calc/trip";
import { addDays } from "@/lib/calc/dates";
import { currencySymbol, money } from "@/lib/format";
import { BookingFields, SectionLabel, type BookingFieldValues } from "./shared";
import type { SheetRequest } from "./sheets-provider";

const schema = z
  .object({
    property: z.string().trim().min(1, "Name the property").max(80),
    city: z.string().trim().min(1, "Which city?").max(60),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    pricePerNight: z.string().refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a nightly price (0 if free)"),
    wifi: z.boolean(),
    wifiSpeed: z.string().optional(),
    wifiNetwork: z.string().optional(),
    wifiPassword: z.string().optional(),
    workspace: z.boolean(),
    laundry: z.boolean(),
    address: z.string().optional(),
    mapUrl: z.string().trim().refine((v) => !v || /^https?:\/\//.test(v), "Use a full link starting with https://").optional(),
    notes: z.string().max(800).optional(),
  })
  .refine((v) => v.checkOut > v.checkIn, { path: ["checkOut"], message: "Check-out must be after check-in" });

export function AccommodationSheet({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: Extract<SheetRequest, { type: "accommodation" }>;
}) {
  const data = useData();
  const trip = useActiveTrip();
  const { today } = useToday();
  const existing = request.id ? data.accommodations.find((a) => a.id === request.id) : undefined;
  const start = request.date ?? (trip && today >= trip.startDate && today <= trip.endDate ? today : trip?.startDate ?? today);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const form = useZodForm(schema, {
    property: existing?.property ?? "",
    city: existing?.city ?? "",
    checkIn: existing?.checkIn ?? start,
    checkOut: existing?.checkOut ?? addDays(start, 2),
    checkInTime: existing?.checkInTime ?? "14:00",
    checkOutTime: existing?.checkOutTime ?? "11:00",
    pricePerNight: existing ? String(existing.pricePerNight) : "",
    wifi: existing?.wifi?.available ?? true,
    wifiSpeed: existing?.wifi?.speedMbps ? String(existing.wifi.speedMbps) : "",
    wifiNetwork: existing?.wifi?.network ?? "",
    wifiPassword: existing?.wifi?.password ?? "",
    workspace: existing?.workspace ?? false,
    laundry: existing?.laundry ?? false,
    address: existing?.address ?? "",
    mapUrl: existing?.mapUrl ?? "",
    notes: existing?.notes ?? "",
  });
  const { values, set, errors } = form;
  const [booking, setBooking] = React.useState<BookingFieldValues>({
    status: existing?.booking.status ?? "need_to_book",
    platform: existing?.booking.platform ?? "",
    reference: existing?.booking.reference ?? "",
    deadline: existing?.booking.deadline ?? "",
    paid: existing ? String(paidFor(data.expenses, "accommodation", existing.id) || "") : "",
  });

  if (!trip) return null;
  const symbol = currencySymbol(trip.currency);
  const n = values.checkOut > values.checkIn ? countNights(values.checkIn, values.checkOut) : 0;
  const total = n * (Number(values.pricePerNight) || 0);
  const workation = trip.workSchedule.enabled;

  const submit = form.handleSubmit((v) => {
    const paid = Number(booking.paid) || 0;
    if (paid > total) {
      form.setErrors({ paid: "Paid can't exceed the total" });
      return;
    }
    const id = saveAccommodation({
      id: existing?.id,
      tripId: trip.id,
      property: v.property,
      city: v.city,
      checkIn: v.checkIn,
      checkOut: v.checkOut,
      checkInTime: v.checkInTime || undefined,
      checkOutTime: v.checkOutTime || undefined,
      pricePerNight: Math.round(Number(v.pricePerNight)),
      booking: {
        status: booking.status,
        platform: booking.platform || undefined,
        reference: booking.reference || undefined,
        deadline: booking.deadline || undefined,
        deadlineLabel:
          booking.status === "need_to_book" ? "Book before" : booking.status === "confirmed" ? "Free cancellation until" : "Confirm by",
      },
      wifi: {
        available: v.wifi,
        speedMbps: v.wifiSpeed ? Number(v.wifiSpeed) : undefined,
        network: v.wifiNetwork || undefined,
        password: v.wifiPassword || undefined,
      },
      workspace: v.workspace,
      laundry: v.laundry,
      address: v.address || undefined,
      mapUrl: v.mapUrl || undefined,
      notes: v.notes || undefined,
    });
    syncPayment(trip.id, "accommodation", id, paid, { label: `${v.property} (${n} nights)`, date: today, location: v.city });
    toast.success(existing ? "Stay updated" : "Stay added");
    onOpenChange(false);
  });

  const workRows = (
    <div className="divide-y rounded-lg border">
      <div className="px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="acc-wifi" className="flex items-center gap-2 text-[13px] font-medium">
            <Wifi className="size-4 text-muted-foreground" /> Wi-Fi
          </label>
          <Switch id="acc-wifi" checked={values.wifi} onCheckedChange={(c) => set("wifi", c)} />
        </div>
        {values.wifi && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Field label="Speed (Mbps)" htmlFor="acc-wifi-speed">
              <Input id="acc-wifi-speed" inputMode="numeric" placeholder="e.g. 40" value={values.wifiSpeed} onChange={(e) => set("wifiSpeed", e.target.value.replace(/[^0-9]/g, ""))} />
            </Field>
            <Field label="Network" htmlFor="acc-wifi-net">
              <Input id="acc-wifi-net" value={values.wifiNetwork} onChange={(e) => set("wifiNetwork", e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="acc-wifi-pw">
              <Input id="acc-wifi-pw" value={values.wifiPassword} onChange={(e) => set("wifiPassword", e.target.value)} />
            </Field>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <label htmlFor="acc-ws" className="flex items-center gap-2 text-[13px] font-medium">
          <Laptop className="size-4 text-muted-foreground" /> Workspace / desk
        </label>
        <Switch id="acc-ws" checked={values.workspace} onCheckedChange={(c) => set("workspace", c)} />
      </div>
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <label htmlFor="acc-laundry" className="flex items-center gap-2 text-[13px] font-medium">
          <WashingMachine className="size-4 text-muted-foreground" /> Laundry
        </label>
        <Switch id="acc-laundry" checked={values.laundry} onCheckedChange={(c) => set("laundry", c)} />
      </div>
    </div>
  );

  return (
    <>
      <ResponsiveSheet
        open={open}
        onOpenChange={onOpenChange}
        wide
        title={existing ? "Edit stay" : "Add accommodation"}
        footer={
          <>
            {existing && (
              <Button variant="destructive-ghost" onClick={() => setConfirmDelete(true)} className="lg:mr-auto lg:flex-none">
                <Trash2 /> Delete
              </Button>
            )}
            <Button type="submit" form="acc-form" size="lg" className="lg:h-10">
              {existing ? "Save changes" : "Add stay"}
            </Button>
          </>
        }
      >
        <form id="acc-form" onSubmit={submit} className="grid grid-cols-1 gap-5" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Property" htmlFor="acc-prop" error={errors.property} className="col-span-2 sm:col-span-1">
              <Input id="acc-prop" autoFocus={!existing} placeholder="e.g. Varkala Hostel" value={values.property} aria-invalid={!!errors.property} onChange={(e) => set("property", e.target.value)} />
            </Field>
            <Field label="City" htmlFor="acc-city" error={errors.city} className="col-span-2 sm:col-span-1">
              <Input id="acc-city" placeholder="e.g. Varkala" value={values.city} aria-invalid={!!errors.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Check-in" htmlFor="acc-in" error={errors.checkIn}>
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <Input id="acc-in" type="date" value={values.checkIn} onChange={(e) => set("checkIn", e.target.value)} />
                <Input aria-label="Check-in time" type="time" className="w-[118px]" value={values.checkInTime} onChange={(e) => set("checkInTime", e.target.value)} />
              </div>
            </Field>
            <Field label="Check-out" htmlFor="acc-out" error={errors.checkOut}>
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <Input id="acc-out" type="date" value={values.checkOut} aria-invalid={!!errors.checkOut} onChange={(e) => set("checkOut", e.target.value)} />
                <Input aria-label="Check-out time" type="time" className="w-[118px]" value={values.checkOutTime} onChange={(e) => set("checkOutTime", e.target.value)} />
              </div>
            </Field>
            <Field label="Price per night" htmlFor="acc-price" error={errors.pricePerNight}>
              <MoneyInput id="acc-price" symbol={symbol} placeholder="0" value={values.pricePerNight} aria-invalid={!!errors.pricePerNight} onChange={(e) => set("pricePerNight", e.target.value)} />
            </Field>
            <div className="grid content-end gap-1 pb-2.5 text-[13px]">
              <span className="text-muted-foreground">
                {n} {n === 1 ? "night" : "nights"}
              </span>
              <span className="text-[17px] font-semibold tabular">{money(total, trip.currency)}</span>
            </div>
          </div>

          {workation && (
            <>
              <SectionLabel>For working</SectionLabel>
              {workRows}
            </>
          )}

          <SectionLabel>Booking</SectionLabel>
          <BookingFields
            values={booking}
            set={(k, v) => setBooking((b) => ({ ...b, [k]: v }))}
            total={total}
            symbol={symbol}
            idPrefix="acc"
            deadlineLabel={booking.status === "confirmed" ? "Cancellation deadline" : "Book before"}
            errors={errors}
          />

          {!workation && (
            <>
              <SectionLabel>Amenities</SectionLabel>
              {workRows}
            </>
          )}

          <SectionLabel>Location</SectionLabel>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Address" htmlFor="acc-addr" optional>
              <Input id="acc-addr" value={values.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Map link" htmlFor="acc-map" optional error={errors.mapUrl}>
              <Input id="acc-map" type="url" placeholder="https://maps.google.com/…" value={values.mapUrl} aria-invalid={!!errors.mapUrl} onChange={(e) => set("mapUrl", e.target.value)} />
            </Field>
            <Field label="Notes" htmlFor="acc-notes" optional>
              <Textarea id="acc-notes" rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </form>
      </ResponsiveSheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this stay?"
        description="It will be removed from your timeline and bookings. Payments stay in Money, unlinked."
        onConfirm={() => {
          if (existing) deleteAccommodation(existing.id);
          onOpenChange(false);
          toast("Stay deleted");
        }}
      />
    </>
  );
}
