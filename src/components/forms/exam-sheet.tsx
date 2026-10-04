"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useActiveTrip, useData } from "@/lib/store/hooks";
import { deleteExam, saveExam, updateWorkSchedule } from "@/lib/store/actions";
import { useZodForm } from "@/lib/use-form";
import { isWorkDay, workOverlapMinutes } from "@/lib/calc/work";
import { fmtDuration, toMinutes } from "@/lib/calc/dates";
import type { SheetRequest } from "./sheets-provider";

const schema = z
  .object({
    subject: z.string().trim().min(1, "Which exam?").max(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time"),
    venue: z.string().max(80).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => toMinutes(v.endTime) > toMinutes(v.startTime), { path: ["endTime"], message: "End must be after start" });

export function ExamSheet({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: Extract<SheetRequest, { type: "exam" }>;
}) {
  const data = useData();
  const trip = useActiveTrip();
  const existing = request.id ? data.exams.find((x) => x.id === request.id) : undefined;
  const form = useZodForm(schema, {
    subject: existing?.subject ?? "",
    date: existing?.date ?? request.date ?? trip?.startDate ?? "",
    startTime: existing?.startTime ?? "10:00",
    endTime: existing?.endTime ?? "13:00",
    venue: existing?.venue ?? "",
    notes: existing?.notes ?? "",
  });
  const { values, set, errors } = form;
  const [takeDayOff, setTakeDayOff] = React.useState(true);
  if (!trip) return null;

  const ws = trip.workSchedule;
  const overlap = ws.enabled && values.date && values.startTime && values.endTime ? workOverlapMinutes(values.date, values.startTime, values.date, values.endTime, ws) : 0;
  const workday = isWorkDay(values.date, ws);

  const submit = form.handleSubmit((v) => {
    saveExam({ id: existing?.id, tripId: trip.id, subject: v.subject, date: v.date, startTime: v.startTime, endTime: v.endTime, venue: v.venue || undefined, notes: v.notes || undefined });
    if (overlap > 0 && takeDayOff && !ws.daysOff.includes(v.date)) {
      updateWorkSchedule(trip.id, { daysOff: [...ws.daysOff, v.date].sort() });
    }
    toast.success(existing ? "Exam updated" : "Exam added");
    onOpenChange(false);
  });

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? "Edit exam" : "Add exam"}
      footer={
        <>
          {existing && (
            <Button
              variant="destructive-ghost"
              className="lg:mr-auto lg:flex-none"
              onClick={() => {
                deleteExam(existing.id);
                onOpenChange(false);
                toast("Exam deleted");
              }}
            >
              <Trash2 /> Delete
            </Button>
          )}
          <Button type="submit" form="exam-form" size="lg" className="lg:h-10">
            {existing ? "Save changes" : "Add exam"}
          </Button>
        </>
      }
    >
      <form id="exam-form" onSubmit={submit} className="grid grid-cols-1 gap-4" noValidate>
        <Field label="Subject" htmlFor="ex-subj" error={errors.subject}>
          <Input id="ex-subj" value={values.subject} aria-invalid={!!errors.subject} onChange={(e) => set("subject", e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date" htmlFor="ex-date" error={errors.date} className="col-span-3 sm:col-span-1">
            <Input id="ex-date" type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Start" htmlFor="ex-start" error={errors.startTime}>
            <Input id="ex-start" type="time" value={values.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </Field>
          <Field label="End" htmlFor="ex-end" error={errors.endTime}>
            <Input id="ex-end" type="time" value={values.endTime} aria-invalid={!!errors.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </Field>
        </div>
        {overlap > 0 && workday && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-3 text-[13px] text-warning-foreground">
            <label htmlFor="ex-off">
              <span className="font-medium">Overlaps {fmtDuration(overlap)} of work.</span>
              <span className="block">Mark this date as a day off from work</span>
            </label>
            <Switch id="ex-off" checked={takeDayOff} onCheckedChange={setTakeDayOff} />
          </div>
        )}
        <Field label="Venue" htmlFor="ex-venue" optional>
          <Input id="ex-venue" value={values.venue} onChange={(e) => set("venue", e.target.value)} />
        </Field>
        <Field label="Notes" htmlFor="ex-notes" optional>
          <Textarea id="ex-notes" rows={2} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </form>
    </ResponsiveSheet>
  );
}
