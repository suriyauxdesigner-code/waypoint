"use client";

import * as React from "react";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { WEEKDAY_LABELS } from "@/lib/calc/work";
import type { WorkSchedule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toMinutes } from "@/lib/calc/dates";

/** Controlled editor for a work schedule — used in onboarding, settings and the work sheet. */
export function WorkScheduleEditor({
  value,
  onChange,
  showEnable = true,
}: {
  value: WorkSchedule;
  onChange: (next: WorkSchedule) => void;
  showEnable?: boolean;
}) {
  const set = <K extends keyof WorkSchedule>(k: K, v: WorkSchedule[K]) => onChange({ ...value, [k]: v });
  const invalid = toMinutes(value.end) <= toMinutes(value.start);
  return (
    <div className="grid grid-cols-1 gap-5">
      {showEnable && (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="ws-enabled" className="text-[15px] font-medium">
            I’m working during this trip
            <span className="block text-[13px] font-normal text-muted-foreground">Blocks work hours on your plan</span>
          </label>
          <Switch id="ws-enabled" checked={value.enabled} onCheckedChange={(c) => set("enabled", c)} />
        </div>
      )}
      {value.enabled && (
        <>
          <div className="grid grid-cols-1 gap-2">
            <span className="text-[14px] font-medium">Work days</span>
            <div className="grid grid-cols-7 gap-1.5 sm:flex">
              {WEEKDAY_LABELS.map((d) => {
                const on = value.days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    aria-pressed={on}
                    aria-label={d.long}
                    onClick={() => set("days", on ? value.days.filter((x) => x !== d.value) : [...value.days, d.value])}
                    className={cn(
                      "grid aspect-square place-content-center rounded-full border text-[13px] font-medium transition-colors sm:size-10",
                      on ? "border-accent bg-accent text-white" : "bg-surface text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {d.long.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" htmlFor="ws-start">
              <Input id="ws-start" type="time" value={value.start} onChange={(e) => set("start", e.target.value)} />
            </Field>
            <Field label="Ends" htmlFor="ws-end" error={invalid ? "End must be after start" : undefined}>
              <Input id="ws-end" type="time" value={value.end} aria-invalid={invalid} onChange={(e) => set("end", e.target.value)} />
            </Field>
          </div>
          <div className="divide-y rounded-2xl border">
            {(
              [
                ["protectWorkHours", "Protect work hours", "Warn when plans overlap work"],
                ["preferTransportOutsideWork", "Prefer transport outside work hours", "Factor work disruption into transport comparisons"],
                ["showWifiInfo", "Show Wi-Fi information", "On work blocks and stays"],
                ["showWorkspaceStays", "Highlight workspace-friendly stays", "Desk and Wi-Fi up front in Bookings"],
              ] as const
            ).map(([key, label, hint]) => (
              <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
                <label htmlFor={`ws-${key}`} className="text-[15px] font-medium">
                  {label}
                  <span className="block text-[13px] font-normal text-muted-foreground">{hint}</span>
                </label>
                <Switch id={`ws-${key}`} checked={value[key]} onCheckedChange={(c) => set(key, c)} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
