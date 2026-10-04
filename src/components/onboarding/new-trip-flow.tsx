"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, MapPin, Plus, X } from "lucide-react";
import { useData, useStatus } from "@/lib/store/hooks";
import { createTrip } from "@/lib/store/actions";
import { DEFAULT_WORK_SCHEDULE, describeSchedule } from "@/lib/calc/work";
import { addDays, diffDays, fmtRange, localTodayISO } from "@/lib/calc/dates";
import { KNOWN_PLACES } from "@/lib/geo";
import { CURRENCIES, currencySymbol, money } from "@/lib/format";
import { PURPOSE_LABEL, TRIP_PURPOSES } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, MoneyInput, Select } from "@/components/ui/input";
import { WorkScheduleEditor } from "@/components/forms/work-schedule-editor";
import { Wordmark } from "@/components/shell/logo";
import type { CurrencyCode, TripPurpose, WorkSchedule } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["Where", "When", "Why", "Budget", "Work", "Create"] as const;

const PURPOSE_HINT: Partial<Record<TripPurpose, string>> = {
  backpacking: "Hostels, buses, a new place every few days",
  vacation: "Time off, slower pace",
  workation: "Working remotely while you travel",
  study: "Courses, exams, campus time",
  business: "Meetings and work travel",
  mixed: "A bit of everything — split it into phases later",
};

