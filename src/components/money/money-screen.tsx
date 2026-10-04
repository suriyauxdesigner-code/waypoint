"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, CircleCheck, Info, Pencil, Plus, Search, TrendingUp, Wallet } from "lucide-react";
import { useActiveTrip, useData, useMoney, useToday } from "@/lib/store/hooks";
import { expensesForTrip, phaseSpend, type CategorySummary, type Insight } from "@/lib/calc/budget";
import { fmtWeekdayDate, relativeDayLabel } from "@/lib/calc/dates";
import { phasesForTrip, tripStage } from "@/lib/calc/trip";
import { money, pct } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";
import { SectionHeading } from "@/components/common/section";
import { EmptyState } from "@/components/common/empty-state";
import { CategoryIcon } from "@/components/common/icons";
import { Meter } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useSheets } from "@/components/forms/sheets-provider";
import { PAYMENT_METHODS } from "@/components/forms/expense-sheet";
import type { CurrencyCode, Expense } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DailySpendChart } from "./daily-chart";
import { BudgetSheet } from "./budget-sheet";

export function MoneyScreen() {
  const data = useData();
  const trip = useActiveTrip()!;
  const { today } = useToday();
  const m = useMoney(trip, today)!;
  const sheets = useSheets();
  const params = useSearchParams();
  const router = useRouter();
  const [editBudget, setEditBudget] = React.useState(false);
  const c = trip.currency;
  const stage = tripStage(trip, today);
  const expected = m.totalDays ? m.daysElapsed / m.totalDays : 0;

  // PWA shortcut: /money?add=expense
  React.useEffect(() => {
    if (params.get("add") === "expense") {
      sheets.open({ type: "expense" });
      router.replace("/money", { scroll: false });
    }
  }, [params, router, sheets]);

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Money"
        actions={
          <Button size="sm" className="hidden lg:inline-flex" onClick={() => sheets.open({ type: "expense" })}>
            <Plus /> Expense
          </Button>
        }
      />

      {/* Hero */}
      <section className="mt-4 lg:mt-6" aria-label="Budget summary">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[13px] text-muted-foreground">Trip budget</p>
            <p className="text-[36px] font-semibold leading-none tracking-tight tabular lg:text-[40px]">{money(m.budget, c)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditBudget(true)}>
            <Pencil /> Edit
          </Button>
        </div>
        <Meter value={m.usedRatio} marker={stage === "active" ? expected : undefined} tone={m.remaining < 0 ? "danger" : "default"} className="mt-5 h-2" label="Budget used" />
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Stat label="Spent" value={money(m.spent, c)} />
          <Stat label="Remaining" value={money(m.remaining, c)} tone={m.remaining < 0 ? "danger" : undefined} />
          <Stat label="Used" value={pct(m.usedRatio)} sub={stage === "active" ? `${pct(expected)} of trip elapsed` : undefined} />
          <Stat
            label="Safe daily spend"
            value={`${money(m.safeDaily, c)}/day`}
            sub={m.daysRemaining ? `${m.daysRemaining} days left` : "Trip over"}
            emphasis
          />
        </dl>
        {m.committed > 0 && m.daysRemaining > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              {money(m.committed, c)} is still to pay for bookings{m.plannedPurchases ? " and planned purchases" : ""}. After that, you can spend{" "}
              <span className="font-medium text-foreground">{money(Math.max(0, m.safeDailyAfterCommitted), c)}/day</span>.
            </span>
          </p>
        )}
      </section>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="grid min-w-0 grid-cols-1 content-start gap-10">
          {stage === "active" && <TodaySection m={m} currency={c} today={today} />}

          <section className="lg:hidden">
            <SectionHeading title="Insights" className="mb-2" />
            <InsightList insights={m.insights} />
          </section>

          {m.days.length > 1 && (
            <section>
              <SectionHeading title="Daily spending" className="mb-4" />
              <DailySpendChart days={m.days} target={m.todayTarget} currency={c} today={today} />
            </section>
          )}

          <section>
            <SectionHeading title="Categories" action="Edit" onAction={() => setEditBudget(true)} className="mb-2" />
            <CategoryTable rows={m.categories} currency={c} onPick={(id) => sheets.open({ type: "expense", categoryId: id })} />
          </section>

          <ExpenseList expenses={expensesForTrip(data, trip.id)} currency={c} today={today} />
        </div>

        <aside className="grid min-w-0 grid-cols-1 content-start gap-10">
          <section className="hidden lg:block">
            <SectionHeading title="Insights" className="mb-2" />
            <InsightList insights={m.insights} />
          </section>
          <PhaseSpend />
        </aside>
      </div>

      {editBudget && <BudgetSheet onClose={() => setEditBudget(false)} />}
    </div>
  );
}

