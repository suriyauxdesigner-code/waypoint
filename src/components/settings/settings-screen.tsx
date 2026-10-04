"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Download, GraduationCap, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { useActiveTrip, useClock, useData } from "@/lib/store/hooks";
import { deleteTrip, setSimulatedDate, setSimulatedTime, setTheme, setUserName, updateTrip } from "@/lib/store/actions";
import { commit, exportJSON, resetToDemo, startFresh } from "@/lib/store/store";
import { migrate } from "@/lib/data/migrate";
import { DEMO_TODAY } from "@/lib/data/demo";
import { CURRENCIES } from "@/lib/format";
import { TRIP_PURPOSES, PURPOSE_LABEL } from "@/lib/labels";
import { fmtDayMonth, fmtLong, fmtWeekdayDate, toMinutes } from "@/lib/calc/dates";
import { PageHeader } from "@/components/shell/page-header";
import { WorkScheduleEditor } from "@/components/forms/work-schedule-editor";
import { useSheets } from "@/components/forms/sheets-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, MoneyInput, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm";
import type { CurrencyCode, TripPurpose, WorkSchedule } from "@/lib/types";

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 grid gap-4 border-t py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0 max-w-xl">{children}</div>
    </section>
  );
}

export function SettingsScreen() {
  const trip = useActiveTrip()!;
  // Remount the form when the trip (or its saved values) change.
  return <SettingsForm key={`${trip.id}:${trip.updatedAt}`} />;
}

