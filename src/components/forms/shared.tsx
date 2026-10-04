"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
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
        "rounded-lg border px-3.5 py-3 text-[13px]",
        acknowledged ? "border-border bg-muted text-muted-foreground" : "border-warning/40 bg-warning-soft text-warning-foreground",
        className,
      )}
    >
      <p className="flex items-start gap-2 font-medium">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <span>
          This overlaps {fmtDuration(minutes)} of your work schedule.
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

export const BOOKING_STATUSES: BookingStatus[] = ["confirmed", "pending", "need_to_book", "cancelled"];

export interface BookingFieldValues {
  status: BookingStatus;
  platform: string;
  reference: string;
  deadline: string;
  paid: string;
}

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
  const paid = Number(values.paid) || 0;
  const balance = Math.max(0, total - paid);
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-2">
        <span className="text-[13px] font-medium">Booking status</span>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {BOOKING_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={values.status === s}
              onClick={() => set("status", s)}
              className={cn(
                "h-9 rounded-md border px-2 text-[13px] font-medium transition-colors",
                values.status === s ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Platform" htmlFor={`${idPrefix}-platform`} optional>
          <Input id={`${idPrefix}-platform`} placeholder="e.g. IRCTC, Booking.com" value={values.platform} onChange={(e) => set("platform", e.target.value)} />
        </Field>
        <Field label="Reference" htmlFor={`${idPrefix}-ref`} optional>
          <Input id={`${idPrefix}-ref`} placeholder="PNR / booking ID" value={values.reference} onChange={(e) => set("reference", e.target.value)} />
        </Field>
        <Field label={deadlineLabel} htmlFor={`${idPrefix}-deadline`} optional>
          <Input id={`${idPrefix}-deadline`} type="date" value={values.deadline} onChange={(e) => set("deadline", e.target.value)} />
        </Field>
        <Field
          label="Amount paid"
          htmlFor={`${idPrefix}-paid`}
          error={errors.paid}
          hint={total > 0 ? (balance > 0 ? `Balance ${symbol}${balance.toLocaleString("en-IN")}` : "Fully paid") : undefined}
        >
          <MoneyInput id={`${idPrefix}-paid`} symbol={symbol} placeholder="0" value={values.paid} aria-invalid={!!errors.paid} onChange={(e) => set("paid", e.target.value)} />
        </Field>
      </div>
      <p className="-mt-1 text-[12px] text-subtle-foreground">Payments are recorded as expenses so your budget stays accurate.</p>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="eyebrow -mb-1 mt-1">{children}</h3>;
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
