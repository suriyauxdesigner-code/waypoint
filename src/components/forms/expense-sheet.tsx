"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronDown, Link2, Paperclip, Trash2, X } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, Select, Textarea } from "@/components/ui/input";
import { CategoryIcon } from "@/components/common/icons";
import { useActiveTrip, useData, useToday } from "@/lib/store/hooks";
import { deleteExpense, restoreExpense, saveExpense } from "@/lib/store/actions";
import { useZodForm } from "@/lib/use-form";
import { categoriesForTrip } from "@/lib/calc/budget";
import { phaseOn, phasesForTrip } from "@/lib/calc/trip";
import { currencySymbol, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";
import type { SheetRequest } from "./sheets-provider";
import { localNowHHmm } from "@/lib/calc/dates";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "debit_card", label: "Debit card" },
  { value: "credit_card", label: "Credit card" },
  { value: "other", label: "Other" },
];

const schema = z.object({
  amount: z.coerce
    .number({ message: "Enter an amount" })
    .refine((n) => Number.isFinite(n) && n > 0, "Enter an amount above 0")
    .refine((n) => n <= 10_000_000, "That looks too large"),
  categoryId: z.string().min(1, "Pick a category"),
  merchant: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  paymentMethod: z.enum(["cash", "upi", "debit_card", "credit_card", "other"]),
  phaseId: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
  receiptName: z.string().optional(),
});