function SettingsForm() {
  const data = useData();
  const trip = useActiveTrip()!;
  const router = useRouter();
  const sheets = useSheets();
  const clock = useClock();
  const [confirm, setConfirm] = React.useState<null | "delete" | "demo" | "fresh">(null);

  // Trip form
  const [name, setName] = React.useState(trip.name);
  const [emoji, setEmoji] = React.useState(trip.coverEmoji ?? "");
  const [start, setStart] = React.useState(trip.startDate);
  const [end, setEnd] = React.useState(trip.endDate);
  const [purpose, setPurpose] = React.useState<TripPurpose>(trip.purpose);
  const [currency, setCurrency] = React.useState<CurrencyCode>(trip.currency);
  const [budget, setBudget] = React.useState(String(trip.totalBudget));
  const [tripErrors, setTripErrors] = React.useState<Record<string, string>>({});
  const [ws, setWs] = React.useState<WorkSchedule>(trip.workSchedule);
  const [userName, setUser] = React.useState(data.user.name);

  const saveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name your trip";
    if (!start) errs.start = "Pick a start date";
    if (!end || end < start) errs.end = "End must be on or after start";
    const b = Number(budget);
    if (Number.isNaN(b) || b < 0) errs.budget = "Enter a valid budget";
    setTripErrors(errs);
    if (Object.keys(errs).length) return;
    updateTrip(trip.id, { name: name.trim(), coverEmoji: emoji.trim() || undefined, startDate: start, endDate: end, purpose, currency, totalBudget: Math.round(b) });
    toast.success("Trip saved");
  };

  const saveWork = () => {
    if (ws.enabled && toMinutes(ws.end) <= toMinutes(ws.start)) return toast.error("Work must end after it starts");
    if (ws.enabled && !ws.days.length) return toast.error("Pick at least one work day");
    updateTrip(trip.id, { workSchedule: ws });
    toast.success("Work schedule saved");
  };

  const exams = data.exams.filter((x) => x.tripId === trip.id).sort((a, b) => a.date.localeCompare(b.date));

  const download = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `waypoint-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file: File) => {
    try {
      const parsed = migrate(JSON.parse(await file.text()));
      commit({ op: "replace", data: parsed });
      toast.success(`Imported ${parsed.trips.length} trip(s)`);
    } catch {
      toast.error("That file isn’t a Waypoint backup");
    }
  };

  const simulated = data.settings.simulatedDate;

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Settings" />

      <div className="mt-6">
        <Section title="You" description="Used for greetings.">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!userName.trim()) return toast.error("Enter a name");
              setUserName(userName.trim());
              toast.success("Saved");
            }}
          >
            <Input aria-label="Your name" value={userName} onChange={(e) => setUser(e.target.value)} />
            <Button type="submit" variant="outline">
              Save
            </Button>
          </form>
        </Section>

        <Section title="Trip" description="Basics for the trip you’re viewing.">
          <form onSubmit={saveTrip} className="grid grid-cols-1 gap-4" noValidate>
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <Field label="Icon" htmlFor="t-emoji">
                <Input id="t-emoji" value={emoji} maxLength={4} onChange={(e) => setEmoji(e.target.value)} className="text-center text-lg" />
              </Field>
              <Field label="Name" htmlFor="t-name" error={tripErrors.name}>
                <Input id="t-name" value={name} aria-invalid={!!tripErrors.name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="t-start" error={tripErrors.start}>
                <Input id="t-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="End" htmlFor="t-end" error={tripErrors.end}>
                <Input id="t-end" type="date" value={end} aria-invalid={!!tripErrors.end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
              <Field label="Purpose" htmlFor="t-purpose">
                <Select id="t-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value as TripPurpose)}>
                  {[...new Set([...TRIP_PURPOSES, purpose])].map((p) => (
                    <option key={p} value={p}>
                      {PURPOSE_LABEL[p]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Currency" htmlFor="t-cur">
                <Select id="t-cur" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Total budget" htmlFor="t-budget" error={tripErrors.budget}>
              <MoneyInput id="t-budget" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </Field>
            <div className="flex justify-between gap-2">
              <Button variant="destructive-ghost" onClick={() => setConfirm("delete")}>
                <Trash2 /> Delete trip
              </Button>
              <Button type="submit">Save trip</Button>
            </div>
          </form>
        </Section>

        <Section id="work" title="Work schedule" description="Work hours are blocked on your timeline and factored into transport decisions.">
          <WorkScheduleEditor value={ws} onChange={setWs} />
          {ws.enabled && ws.daysOff.length > 0 && (
            <div className="mt-5">
              <p className="text-[13px] font-medium">Days off</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ws.daysOff.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWs({ ...ws, daysOff: ws.daysOff.filter((x) => x !== d) })}
                    className="h-8 rounded-full border px-3 text-[12px] hover:bg-muted"
                    aria-label={`Remove day off ${fmtLong(d)}`}
                  >
                    {fmtWeekdayDate(d)} ✕
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">Add days off from any work block on the timeline.</p>
            </div>
          )}
          <Button className="mt-5" onClick={saveWork}>
            Save work schedule
          </Button>
        </Section>

        <Section title="Exams" description="Shown on the timeline and calendar. Weekday exams can be marked as days off from work.">
          {exams.length ? (
            <ul className="divide-y rounded-lg border">
              {exams.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => sheets.open({ type: "exam", id: x.id })} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-muted/50">
                    <GraduationCap className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{x.subject}</span>
                      <span className="text-[12px] text-muted-foreground">
                        {fmtWeekdayDate(x.date)} · {x.startTime}–{x.endTime}
                        {x.venue ? ` · ${x.venue}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted-foreground">No exams on this trip.</p>
          )}
          <Button variant="outline" className="mt-3" onClick={() => sheets.open({ type: "exam" })}>
            <Plus /> Add exam
          </Button>
        </Section>

        <Section id="date" title="Date" description="Waypoint follows your device clock. For the demo, or to rehearse a day, view the app as another date.">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="sim" className="text-[14px] font-medium">
                Use real date
                <span className="block text-[12px] font-normal text-muted-foreground">Today is {fmtWeekdayDate(clock.date)}</span>
              </label>
              <Switch id="sim" checked={!simulated} onCheckedChange={(c) => setSimulatedDate(c ? null : DEMO_TODAY)} />
            </div>
            {simulated && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="View as date" htmlFor="sim-date">
                  <Input id="sim-date" type="date" value={simulated} onChange={(e) => e.target.value && setSimulatedDate(e.target.value)} />
                </Field>
                <Field label="Time" htmlFor="sim-time" optional hint="Leave empty for the real time">
                  <Input id="sim-time" type="time" value={data.settings.simulatedTime ?? ""} onChange={(e) => setSimulatedTime(e.target.value || null)} />
                </Field>
              </div>
            )}
            {simulated && (
              <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <CalendarClock className="size-3.5" /> Viewing as {fmtDayMonth(simulated)} — calculations use this date.
              </p>
            )}
          </div>
        </Section>

        <Section title="Appearance">
          <Segmented
            ariaLabel="Theme"
            value={data.settings.theme}
            onChange={setTheme}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </Section>

        <Section title="Your data" description="Everything is stored on this device. The data layer is built so cloud sync can be added without changing screens.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={download}>
              <Download /> Export backup
            </Button>
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload /> Import backup
                <input type="file" accept="application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
              </label>
            </Button>
            <Button variant="outline" onClick={() => setConfirm("demo")}>
              <RotateCcw /> Reset to demo trip
            </Button>
            <Button variant="destructive-ghost" onClick={() => setConfirm("fresh")}>
              <Trash2 /> Delete all data
            </Button>
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete “${trip.name}”?`}
        description="Its timeline, bookings, expenses and checklist will be removed from this device. This can’t be undone."
        confirmLabel="Delete trip"
        onConfirm={() => {
          deleteTrip(trip.id);
          toast("Trip deleted");
          router.push("/");
        }}
      />
      <ConfirmDialog
        open={confirm === "demo"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Reset to the demo trip?"
        description="All your current data will be replaced by the Kerala + Jaipur demo. Export a backup first if you want to keep it."
        confirmLabel="Reset"
        onConfirm={() => {
          resetToDemo();
          toast.success("Demo trip loaded");
          router.push("/");
        }}
      />
      <ConfirmDialog
        open={confirm === "fresh"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete all data?"
        description="Every trip on this device will be removed. This can’t be undone."
        confirmLabel="Delete everything"
        onConfirm={() => {
          startFresh();
          router.push("/new");
        }}
      />
    </div>
  );
}