function Stat({ label, value, sub, tone, emphasis }: { label: string; value: string; sub?: string; tone?: "danger"; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-[17px] font-semibold tabular", tone === "danger" && "text-danger", emphasis && "text-[19px]")}>{value}</dd>
      {sub && <dd className="text-[12px] text-subtle-foreground">{sub}</dd>}
    </div>
  );
}

function TodaySection({ m, currency, today }: { m: NonNullable<ReturnType<typeof useMoney>>; currency: CurrencyCode; today: string }) {
  const sheets = useSheets();
  const data = useData();
  const under = m.todayDelta >= 0;
  return (
    <section>
      <SectionHeading title={`Today · ${fmtWeekdayDate(today)}`} action="+ Add" onAction={() => sheets.open({ type: "expense" })} className="mb-1" />
      {m.todayExpenses.length === 0 ? (
        <EmptyState compact icon={Wallet} title="No expenses yet." description="Your wallet is suspiciously untouched." />
      ) : (
        <ul className="divide-y">
          {[...m.todayExpenses].reverse().map((e) => {
            const cat = data.categories.find((x) => x.id === e.categoryId);
            return (
              <li key={e.id}>
                <button type="button" onClick={() => sheets.open({ type: "expense", id: e.id })} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <CategoryIcon icon={cat?.icon ?? "circle-ellipsis"} className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{e.merchant || cat?.name}</span>
                  <span className="text-[14px] tabular">{money(e.amount, currency)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <dl className="mt-1 grid gap-1.5 border-t-2 border-foreground pt-3 text-[14px]">
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd className="tabular">{money(m.spentToday, currency)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Daily target</dt>
          <dd className="tabular">{money(m.todayTarget, currency)}</dd>
        </div>
        <div className={cn("flex justify-between font-medium", under ? "text-positive" : "text-danger")}>
          <dt>{under ? "Under today’s budget" : "Over today’s budget"}</dt>
          <dd className="tabular">{money(Math.abs(m.todayDelta), currency)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[12px] text-muted-foreground">
        Tomorrow’s safe spend recalculates from what’s left: remaining budget ÷ remaining days.
      </p>
    </section>
  );
}

function CategoryTable({ rows, currency, onPick }: { rows: CategorySummary[]; currency: CurrencyCode; onPick: (id: string) => void }) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_58px_58px_66px] gap-2 border-b pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[minmax(0,1fr)_96px_96px_96px]">
        <span>Category</span>
        <span className="text-right">Planned</span>
        <span className="text-right">Actual</span>
        <span className="text-right">Remaining</span>
      </div>
      <ul className="divide-y">
        {rows.map((r) => {
          const over = r.actual > r.planned && r.planned > 0;
          const remainingAfter = r.planned - r.actual - r.committed;
          return (
            <li key={r.category.id}>
              <button
                type="button"
                onClick={() => onPick(r.category.id)}
                className="grid w-full grid-cols-[minmax(0,1fr)_58px_58px_66px] items-center gap-2 py-2.5 text-left text-[13px] transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_96px_96px_96px]"
                aria-label={`${r.category.name}: add expense`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <CategoryIcon icon={r.category.icon} className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{r.category.name}</span>
                  </span>
                  <Meter
                    value={r.usedRatio}
                    marker={r.committed > 0 && r.planned > 0 ? (r.actual + r.committed) / r.planned : undefined}
                    tone={over ? "danger" : r.pace && r.pace.ratio > 0.1 ? "warning" : "default"}
                    className="mt-1.5 h-1"
                    label={`${r.category.name} used`}
                  />
                  {r.committed > 0 && (
                    <span className={cn("mt-1 block text-[11px]", remainingAfter < 0 ? "text-warning-foreground" : "text-subtle-foreground")}>
                      +{money(r.committed, currency)} to pay
                    </span>
                  )}
                </span>
                <span className="text-right text-[12px] tabular text-muted-foreground sm:text-[13px]">{money(r.planned, currency)}</span>
                <span className="text-right text-[12px] tabular sm:text-[13px]">{money(r.actual, currency)}</span>
                <span className={cn("text-right text-[12px] font-medium tabular sm:text-[13px]", r.remaining < 0 && "text-danger")}>{money(r.remaining, currency)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const INSIGHT_ICON = { positive: CircleCheck, warning: CircleAlert, danger: CircleAlert, neutral: TrendingUp };

function InsightList({ insights }: { insights: Insight[] }) {
  if (!insights.length) return <p className="text-[13px] text-muted-foreground">Insights appear after a couple of days of spending.</p>;
  return (
    <ul className="divide-y">
      {insights.map((i) => {
        const Icon = INSIGHT_ICON[i.tone];
        return (
          <li key={i.id} className="flex gap-3 py-3">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                i.tone === "positive" && "text-positive",
                i.tone === "warning" && "text-warning",
                i.tone === "danger" && "text-danger",
                i.tone === "neutral" && "text-muted-foreground",
              )}
            />
            <div>
              <p className="text-[14px] font-medium leading-snug">{i.title}</p>
              {i.detail && <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{i.detail}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PhaseSpend() {
  const data = useData();
  const trip = useActiveTrip()!;
  const sheets = useSheets();
  const phases = phasesForTrip(data, trip.id);
  if (!phases.length) return null;
  return (
    <section>
      <SectionHeading title="By phase" className="mb-2" />
      <ul className="grid grid-cols-1 gap-4">
        {phases.map((p) => {
          const spent = phaseSpend(data, p.id);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => sheets.open({ type: "phase", id: p.id })} className="w-full text-left">
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium">{p.name}</span>
                  <span className="tabular text-muted-foreground">
                    {money(spent, trip.currency)}
                    {p.budget ? ` / ${money(p.budget, trip.currency)}` : ""}
                  </span>
                </div>
                {p.budget ? <Meter value={spent / p.budget} tone={spent > p.budget ? "danger" : "default"} className="mt-1.5 h-1" label={`${p.name} budget`} /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ExpenseList({ expenses, currency, today }: { expenses: Expense[]; currency: CurrencyCode; today: string }) {
  const data = useData();
  const sheets = useSheets();
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [limit, setLimit] = React.useState(40);
  const trip = useActiveTrip()!;
  const cats = data.categories.filter((c) => c.tripId === trip.id);
  const filtered = expenses.filter(
    (e) =>
      (!cat || e.categoryId === cat) &&
      (!q || `${e.merchant ?? ""} ${e.location ?? ""} ${e.notes ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );
  const shown = filtered.slice(0, limit);
  const groups = new Map<string, Expense[]>();
  for (const e of shown) {
    if (!groups.has(e.date)) groups.set(e.date, []);
    groups.get(e.date)!.push(e);
  }

  return (
    <section>
      <SectionHeading title="All expenses" count={expenses.length} className="mb-2" />
      {expenses.length > 0 && (
        <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search expenses" placeholder="Search" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select aria-label="Filter by category" value={cat} onChange={(e) => setCat(e.target.value)} className="w-[150px]">
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {expenses.length === 0 ? (
        <EmptyState icon={Wallet} title="No expenses yet." description="Your wallet is suspiciously untouched." action={<Button onClick={() => sheets.open({ type: "expense" })}>Add expense</Button>} />
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">No expenses match.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {[...groups.entries()].map(([date, list]) => (
            <div key={date}>
              <div className="flex justify-between border-b pb-1.5 text-[12px] text-muted-foreground">
                <span className="font-medium">
                  {relativeDayLabel(date, today)} · {fmtWeekdayDate(date)}
                </span>
                <span className="tabular">{money(list.reduce((a, e) => a + e.amount, 0), currency)}</span>
              </div>
              <ul className="divide-y">
                {list.map((e) => {
                  const c = data.categories.find((x) => x.id === e.categoryId);
                  return (
                    <li key={e.id}>
                      <button type="button" onClick={() => sheets.open({ type: "expense", id: e.id })} className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/40">
                        <span className="grid size-8 shrink-0 place-content-center rounded-full bg-muted">
                          <CategoryIcon icon={c?.icon ?? "circle-ellipsis"} className="size-4 text-muted-foreground" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px]">{e.merchant || c?.name || "Expense"}</span>
                          <span className="block truncate text-[12px] text-muted-foreground">
                            {c?.name ?? "Uncategorised"}
                            {e.location ? ` · ${e.location}` : ""} · {PAYMENT_METHODS.find((p) => p.value === e.paymentMethod)?.label}
                            {e.linked ? " · booking" : ""}
                          </span>
                        </span>
                        <span className="text-[14px] font-medium tabular">{money(e.amount, currency)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {filtered.length > limit && (
            <Button variant="ghost" onClick={() => setLimit((l) => l + 40)}>
              Show more
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