export function ExpenseSheet({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: Extract<SheetRequest, { type: "expense" }>;
}) {
  const data = useData();
  const trip = useActiveTrip();
  const { today } = useToday();
  const existing = request.id ? data.expenses.find((e) => e.id === request.id) : undefined;
  const categories = trip ? categoriesForTrip(data, trip.id) : [];
  const phases = trip ? phasesForTrip(data, trip.id) : [];
  const defaultDate = existing?.date ?? request.date ?? today;
  const [more, setMore] = React.useState(!!existing);
  const amountRef = React.useRef<HTMLInputElement>(null);

  const form = useZodForm(schema, {
    amount: existing ? String(existing.amount) : "",
    categoryId: existing?.categoryId ?? request.categoryId ?? "",
    merchant: existing?.merchant ?? "",
    location: existing?.location ?? "",
    date: defaultDate,
    paymentMethod: (existing?.paymentMethod ?? "upi") as PaymentMethod,
    phaseId: existing?.phaseId ?? "",
    notes: existing?.notes ?? "",
    receiptName: existing?.receiptName ?? "",
  });
  const { values, set, errors } = form;

  React.useEffect(() => {
    if (!open || existing) return;
    const t = setTimeout(() => amountRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open, existing]);

  if (!trip) return null;
  const autoPhase = phaseOn(phases, values.date);
  const linkedLabel = existing?.linked ? linkedName(data, existing.linked) : null;

  const submit = form.handleSubmit((v) => {
    const id = saveExpense({
      id: existing?.id,
      createdAt: existing?.createdAt,
      tripId: trip.id,
      amount: Math.round(v.amount),
      categoryId: v.categoryId,
      merchant: v.merchant || undefined,
      location: v.location || undefined,
      date: v.date,
      time: existing?.time ?? (v.date === today ? localNowHHmm() : undefined),
      paymentMethod: v.paymentMethod,
      phaseId: v.phaseId || autoPhase?.id,
      notes: v.notes || undefined,
      receiptName: v.receiptName || undefined,
      linked: existing?.linked,
    });
    const cat = categories.find((c) => c.id === v.categoryId);
    toast.success(existing ? "Expense updated" : `${money(v.amount, trip.currency)} added to ${cat?.name ?? "expenses"}`);
    void id;
    onOpenChange(false);
  });

  const remove = () => {
    if (!existing) return;
    const snapshot = { ...existing };
    deleteExpense(existing.id);
    onOpenChange(false);
    toast("Expense deleted", { action: { label: "Undo", onClick: () => restoreExpense(snapshot) } });
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? "Edit expense" : "Add expense"}
      footer={
        <>
          {existing && (
            <Button variant="destructive-ghost" onClick={remove} className="lg:mr-auto lg:flex-none">
              <Trash2 /> Delete
            </Button>
          )}
          <Button type="submit" form="expense-form" size="lg" className="lg:h-10">
            {existing ? "Save changes" : "Add expense"}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="grid grid-cols-1 gap-5" noValidate>
        {/* Amount — the hero field */}
        <div>
          <label htmlFor="exp-amount" className="sr-only">
            Amount
          </label>
          <div className="flex items-baseline gap-1 border-b pb-2">
            <span className="text-3xl font-medium text-muted-foreground">{currencySymbol(trip.currency)}</span>
            <input
              id="exp-amount"
              ref={amountRef}
              inputMode="decimal"
              type="number"
              min={0}
              placeholder="0"
              value={values.amount}
              aria-invalid={!!errors.amount}
              onChange={(e) => set("amount", e.target.value)}
              className="w-full bg-transparent text-[40px] font-semibold tracking-tight tabular outline-none placeholder:text-border-strong"
            />
          </div>
          {errors.amount && <p role="alert" className="mt-1.5 text-[12px] text-danger">{errors.amount}</p>}
        </div>

        <div className="grid grid-cols-1 gap-2">
          <span className="text-[13px] font-medium">Category</span>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Category">
            {categories.map((c) => {
              const on = values.categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set("categoryId", c.id)}
                  className={cn(
                    "flex h-[60px] flex-col items-start justify-between rounded-lg border px-2.5 py-2 text-left text-[12px] leading-tight transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                    on ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
                  )}
                >
                  <CategoryIcon icon={c.icon} className={cn("size-4", on ? "opacity-90" : "text-muted-foreground")} />
                  <span className="line-clamp-1 font-medium">{c.name}</span>
                </button>
              );
            })}
          </div>
          {errors.categoryId && <p role="alert" className="text-[12px] text-danger">{errors.categoryId}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Merchant" htmlFor="exp-merchant" optional className="col-span-2 sm:col-span-1">
            <Input id="exp-merchant" placeholder="e.g. Breakfast, KSRTC" value={values.merchant} onChange={(e) => set("merchant", e.target.value)} />
          </Field>
          <Field label="Date" htmlFor="exp-date" error={errors.date} className="col-span-2 sm:col-span-1">
            <Input id="exp-date" type="date" value={values.date} aria-invalid={!!errors.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <span className="text-[13px] font-medium">Paid with</span>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={values.paymentMethod === m.value}
                onClick={() => set("paymentMethod", m.value)}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                  values.paymentMethod === m.value ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {linkedLabel && (
          <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
            <Link2 className="size-4 shrink-0" /> Payment for <span className="font-medium text-foreground">{linkedLabel}</span>
          </p>
        )}

        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={more}
        >
          <ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} /> More details
        </button>

        {more && (
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Location" htmlFor="exp-loc" optional>
                <Input id="exp-loc" placeholder="City or place" value={values.location} onChange={(e) => set("location", e.target.value)} />
              </Field>
              <Field label="Trip phase" htmlFor="exp-phase" hint={!values.phaseId && autoPhase ? `Auto: ${autoPhase.name}` : undefined}>
                <Select id="exp-phase" value={values.phaseId} onChange={(e) => set("phaseId", e.target.value)}>
                  <option value="">Auto (by date)</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Notes" htmlFor="exp-notes" optional>
              <Textarea id="exp-notes" rows={2} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-1.5">
              <span className="text-[13px] font-medium">Receipt</span>
              {values.receiptName ? (
                <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{values.receiptName}</span>
                  </span>
                  <Button variant="ghost" size="icon-sm" aria-label="Remove receipt" onClick={() => set("receiptName", "")}>
                    <X />
                  </Button>
                </div>
              ) : (
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-[13px] text-muted-foreground transition-colors hover:bg-muted">
                  <Paperclip className="size-4" /> Attach receipt
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) set("receiptName", f.name);
                    }}
                  />
                </label>
              )}
              <p className="text-[12px] text-subtle-foreground">Stored as a file name for now — receipt sync arrives with cloud backup.</p>
            </div>
          </div>
        )}
      </form>
    </ResponsiveSheet>
  );
}

function linkedName(data: ReturnType<typeof useData>, link: NonNullable<import("@/lib/types").Expense["linked"]>) {
  switch (link.kind) {
    case "accommodation":
      return data.accommodations.find((a) => a.id === link.id)?.property;
    case "transport": {
      const t = data.transports.find((x) => x.id === link.id);
      return t ? `${t.from} → ${t.to}` : undefined;
    }
    case "event":
      return data.events.find((e) => e.id === link.id)?.title;
    case "booking":
      return data.bookings.find((b) => b.id === link.id)?.title;
    case "checklist":
      return data.checklistItems.find((i) => i.id === link.id)?.name;
  }
}
