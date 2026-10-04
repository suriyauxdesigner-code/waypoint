"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import { ExtrasEditor, LegEditor, blankLeg, fromLeg, toLeg, validateLegs, type ExtraDraft, type LegDraft } from "@/components/forms/transport-sheet";
import { SectionLabel } from "@/components/forms/shared";
import { deleteOption, saveOption } from "@/lib/store/actions";
import { currencySymbol } from "@/lib/format";
import type { CurrencyCode, TransportDecision, TransportOption } from "@/lib/types";
import { uid, cn } from "@/lib/utils";

export function OptionSheet({
  decision,
  option,
  currency,
  onClose,
}: {
  decision: TransportDecision;
  option?: TransportOption;
  currency: CurrencyCode;
  onClose: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [label, setLabel] = React.useState(option?.label ?? "");
  const [comfort, setComfort] = React.useState(option?.comfort ?? 3);
  const [notes, setNotes] = React.useState(option?.notes ?? "");
  const [legs, setLegs] = React.useState<LegDraft[]>(option ? option.legs.map(fromLeg) : [blankLeg(decision.date, decision.from, decision.to)]);
  const [extras, setExtras] = React.useState<ExtraDraft[]>(option?.extras.map((e) => ({ id: e.id, label: e.label, amount: String(e.amount) })) ?? []);
  const [legErrors, setLegErrors] = React.useState<Record<string, string>[]>([]);
  const [labelError, setLabelError] = React.useState("");
  const symbol = currencySymbol(currency);

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(onClose, 200);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateLegs(legs);
    setLegErrors(v.errs);
    setLabelError(label.trim() ? "" : "Name this option, e.g. “Bus + Flight”");
    if (!v.ok || !label.trim()) return;
    saveOption(decision.id, {
      id: option?.id ?? uid("opt"),
      label: label.trim(),
      comfort,
      notes: notes.trim() || undefined,
      legs: legs.map(toLeg),
      extras: extras.filter((x) => x.label.trim() && Number(x.amount) > 0).map((x) => ({ id: x.id, label: x.label.trim(), amount: Math.round(Number(x.amount)) })),
    });
    toast.success(option ? "Option updated" : "Option added");
    close(false);
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      wide
      title={option ? `Edit “${option.label}”` : "Add an option"}
      description="Include every leg and the hidden costs — station transfers, food, baggage."
      footer={
        <>
          {option && (
            <Button
              variant="destructive-ghost"
              className="lg:mr-auto lg:flex-none"
              onClick={() => {
                deleteOption(decision.id, option.id);
                toast("Option removed");
                close(false);
              }}
            >
              <Trash2 /> Remove
            </Button>
          )}
          <Button type="submit" form="opt-form" size="lg" className="lg:h-10">
            {option ? "Save option" : "Add option"}
          </Button>
        </>
      }
    >
      <form id="opt-form" onSubmit={submit} className="grid grid-cols-1 gap-5" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Option name" htmlFor="opt-label" error={labelError}>
            <Input id="opt-label" autoFocus={!option} placeholder="e.g. Bus + Flight" value={label} aria-invalid={!!labelError} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Comfort" hint="How rested you’ll be on arrival">
            <div className="flex gap-1" role="radiogroup" aria-label="Comfort">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={comfort === n}
                  onClick={() => setComfort(n)}
                  className={cn(
                    "h-11 flex-1 rounded-md border text-[13px] font-medium tabular lg:h-10",
                    comfort === n ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <SectionLabel>Legs</SectionLabel>
        <LegEditor legs={legs} setLegs={setLegs} errors={legErrors} symbol={symbol} />
        <SectionLabel>Extra costs</SectionLabel>
        <ExtrasEditor extras={extras} setExtras={setExtras} symbol={symbol} />
        <Field label="Notes" htmlFor="opt-notes" optional>
          <Textarea id="opt-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </form>
    </ResponsiveSheet>
  );
}
