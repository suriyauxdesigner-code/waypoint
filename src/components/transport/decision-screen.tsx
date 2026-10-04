"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronDown, Pencil, Plus, Route, Trash2, Trophy } from "lucide-react";
import { useActiveTrip, useData } from "@/lib/store/hooks";
import { chooseOption, deleteDecision, reopenDecision, saveDecision } from "@/lib/store/actions";
import {
  MODE_LABEL,
  PRIORITY_LABEL,
  PRIORITY_WEIGHTS,
  evaluateDecision,
  sortedLegs,
  legDurationMin,
  type OptionMetrics,
} from "@/lib/calc/transport";
import { fmtDuration, fmtWeekdayDate } from "@/lib/calc/dates";
import { STATUS_LABEL } from "@/lib/calc/bookings";
import { money } from "@/lib/format";
import { MODE_ICONS } from "@/components/common/icons";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm";
import { EmptyState } from "@/components/common/empty-state";
import { useSheets } from "@/components/forms/sheets-provider";
import type { CurrencyCode, DecisionPriority, TransportDecision, TransportOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OptionSheet } from "./option-sheet";

export function DecisionScreen() {
  const params = useSearchParams();
  const id = params.get("id");
  const data = useData();
  const trip = useActiveTrip()!;
  const decision = data.decisions.find((d) => d.id === id && d.tripId === trip.id);
  const list = data.decisions.filter((d) => d.tripId === trip.id);

  if (!decision) {
    return (
      <div className="pt-6 lg:pt-10">
        <Link href="/trip" aria-label="Back to plan" className="card grid size-10 place-content-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-[18px]" />
        </Link>
        <h1 className="mt-5 text-[28px] font-semibold tracking-tight">Compare transport</h1>
        {list.length === 0 ? (
          <EmptyState icon={Route} title="No comparisons yet" description="Compare bus, train and flight options for a long journey from the Trip page." />
        ) : (
          <ul className="card mt-5 divide-y">
            {list.map((d) => (
              <li key={d.id}>
                <Link href={`/trip/transport?id=${d.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                  <span>
                    <span className="block text-[15px] font-medium">{d.title}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {fmtWeekdayDate(d.date)} · {d.options.length} options
                    </span>
                  </span>
                  {d.transportId ? <Badge tone="positive">Decided</Badge> : <Badge tone="warning">Open</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return <Decision key={decision.id} decision={decision} currency={trip.currency} />;
}

function Decision({ decision, currency }: { decision: TransportDecision; currency: CurrencyCode }) {
  const trip = useActiveTrip()!;
  const data = useData();
  const router = useRouter();
  const sheets = useSheets();
  const result = React.useMemo(() => evaluateDecision(decision, trip.workSchedule), [decision, trip.workSchedule]);
  const [editing, setEditing] = React.useState<TransportOption | "new" | null>(null);
  const [showMethod, setShowMethod] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const chosen = decision.chosenOptionId ? result.metrics.find((m) => m.option.id === decision.chosenOptionId) : undefined;
  const transport = decision.transportId ? data.transports.find((t) => t.id === decision.transportId) : undefined;
  const sorted = [...result.metrics].sort((a, b) => b.totalScore - a.totalScore);

  const setPriority = (p: DecisionPriority) => saveDecision({ ...decision, priority: p });

  return (
    <div>
      <header className="pt-safe">
        <div className="flex h-14 items-center justify-between lg:h-auto lg:pt-8">
          <Link href="/trip" aria-label="Back to plan" className="card grid size-10 place-content-center rounded-full hover:bg-muted">
            <ArrowLeft className="size-[18px]" />
          </Link>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" aria-label="Delete comparison" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
          </Button>
        </div>
        <p className="mt-4 text-[14px] font-medium text-accent-foreground">Compare transport</p>
        <h1 className="mt-0.5 text-[28px] font-semibold leading-tight tracking-tight">{decision.title}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {decision.from} → {decision.to} · {fmtWeekdayDate(decision.date)} · {decision.options.length} options
        </p>
      </header>

      {chosen && (
        <div className="mt-6 flex flex-col gap-3 rounded-card bg-positive-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px]">
            <Check className="mr-1.5 inline size-4 text-positive" />
            You chose <span className="font-semibold">{chosen.option.label}</span>
            {transport && <span className="text-muted-foreground"> · {STATUS_LABEL[transport.booking.status]}</span>}
          </p>
          <div className="flex gap-2">
            {transport && (
              <Button size="sm" variant="outline" onClick={() => sheets.open({ type: "transport", id: transport.id })}>
                {transport.booking.status === "confirmed" ? "View booking" : "Add booking details"}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                reopenDecision(decision.id);
                toast("Decision reopened — the journey was removed from your timeline");
              }}
            >
              Change decision
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          ariaLabel="Priority"
          value={decision.priority}
          onChange={setPriority}
          options={(["money", "balanced", "time"] as const).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
          className="w-full sm:w-auto"
        />
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          <Plus /> Add option
        </Button>
      </div>

      {result.metrics.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Add your first option"
          description="E.g. a direct train, a flight, or a bus to the nearest airport plus a flight."
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add option
            </Button>
          }
        />
      ) : (
        <>
          {/* Verdicts */}
          <dl className="card mt-6 grid grid-cols-3 divide-x">
            <Verdict label="Cheapest" metric={result.cheapest} value={result.cheapest && money(result.cheapest.total, currency)} />
            <Verdict label="Fastest" metric={result.fastest} value={result.fastest && fmtDuration(result.fastest.durationMin)} />
            <Verdict
              label="Best value"
              metric={result.bestValue}
              value={result.bestValue && `${Math.round(result.bestValue.totalScore)}/100`}
              highlight
            />
          </dl>
          {result.reasons.length > 0 && (
            <ul className="mt-4 grid gap-1.5 px-1 text-[14px] text-muted-foreground">
              {result.reasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />
                  {r}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setShowMethod((s) => !s)}
            className="mt-3 flex h-10 items-center gap-1 px-1 text-[14px] font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={showMethod}
          >
            <ChevronDown className={cn("size-4 transition-transform", showMethod && "rotate-180")} /> How the score works
          </button>
          {showMethod && (
            <div className="mt-1 rounded-2xl bg-muted px-4 py-3 text-[14px] leading-relaxed text-muted-foreground">
              Each option gets 0–1 on four criteria, relative to the other options (best = 1, worst = 0): <b className="text-foreground">cost</b> (total real cost),{" "}
              <b className="text-foreground">time</b> (door to door), <b className="text-foreground">work</b> (minutes overlapping your work hours) and{" "}
              <b className="text-foreground">convenience</b> (comfort minus changes). Scores are multiplied by the “{PRIORITY_LABEL[decision.priority]}” weights —{" "}
              {Object.entries(PRIORITY_WEIGHTS[decision.priority])
                .map(([k, v]) => `${k === "comfort" ? "convenience" : k} ${Math.round(v * 100)}%`)
                .join(", ")}{" "}
              — and added up to 100.
            </div>
          )}

          {/* Comparison: table on desktop */}
          <div className="card mt-8 hidden overflow-x-auto p-4 lg:block">
            <ComparisonTable metrics={sorted} currency={currency} bestId={result.bestValue?.option.id} chosenId={decision.chosenOptionId} cheapestId={result.cheapest?.option.id} onEdit={setEditing} onChoose={(id) => choose(decision.id, id, router)} />
          </div>

          {/* Stacked options on mobile */}
          <div className="mt-6 grid gap-3 lg:hidden">
            {sorted.map((m) => (
              <OptionBlock
                key={m.option.id}
                m={m}
                currency={currency}
                best={m.option.id === result.bestValue?.option.id}
                cheapest={m.option.id === result.cheapest?.option.id}
                chosen={m.option.id === decision.chosenOptionId}
                onEdit={() => setEditing(m.option)}
                onChoose={() => choose(decision.id, m.option.id, router)}
              />
            ))}
          </div>
        </>
      )}

      {editing && (
        <OptionSheet decision={decision} option={editing === "new" ? undefined : editing} currency={currency} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this comparison?"
        description={decision.transportId ? "The chosen journey stays on your timeline." : "All options will be removed."}
        onConfirm={() => {
          deleteDecision(decision.id);
          router.push("/trip");
          toast("Comparison deleted");
        }}
      />
    </div>
  );
}

function choose(decisionId: string, optionId: string, router: ReturnType<typeof useRouter>) {
  chooseOption(decisionId, optionId);
  toast.success("Added to your timeline as “Need to book”", {
    action: { label: "Bookings", onClick: () => router.push("/bookings") },
  });
}

function Verdict({ label, metric, value, highlight }: { label: string; metric?: OptionMetrics; value?: string; highlight?: boolean }) {
  return (
    <div className="min-w-0 px-3 py-3.5 sm:px-5">
      <dt className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
        {highlight && <Trophy className="size-3.5 text-accent" />}
        {label}
      </dt>
      <dd className="mt-1 truncate text-[15px] font-semibold tracking-tight">{metric?.option.label ?? "—"}</dd>
      <dd className="text-[13px] text-muted-foreground tabular">{value}</dd>
    </div>
  );
}

function LegsLine({ option, compact }: { option: TransportOption; compact?: boolean }) {
  if (compact) {
    return (
      <ol className="grid grid-cols-1 gap-2">
        {sortedLegs(option.legs).map((l) => {
          const I = MODE_ICONS[l.mode];
          return (
            <li key={l.id} className="text-[12px]">
              <span className="flex items-center gap-1.5 font-medium">
                <I className="size-3.5 shrink-0 text-muted-foreground" /> {MODE_LABEL[l.mode]}
                <span className="font-normal tabular text-muted-foreground">
                  {l.departTime}–{l.arriveTime}
                </span>
              </span>
              <span className="block truncate pl-5 text-muted-foreground">
                {l.from} → {l.to}
              </span>
            </li>
          );
        })}
      </ol>
    );
  }
  return (
    <ol className="grid grid-cols-1 gap-1.5">
      {sortedLegs(option.legs).map((l) => {
        const I = MODE_ICONS[l.mode];
        return (
          <li key={l.id} className="flex items-center gap-2 text-[13px]">
            <I className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">
              <span className="font-medium">{MODE_LABEL[l.mode]}</span> {l.from} → {l.to}
            </span>
            <span className="ml-auto shrink-0 tabular text-muted-foreground">
              {l.departTime}–{l.arriveTime} · {fmtDuration(legDurationMin(l))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ScoreBar({ m }: { m: OptionMetrics }) {
  const parts = [
    { k: "cost", v: m.weighted.cost, c: "bg-accent" },
    { k: "time", v: m.weighted.time, c: "bg-accent/65" },
    { k: "work", v: m.weighted.work, c: "bg-accent/40" },
    { k: "convenience", v: m.weighted.comfort, c: "bg-accent/20" },
  ];
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        {parts.map((p) => (
          <span key={p.k} className={p.c} style={{ width: `${p.v}%` }} />
        ))}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground tabular">
        {parts.map((p) => `${p.k} ${Math.round(p.v)}`).join(" · ")}
      </p>
    </div>
  );
}

function OptionBlock({
  m,
  currency,
  best,
  cheapest,
  chosen,
  onEdit,
  onChoose,
}: {
  m: OptionMetrics;
  currency: CurrencyCode;
  best: boolean;
  cheapest: boolean;
  chosen: boolean;
  onEdit: () => void;
  onChoose: () => void;
}) {
  return (
    <article className={cn("card", best && "ring-2 ring-accent/50", chosen && "ring-2 ring-positive")}>
      <header className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">{m.option.label}</h3>
          <div className="mt-1 flex gap-1">
            {best && <Badge tone="accent">Best value</Badge>}
            {cheapest && <Badge>Cheapest</Badge>}
            {chosen && <Badge tone="positive">Chosen</Badge>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-semibold tabular">{money(m.total, currency)}</p>
          <p className="text-[12px] text-muted-foreground tabular">{fmtDuration(m.durationMin)} door to door</p>
        </div>
      </header>
      <div className="px-4 py-3">
        <LegsLine option={m.option} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t px-4 py-3 text-[13px]">
        <Metric label="Tickets" value={money(m.ticket, currency)} />
        <Metric label="Extras" value={money(m.extras, currency)} />
        <Metric label="Work hours hit" value={m.workOverlapMin ? fmtDuration(m.workOverlapMin) : "None"} />
        <Metric label="Changes · comfort" value={`${m.transfers} · ${m.comfort}/5`} />
        {m.extraCostVsCheapest > 0 && <Metric label="Extra vs cheapest" value={money(m.extraCostVsCheapest, currency, { signed: true })} />}
        {m.timeSavedVsCheapestMin > 0 && <Metric label="Time saved" value={fmtDuration(m.timeSavedVsCheapestMin)} />}
        {m.costPerHourSaved && <Metric label="Cost per hour saved" value={`≈ ${money(m.costPerHourSaved, currency)}/h`} />}
      </dl>
      <div className="border-t px-4 py-3">
        <ScoreBar m={m} />
      </div>
      <footer className="flex gap-2 border-t px-4 py-3">
        <Button variant="outline" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        <Button className="flex-1" variant={chosen ? "secondary" : "default"} disabled={chosen} onClick={onChoose}>
          {chosen ? "Chosen" : "Choose this"}
        </Button>
      </footer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular">{value}</dd>
    </div>
  );
}

function ComparisonTable({
  metrics,
  currency,
  bestId,
  cheapestId,
  chosenId,
  onEdit,
  onChoose,
}: {
  metrics: OptionMetrics[];
  currency: CurrencyCode;
  bestId?: string;
  cheapestId?: string;
  chosenId?: string;
  onEdit: (o: TransportOption) => void;
  onChoose: (id: string) => void;
}) {
  const fastestMin = Math.min(...metrics.map((m) => m.durationMin));
  const cheapestTotal = Math.min(...metrics.map((m) => m.total));
  const leastWork = Math.min(...metrics.map((m) => m.workOverlapMin));
  const rows: { label: string; cell: (m: OptionMetrics) => React.ReactNode; best?: (m: OptionMetrics) => boolean; strong?: boolean }[] = [
    { label: "Route", cell: (m) => <LegsLine option={m.option} compact /> },
    { label: "Tickets", cell: (m) => money(m.ticket, currency) },
    {
      label: "Extras",
      cell: (m) =>
        m.option.extras.length ? (
          <span className="grid grid-cols-1 gap-0.5">
            {m.option.extras.map((x) => (
              <span key={x.id} className="text-muted-foreground">
                {x.label} <span className="text-foreground">{money(x.amount, currency)}</span>
              </span>
            ))}
          </span>
        ) : (
          "—"
        ),
    },
    { label: "Total real cost", cell: (m) => money(m.total, currency), best: (m) => m.total === cheapestTotal, strong: true },
    { label: "Door to door", cell: (m) => fmtDuration(m.durationMin), best: (m) => m.durationMin === fastestMin, strong: true },
    { label: "Work hours hit", cell: (m) => (m.workOverlapMin ? fmtDuration(m.workOverlapMin) : "None"), best: (m) => m.workOverlapMin === leastWork },
    { label: "Changes · comfort", cell: (m) => `${m.transfers} · ${m.comfort}/5` },
    { label: "Extra cost vs cheapest", cell: (m) => (m.extraCostVsCheapest > 0 ? money(m.extraCostVsCheapest, currency, { signed: true }) : "—") },
    { label: "Time saved vs cheapest", cell: (m) => (m.timeSavedVsCheapestMin > 0 ? fmtDuration(m.timeSavedVsCheapestMin) : "—") },
    { label: "Cost per hour saved", cell: (m) => (m.costPerHourSaved ? `≈ ${money(m.costPerHourSaved, currency)}/h` : "—") },
    { label: "Score", cell: (m) => <ScoreBar m={m} /> },
  ];
  return (
    <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-[13px]">
      <thead>
        <tr>
          <th className="w-[132px]" />
          {metrics.map((m) => (
            <th key={m.option.id} className={cn("border-b px-3 pb-3 align-bottom", m.option.id === bestId && "bg-accent-soft/60")}>
              <div className="flex flex-wrap gap-1">
                {m.option.id === bestId && <Badge tone="accent">Best value</Badge>}
                {m.option.id === cheapestId && <Badge>Cheapest</Badge>}
                {m.option.id === chosenId && <Badge tone="positive">Chosen</Badge>}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-[16px] font-semibold tracking-tight">{m.option.label}</span>
                <span className="text-[20px] font-semibold tabular">{Math.round(m.totalScore)}</span>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b">
            <th scope="row" className="py-2.5 pr-3 align-top text-[12px] font-medium text-muted-foreground">
              {r.label}
            </th>
            {metrics.map((m) => (
              <td
                key={m.option.id}
                className={cn(
                  "px-3 py-2.5 align-top tabular",
                  m.option.id === bestId && "bg-accent-soft/60",
                  r.strong && "font-semibold",
                  r.best?.(m) && metrics.length > 1 && "text-positive",
                )}
              >
                {r.cell(m)}
              </td>
            ))}
          </tr>
        ))}
        <tr>
          <th />
          {metrics.map((m) => (
            <td key={m.option.id} className={cn("px-3 py-3", m.option.id === bestId && "bg-accent-soft/60 rounded-b-xl")}>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => onEdit(m.option)} aria-label={`Edit ${m.option.label}`}>
                  <Pencil />
                </Button>
                <Button size="sm" className="flex-1" disabled={m.option.id === chosenId} variant={m.option.id === chosenId ? "secondary" : "default"} onClick={() => onChoose(m.option.id)}>
                  {m.option.id === chosenId ? "Chosen" : "Choose"}
                </Button>
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
