"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, MoneyInput, Textarea } from "@/components/ui/input";
import { ChipToggleGroup } from "@/components/ui/segmented";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useActiveTrip, useData } from "@/lib/store/hooks";
import { deletePhase, savePhase } from "@/lib/store/actions";
import { useZodForm } from "@/lib/use-form";
import { PHASE_PURPOSES, PURPOSE_LABEL } from "@/lib/labels";
import { currencySymbol } from "@/lib/format";
import type { TripPurpose } from "@/lib/types";
import type { SheetRequest } from "./sheets-provider";

const schema = z
  .object({
    name: z.string().trim().min(1, "Name this phase").max(60),
    location: z.string().trim().min(1, "Where is it?").max(60),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    purposes: z.array(z.string()).min(1, "Pick at least one purpose"),
    customPurpose: z.string().max(40).optional(),
    budget: z.string().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Enter a valid amount"),
    notes: z.string().max(800).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "End can't be before start" })
  .refine((v) => !v.purposes.includes("custom") || !!v.customPurpose?.trim(), { path: ["customPurpose"], message: "Describe the custom purpose" });

export function PhaseSheet({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: Extract<SheetRequest, { type: "phase" }>;
}) {
  const data = useData();
  const trip = useActiveTrip();
  const existing = request.id ? data.phases.find((p) => p.id === request.id) : undefined;
  const lastPhase = data.phases.filter((p) => p.tripId === trip?.id).sort((a, b) => a.endDate.localeCompare(b.endDate)).pop();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const form = useZodForm(schema, {
    name: existing?.name ?? "",
    location: existing?.location ?? "",
    startDate: existing?.startDate ?? lastPhase?.endDate ?? trip?.startDate ?? "",
    endDate: existing?.endDate ?? trip?.endDate ?? "",
    purposes: (existing?.purposes ?? []) as string[],
    customPurpose: existing?.customPurpose ?? "",
    budget: existing?.budget ? String(existing.budget) : "",
    notes: existing?.notes ?? "",
  });
  const { values, set, errors } = form;
  if (!trip) return null;
  const outside = values.startDate < trip.startDate || values.endDate > trip.endDate;

  const submit = form.handleSubmit((v) => {
    savePhase({
      id: existing?.id,
      tripId: trip.id,
      name: v.name,
      location: v.location,
      startDate: v.startDate,
      endDate: v.endDate,
      purposes: v.purposes as TripPurpose[],
      customPurpose: v.purposes.includes("custom") ? v.customPurpose?.trim() : undefined,
      budget: v.budget ? Math.round(Number(v.budget)) : undefined,
      notes: v.notes || undefined,
      order: existing?.order,
    });
    toast.success(existing ? "Phase updated" : "Phase added");
    onOpenChange(false);
  });

  return (
    <>
      <ResponsiveSheet
        open={open}
        onOpenChange={onOpenChange}
        title={existing ? "Edit phase" : "New phase"}
        description="Phases split a trip into chapters with their own purpose and budget."
        footer={
          <>
            {existing && (
              <Button variant="destructive-ghost" onClick={() => setConfirmDelete(true)} className="lg:mr-auto lg:flex-none">
                <Trash2 /> Delete
              </Button>
            )}
            <Button type="submit" form="phase-form" size="lg" className="lg:h-10">
              {existing ? "Save changes" : "Add phase"}
            </Button>
          </>
        }
      >
        <form id="phase-form" onSubmit={submit} className="grid grid-cols-1 gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" htmlFor="ph-name" error={errors.name}>
              <Input id="ph-name" placeholder="e.g. Kerala" value={values.name} aria-invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Location" htmlFor="ph-loc" error={errors.location}>
              <Input id="ph-loc" placeholder="Region or city" value={values.location} aria-invalid={!!errors.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Starts" htmlFor="ph-start" error={errors.startDate}>
              <Input id="ph-start" type="date" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="Ends" htmlFor="ph-end" error={errors.endDate} hint={outside ? "Outside your trip dates" : undefined}>
              <Input id="ph-end" type="date" value={values.endDate} aria-invalid={!!errors.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Purpose" error={errors.purposes}>
            <ChipToggleGroup
              value={values.purposes}
              onChange={(v) => set("purposes", v)}
              options={PHASE_PURPOSES.map((p) => ({ value: p, label: PURPOSE_LABEL[p] }))}
            />
          </Field>
          {values.purposes.includes("custom") && (
            <Field label="Custom purpose" htmlFor="ph-custom" error={errors.customPurpose}>
              <Input id="ph-custom" placeholder="e.g. Wedding, Volunteering" value={values.customPurpose} aria-invalid={!!errors.customPurpose} onChange={(e) => set("customPurpose", e.target.value)} />
            </Field>
          )}
          <Field label="Budget" htmlFor="ph-budget" optional error={errors.budget}>
            <MoneyInput id="ph-budget" symbol={currencySymbol(trip.currency)} placeholder="0" value={values.budget} onChange={(e) => set("budget", e.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="ph-notes" optional>
            <Textarea id="ph-notes" rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </form>
      </ResponsiveSheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${existing?.name}”?`}
        description="Expenses tagged with this phase stay in your budget and will be matched by date instead."
        onConfirm={() => {
          if (existing) deletePhase(existing.id);
          onOpenChange(false);
          toast("Phase deleted");
        }}
      />
    </>
  );
}
