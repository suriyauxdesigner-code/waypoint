"use client";

import * as React from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, MoneyInput, Select } from "@/components/ui/input";
import { fmtDuration } from "@/lib/calc/dates";
import type { BookingStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/calc/bookings";
import { cn } from "@/lib/utils";

/** Non-blocking work-hours warning with the two choices the brief asks for. */
export function WorkConflictNotice({
  minutes,
  acknowledged,
  onChangeTime,
  onKeep,
  className,
}: {
  minutes: number;
  acknowledged: boolean;
  onChangeTime: () => void;
  onKeep: () => void;
  className?: string;
}) {
  if (minutes <= 0) return null;
  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl px-4 py-3 text-[14px]",
        acknowledged ? "bg-muted text-muted-foreground" : "bg-warning-soft text-warning-foreground",
        className,
      )}
    >
      <p className="flex items-start gap-2 font-medium">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <span>
          This overlaps {fmtDuration(minutes)} of your work hours.
          {acknowledged && <span className="font-normal"> Kept anyway.</span>}
        </span>
      </p>
      {!acknowledged && (
        <div className="mt-2.5 flex gap-2 pl-6">
          <Button size="sm" variant="outline" onClick={onChangeTime}>
            Change time
          </Button>
          <Button size="sm" variant="ghost" onClick={onKeep}>
            Keep anyway
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Progressive disclosure for forms: essentials stay visible, the rest lives here.
 * `summary` hints at what's inside so nothing feels hidden.
 */
export function MoreDetails({
  open,
  onToggle,
  summary,
  label = "More details",
  children,
}: {
  open: boolean;
  onToggle: () => void;
  summary?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t pt-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[15px] font-medium">{label}</span>
          {!open && summary && <span className="block truncate text-[13px] text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="grid grid-cols-1 gap-4 pb-1 pt-3">{children}</div>}
    </div>
  );
}

/** Chip row for a small single choice (mode, type, status). Scrolls horizontally on phones. */
export function ChoiceChips<T extends string>({
  value,
  onChange,
  options,
  label,
  wrap,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }[];
  label: string;
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex gap-2",
        wrap ? "flex-wrap" : "no-scrollbar -mx-5 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0",
        className,
      )}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring lg:h-9 lg:text-[13px]",
              on ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
            )}
          >
            {o.icon && <o.icon className="size-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const BOOKING_STATUSES: BookingStatus[] = ["confirmed", "pending", "need_to_book", "cancelled"];

/** Plain-language status labels for pickers. */
export const STATUS_CHOICE_LABEL: Record<BookingStatus, string> = {
  need_to_book: "Need to book",
  pending: "Pending",
  confirmed: "Booked",
  cancelled: "Cancelled",
};

export interface BookingFieldValues {
  status: BookingStatus;
  platform: string;
  reference: string;
  deadline: string;
  paid: string;
}

/** Booked? — the one booking question that belongs up front. */
export function BookingStatusField({ value, onChange }: { value: BookingStatus; onChange: (s: BookingStatus) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <span className="text-[14px] font-medium lg:text-[13px]">Booking</span>
      <ChoiceChips
        label="Booking status"
        wrap
        value={value}
        onChange={onChange}
        options={(["need_to_book", "confirmed", "pending", "cancelled"] as const).map((s) => ({ value: s, label: STATUS_CHOICE_LABEL[s] }))}
      />
    </div>
  );
}

/**
 * Planned vs actual, side by side. Planned is the item's price/cost; actual is what was paid
 * (recorded as linked expenses so the budget stays accurate).
 */
export function PlannedActualFields({
  planned,
  paid,
  onPaid,
  symbol,
  idPrefix,
  plannedSlot,
  error,
}: {
  planned: number;
  paid: string;
  onPaid: (v: string) => void;
  symbol: string;
  idPrefix: string;
  /** The planned input itself (owned by the form); omit to show the computed planned total. */
  plannedSlot?: React.ReactNode;
  error?: string;
}) {
  const p = Number(paid) || 0;
  const diff = p - planned;
  const hint =
    p <= 0
      ? "Leave empty until you pay"
      : planned <= 0
        ? undefined
        : diff === 0
          ? "Exactly as planned"
          : diff < 0
            ? `${symbol}${Math.abs(diff).toLocaleString("en-IN")} under plan${p < planned ? " · rest counted as still to pay" : ""}`
            : `${symbol}${diff.toLocaleString("en-IN")} over plan`;
  return (
    <div className="grid grid-cols-2 items-start gap-3">
      {plannedSlot ?? (
        <div className="grid content-start gap-2">
          <span className="text-[14px] font-medium lg:text-[13px]">Planned</span>
          <span className="flex h-12 items-center rounded-xl bg-muted px-3.5 text-[16px] font-semibold tabular lg:h-10 lg:rounded-lg lg:text-sm">
            {symbol}
            {planned.toLocaleString("en-IN")}
          </span>
        </div>
      )}
      <Field label="Actually paid" htmlFor={`${idPrefix}-paid`} error={error} hint={hint}>
        <MoneyInput id={`${idPrefix}-paid`} symbol={symbol} placeholder="0" value={paid} aria-invalid={!!error} onChange={(e) => onPaid(e.target.value)} />
      </Field>
    </div>
  );
}

/** Secondary booking details: where it was booked, reference, deadline. */
export function BookingRefFields({
  values,
  set,
  idPrefix,
  deadlineLabel = "Deadline",
}: {
  values: BookingFieldValues;
  set: <K extends keyof BookingFieldValues>(k: K, v: BookingFieldValues[K]) => void;
  idPrefix: string;
  deadlineLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Booked on" htmlFor={`${idPrefix}-platform`} optional>
        <Input id={`${idPrefix}-platform`} placeholder="e.g. IRCTC" value={values.platform} onChange={(e) => set("platform", e.target.value)} />
      </Field>
      <Field label="Reference" htmlFor={`${idPrefix}-ref`} optional>
        <Input id={`${idPrefix}-ref`} placeholder="PNR / ID" value={values.reference} onChange={(e) => set("reference", e.target.value)} />
      </Field>
      <Field label={deadlineLabel} htmlFor={`${idPrefix}-deadline`} optional className="col-span-2">
        <Input id={`${idPrefix}-deadline`} type="date" value={values.deadline} onChange={(e) => set("deadline", e.target.value)} />
      </Field>
    </div>
  );
}

/** All booking fields at once (used where booking is itself the optional section). */
export function BookingFields({
  values,
  set,
  total,
  symbol,
  idPrefix,
  deadlineLabel = "Deadline",
  errors = {},
}: {
  values: BookingFieldValues;
  set: <K extends keyof BookingFieldValues>(k: K, v: BookingFieldValues[K]) => void;
  total: number;
  symbol: string;
  idPrefix: string;
  deadlineLabel?: string;
  errors?: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <BookingStatusField value={values.status} onChange={(s) => set("status", s)} />
      <PlannedActualFields planned={total} paid={values.paid} onPaid={(v) => set("paid", v)} symbol={symbol} idPrefix={idPrefix} error={errors.paid} />
      <BookingRefFields values={values} set={set} idPrefix={idPrefix} deadlineLabel={deadlineLabel} />
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="-mb-1 mt-1 text-[14px] font-semibold">{children}</h3>;
}

export function StatusSelect({ value, onChange, id }: { value: BookingStatus; onChange: (s: BookingStatus) => void; id?: string }) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value as BookingStatus)}>
      {BOOKING_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </Select>
  );
}

/** Two-up row that stacks on very small phones. */
export function FieldRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3", className)}>{children}</div>;
}
