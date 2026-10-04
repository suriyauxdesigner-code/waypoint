"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useActiveTrip, useToday } from "@/lib/store/hooks";
import { saveDecision } from "@/lib/store/actions";

export function NewDecisionSheet({ onClose }: { onClose: () => void }) {
  const trip = useActiveTrip()!;
  const { today } = useToday();
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [date, setDate] = React.useState(today >= trip.startDate && today <= trip.endDate ? today : trip.startDate);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(onClose, 200);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!from.trim()) errs.from = "Where from?";
    if (!to.trim()) errs.to = "Where to?";
    if (!date) errs.date = "Pick a date";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const id = saveDecision({
      tripId: trip.id,
      title: `${from.trim()} → ${to.trim()}`,
      from: from.trim(),
      to: to.trim(),
      date,
      priority: "balanced",
      options: [],
    });
    close(false);
    router.push(`/trip/transport?id=${id}`);
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      title="Compare ways to travel"
      description="Add a route, then compare bus, train, flight or combinations side by side."
      footer={
        <Button type="submit" form="dec-form" size="lg" className="lg:h-10">
          Start comparing
        </Button>
      }
    >
      <form id="dec-form" onSubmit={submit} className="grid grid-cols-2 gap-3" noValidate>
        <Field label="From" htmlFor="dec-from" error={errors.from}>
          <Input id="dec-from" autoFocus value={from} aria-invalid={!!errors.from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Varkala" />
        </Field>
        <Field label="To" htmlFor="dec-to" error={errors.to}>
          <Input id="dec-to" value={to} aria-invalid={!!errors.to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. Jaipur" />
        </Field>
        <Field label="Travel date" htmlFor="dec-date" error={errors.date} className="col-span-2">
          <Input id="dec-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </form>
    </ResponsiveSheet>
  );
}