export function NewTripFlow() {
  const router = useRouter();
  const data = useData();
  const { status } = useStatus();
  const [step, setStep] = React.useState(0);
  const [destinations, setDestinations] = React.useState<string[]>([]);
  const [destInput, setDestInput] = React.useState("");
  const today = localTodayISO();
  const [start, setStart] = React.useState(addDays(today, 14));
  const [end, setEnd] = React.useState(addDays(today, 28));
  const [purpose, setPurpose] = React.useState<TripPurpose>("backpacking");
  const [currency, setCurrency] = React.useState<CurrencyCode>(data.user.homeCurrency ?? "INR");
  const [budget, setBudget] = React.useState("");
  const [work, setWork] = React.useState<WorkSchedule>({ ...DEFAULT_WORK_SCHEDULE });
  const [workAnswered, setWorkAnswered] = React.useState<boolean | null>(null);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");

  const suggestedName = destinations.length
    ? destinations.length > 1
      ? `${destinations[0]} → ${destinations[destinations.length - 1]}`
      : destinations[0]
    : "My trip";

  const addDest = () => {
    const v = destInput.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (destinations.some((d) => d.toLowerCase() === v.toLowerCase())) {
      setError(`${v} is already on the list`);
      return;
    }
    setDestinations((d) => [...d, v.replace(/^\w/, (c) => c.toUpperCase())]);
    setDestInput("");
    setError("");
  };

  const validate = (): boolean => {
    setError("");
    if (step === 1) {
      if (!start || !end) return setErr("Pick both dates");
      if (end < start) return setErr("The trip can’t end before it starts");
      if (diffDays(start, end) > 366) return setErr("Trips up to a year are supported");
    }
    if (step === 3 && budget && (Number.isNaN(Number(budget)) || Number(budget) < 0)) return setErr("Enter a valid amount");
    if (step === 4 && workAnswered && work.enabled && !work.days.length) return setErr("Pick at least one work day");
    return true;
  };
  const setErr = (m: string) => {
    setError(m);
    return false;
  };

  const next = () => {
    if (step === 0 && destInput.trim()) addDest();
    if (!validate()) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const skip = () => {
    setError("");
    if (step === 3) setBudget("");
    if (step === 4) {
      setWorkAnswered(false);
      setWork({ ...work, enabled: false });
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const create = () => {
    if (!start || !end || end < start) {
      setStep(1);
      return setErr("Check your dates");
    }
    const id = createTrip({
      name: (name || suggestedName).trim(),
      destinations,
      startDate: start,
      endDate: end,
      purpose,
      currency,
      totalBudget: Math.round(Number(budget) || 0),
      work: { ...work, enabled: !!workAnswered && work.enabled },
    });
    toast.success("Trip created");
    void id;
    router.push("/");
  };

  const optional = step === 0 || step === 2 || step === 3 || step === 4;
  const sym = currencySymbol(currency);
  const days = start && end && end >= start ? diffDays(start, end) + 1 : 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-safe">
      <header className="flex h-16 items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft />
          </Button>
        ) : (
          <Wordmark />
        )}
        {status === "ready" && data.trips.length > 0 && (
          <Button variant="ghost" size="icon" aria-label="Close" asChild>
            <Link href="/">
              <X />
            </Link>
          </Button>
        )}
      </header>

      <div className="flex gap-1" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-foreground" : "bg-border")} />
        ))}
      </div>
      <p className="eyebrow mt-6">
        Step {step + 1} of {STEPS.length}
        {optional && " · optional"}
      </p>

      <main className="flex-1 pb-36 pt-2">
        {step === 0 && (
          <section>
            <h1 className="text-[26px] font-semibold tracking-tight">Where are you going?</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">Add stops in order. You can change the route any time.</p>
            <form
              className="mt-6 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addDest();
              }}
            >
              <Input aria-label="Destination" list="known-places" autoFocus placeholder="e.g. Kochi" value={destInput} onChange={(e) => setDestInput(e.target.value)} />
              <datalist id="known-places">
                {Object.keys(KNOWN_PLACES).map((k) => (
                  <option key={k} value={k.replace(/\b\w/g, (c) => c.toUpperCase())} />
                ))}
              </datalist>
              <Button type="submit" variant="outline" aria-label="Add destination">
                <Plus /> Add
              </Button>
            </form>
            {destinations.length > 0 && (
              <ol className="mt-5 grid gap-1">
                {destinations.map((d, i) => (
                  <li key={d} className="flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5">
                    <span className="grid size-6 place-content-center rounded-full bg-muted text-[12px] font-medium tabular">{i + 1}</span>
                    <MapPin className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-[15px]">{d}</span>
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${d}`} onClick={() => setDestinations((ds) => ds.filter((x) => x !== d))}>
                      <X />
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 className="text-[26px] font-semibold tracking-tight">When?</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">Rough dates are fine.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Field label="Start date" htmlFor="n-start">
                <Input id="n-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="End date" htmlFor="n-end">
                <Input id="n-end" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            </div>
            {days > 0 && <p className="mt-3 text-[14px] text-muted-foreground tabular">{days} days · {fmtRange(start, end)}</p>}
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="text-[26px] font-semibold tracking-tight">What’s this trip for?</h1>
            <div className="mt-6 grid gap-2" role="radiogroup" aria-label="Trip purpose">
              {TRIP_PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={purpose === p}
                  onClick={() => setPurpose(p)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors",
                    purpose === p ? "border-foreground bg-surface ring-1 ring-foreground" : "bg-surface hover:bg-muted",
                  )}
                >
                  <span>
                    <span className="block text-[15px] font-medium">{PURPOSE_LABEL[p]}</span>
                    <span className="block text-[13px] text-muted-foreground">{PURPOSE_HINT[p]}</span>
                  </span>
                  <span className={cn("size-4 shrink-0 rounded-full border-2", purpose === p ? "border-foreground bg-foreground" : "border-border-strong")} />
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="text-[26px] font-semibold tracking-tight">What’s your budget?</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">We’ll split it into categories you can adjust.</p>
            <div className="mt-6 grid gap-4">
              <Field label="Currency" htmlFor="n-cur">
                <Select id="n-cur" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Total budget" htmlFor="n-budget">
                <MoneyInput id="n-budget" symbol={sym} autoFocus placeholder="30000" value={budget} onChange={(e) => setBudget(e.target.value)} className="h-14 text-[22px] font-semibold lg:h-14 lg:text-[22px]" />
              </Field>
              {Number(budget) > 0 && days > 0 && (
                <p className="text-[14px] text-muted-foreground tabular">
                  ≈ {money(Number(budget) / days, currency)} per day over {days} days
                </p>
              )}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="text-[26px] font-semibold tracking-tight">Will you be working during this trip?</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">We’ll protect your work hours when you plan activities and transport.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={workAnswered === v}
                  onClick={() => {
                    setWorkAnswered(v);
                    setWork((w) => ({ ...w, enabled: v }));
                  }}
                  className={cn(
                    "flex h-20 flex-col items-center justify-center gap-1 rounded-lg border text-[15px] font-medium transition-colors",
                    workAnswered === v ? "border-foreground bg-surface ring-1 ring-foreground" : "bg-surface hover:bg-muted",
                  )}
                >
                  {v ? <Briefcase className="size-5" /> : <span className="text-xl">🌴</span>}
                  {v ? "Yes" : "No, fully off"}
                </button>
              ))}
            </div>
            {workAnswered && (
              <div className="mt-6">
                <WorkScheduleEditor value={work} onChange={setWork} showEnable={false} />
              </div>
            )}
          </section>
        )}

        {step === 5 && (
          <section>
            <h1 className="text-[26px] font-semibold tracking-tight">Ready to go</h1>
            <div className="mt-6 grid gap-4">
              <Field label="Trip name" htmlFor="n-name">
                <Input id="n-name" value={name} placeholder={suggestedName} onChange={(e) => setName(e.target.value)} />
              </Field>
              <dl className="divide-y rounded-lg border bg-surface text-[14px]">
                <Row label="Route" value={destinations.length ? destinations.join(" → ") : "Add later"} onEdit={() => setStep(0)} />
                <Row label="Dates" value={days ? `${fmtRange(start, end)} · ${days} days` : "—"} onEdit={() => setStep(1)} />
                <Row label="Purpose" value={PURPOSE_LABEL[purpose]} onEdit={() => setStep(2)} />
                <Row label="Budget" value={Number(budget) > 0 ? money(Number(budget), currency) : "Set later"} onEdit={() => setStep(3)} />
                <Row label="Work" value={workAnswered && work.enabled ? describeSchedule(work) : "Not working"} onEdit={() => setStep(4)} />
              </dl>
              <p className="text-[13px] text-muted-foreground">We’ll add budget categories and a starter packing list. Everything is editable.</p>
            </div>
          </section>
        )}
        {error && (
          <p role="alert" className="mt-4 text-[13px] text-danger">
            {error}
          </p>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-2 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          {optional && step < 5 && (
            <Button variant="ghost" size="lg" onClick={skip}>
              Skip
            </Button>
          )}
          {step < 5 ? (
            <Button size="lg" className="flex-1" onClick={next} disabled={step === 4 && workAnswered === null}>
              Continue
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={create}>
              Create trip
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate">{value}</dd>
      <button type="button" onClick={onEdit} className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
        Edit
      </button>
    </div>
  );
}
