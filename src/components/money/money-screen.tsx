"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, CircleAlert, CircleCheck, Pencil, Plus, Search, TrendingUp, Wallet } from "lucide-react";
import { useActiveTrip, useData, useMoney, useToday } from "@/lib/store/hooks";
import { expensesForTrip, phaseSpend, type CategorySummary, type Insight } from "@/lib/calc/budget";
import { fmtWeekdayDate, relativeDayLabel } from "@/lib/calc/dates";
import { phasesForTrip, tripStage } from "@/lib/calc/trip";
import { money } from "@/lib/format";
import { sum } from "@/lib/utils";
import { PageHeader } from "@/components/shell/page-header";
import { SectionHeading } from "@/components/common/section";
import { EmptyState } from "@/components/common/empty-state";
import { CategoryIcon } from "@/components/common/icons";
import { BudgetBar } from "@/components/common/money";
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
  const planned = sum(m.categories, (x) => x.planned);
  const unassigned = m.budget - planned;

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
        title="Budget"
        description={trip.name}
        actions={
          <Button className="hidden lg:inline-flex" onClick={() => sheets.open({ type: "expense" })}>
            <Plus /> Add expense
          </Button>
        }
      />

      {/* Budget → Planned → Spent → Left */}
      <section className="card mt-6" aria-label="Budget summary">
        <div className="p-4 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[15px] font-medium text-muted-foreground">Left to spend</p>
              <p className={cn("mt-1 text-[36px] font-semibold leading-none tracking-tight tabular lg:text-[44px]", m.remaining < 0 && "text-danger")}>
                {money(m.remaining, c)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditBudget(true)} className="-mr-1 text-accent-foreground">
              <Pencil /> Edit
            </Button>
          </div>
          <BudgetBar budget={m.budget} spent={m.spent} committed={m.committed} marker={stage === "active" ? expected : undefined} className="mt-5 h-3" />
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-accent" /> Spent
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-accent/30" /> Booked, still to pay
            </li>
            {stage === "active" && (
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-0.5 rounded-full bg-foreground/60" /> Where you’d be on plan today
              </li>
            )}
          </ul>
        </div>
        <dl className="grid grid-cols-2 border-t sm:grid-cols-4 [&>div]:px-4 [&>div]:py-3.5 lg:[&>div]:px-6">
          <FlowStat label="Budget" value={money(m.budget, c)} />
          <FlowStat
            label="Planned"
            value={money(planned, c)}
            sub={unassigned > 0 ? `${money(unassigned, c)} unassigned` : unassigned < 0 ? `${money(-unassigned, c)} over budget` : "All assigned"}
            subTone={unassigned < 0 ? "danger" : undefined}
            className="border-l"
          />
          <FlowStat label="Spent" value={money(m.spent, c)} sub={m.committed > 0 ? `+ ${money(m.committed, c)} to pay` : undefined} className="border-t sm:border-l sm:border-t-0" />
          <FlowStat
            label={m.remaining < 0 ? "Over" : "Left"}
            value={money(Math.abs(m.remaining), c)}
            tone={m.remaining < 0 ? "danger" : "positive"}
            sub={m.daysRemaining ? `${money(m.safeDaily, c)}/day for ${m.daysRemaining} days` : undefined}
            className="border-l border-t sm:border-t-0"
          />
        </dl>
        {m.committed > 0 && m.daysRemaining > 0 && (
          <p className="border-t px-4 py-3 text-[14px] text-muted-foreground lg:px-6">
            After paying for bookings{m.plannedPurchases ? " and planned purchases" : ""}, you can spend{" "}
            <span className="font-semibold text-foreground tabular">{money(Math.max(0, m.safeDailyAfterCommitted), c)}/day</span>.
          </p>
        )}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="grid min-w-0 grid-cols-1 content-start gap-8">
          {stage === "active" && <TodaySection m={m} currency={c} today={today} />}

          <section>
            <SectionHeading title="Planned vs actual" action="Edit plan" onAction={() => setEditBudget(true)} className="mb-3" />
            <CategoryList rows={m.categories} currency={c} onPick={(id) => sheets.open({ type: "expense", categoryId: id })} />
          </section>

          <section className="lg:hidden">
            <SectionHeading title="Insights" className="mb-3" />
            <InsightList insights={m.insights} />
          </section>

          <ExpenseList expenses={expensesForTrip(data, trip.id)} currency={c} today={today} />
        </div>

        <aside className="grid min-w-0 grid-cols-1 content-start gap-8">
          <section className="hidden lg:block">
            <SectionHeading title="Insights" className="mb-3" />
            <InsightList insights={m.insights} />
          </section>
          {m.days.length > 1 && <DailySpending m={m} currency={c} today={today} />}
          <PhaseSpend />
        </aside>
      </div>

      {editBudget && <BudgetSheet onClose={() => setEditBudget(false)} />}
    </div>
  );
}

function FlowStat({
  label,
  value,
  sub,
  tone,
  subTone,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "danger" | "positive";
  subTone?: "danger";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-[18px] font-semibold tracking-tight tabular", tone === "danger" && "text-danger", tone === "positive" && "text-positive")}>{value}</dd>
      {sub && <dd className={cn("truncate text-[12px]", subTone === "danger" ? "text-danger" : "text-muted-foreground")}>{sub}</dd>}
    </div>
  );
}

function TodaySection({ m, currency, today }: { m: NonNullable<ReturnType<typeof useMoney>>; currency: CurrencyCode; today: string }) {
  const sheets = useSheets();
  const data = useData();
  const under = m.todayDelta >= 0;
  return (
    <section>
      <SectionHeading title="Today" action="+ Add" onAction={() => sheets.open({ type: "expense" })} className="mb-3" />
      <div className="card">
        <div className="flex items-end justify-between gap-3 border-b px-4 py-3.5 lg:px-5">
          <div>
            <p className="text-[13px] text-muted-foreground">{fmtWeekdayDate(today)}</p>
            <p className="text-[22px] font-semibold tracking-tight tabular">
              {money(m.spentToday, currency)}
              <span className="ml-1.5 text-[14px] font-normal tracking-normal text-muted-foreground">of {money(m.todayTarget, currency)}</span>
            </p>
          </div>
          <p className={cn("pb-1 text-right text-[14px] font-medium", under ? "text-positive" : "text-danger")}>
            {money(Math.abs(m.todayDelta), currency)} {under ? "under" : "over"}
          </p>
        </div>
        {m.todayExpenses.length === 0 ? (
          <p className="px-4 py-4 text-[14px] text-muted-foreground lg:px-5">No expenses yet today.</p>
        ) : (
          <ul className="divide-y">
            {[...m.todayExpenses].reverse().map((e) => {
              const cat = data.categories.find((x) => x.id === e.categoryId);
              return (
                <li key={e.id}>
                  <ExpenseRow e={e} icon={cat?.icon} title={e.merchant || cat?.name || "Expense"} sub={cat?.name} currency={currency} onOpen={() => sheets.open({ type: "expense", id: e.id })} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t px-4 py-3 text-[13px] text-muted-foreground lg:px-5">Tomorrow’s allowance recalculates from what’s left ÷ days remaining.</p>
      </div>
    </section>
  );
}

function ExpenseRow({ e, icon, title, sub, currency, onOpen }: { e: Expense; icon?: string; title: string; sub?: string; currency: CurrencyCode; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2 lg:px-5">
      <span className="grid size-9 shrink-0 place-content-center rounded-full bg-muted">
        <CategoryIcon icon={icon ?? "circle-ellipsis"} className="size-4 text-foreground/70" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{title}</span>
        {sub && <span className="block truncate text-[13px] text-muted-foreground">{sub}</span>}
      </span>
      <span className="text-[15px] font-medium tabular">{money(e.amount, currency)}</span>
    </button>
  );
}

/** Planned vs actual per category — a readable list instead of a table. */
function CategoryList({ rows, currency, onPick }: { rows: CategorySummary[]; currency: CurrencyCode; onPick: (id: string) => void }) {
  return (
    <ul className="card divide-y">
      {rows.map((r) => {
        const over = r.actual > r.planned && r.planned > 0;
        const remainingAfter = r.planned - r.actual - r.committed;
        return (
          <li key={r.category.id}>
            <button
              type="button"
              onClick={() => onPick(r.category.id)}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 lg:px-5"
              aria-label={`${r.category.name}: ${money(r.actual, currency)} of ${money(r.planned, currency)} planned. Add expense`}
            >
              <span className="grid size-9 shrink-0 place-content-center rounded-full bg-muted">
                <CategoryIcon icon={r.category.icon} className="size-4 text-foreground/70" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-medium">{r.category.name}</span>
                  <span className={cn("shrink-0 text-[14px] font-medium tabular", r.remaining < 0 ? "text-danger" : "text-foreground")}>
                    {r.remaining < 0 ? `${money(-r.remaining, currency)} over` : `${money(r.remaining, currency)} left`}
                  </span>
                </span>
                <Meter
                  value={r.usedRatio}
                  marker={r.committed > 0 && r.planned > 0 ? (r.actual + r.committed) / r.planned : undefined}
                  tone={over ? "danger" : r.pace && r.pace.ratio > 0.1 ? "warning" : "default"}
                  className="mt-2 h-1.5"
                  label={`${r.category.name} used`}
                />
                <span className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[13px] tabular text-muted-foreground">
                  <span>
                    <span className="text-foreground">{money(r.actual, currency)}</span> spent of {money(r.planned, currency)} planned
                  </span>
                  {r.committed > 0 && (
                    <span className={remainingAfter < 0 ? "text-warning-foreground" : undefined}>+{money(r.committed, currency)} to pay</span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const INSIGHT_ICON = { positive: CircleCheck, warning: CircleAlert, danger: CircleAlert, neutral: TrendingUp };

function InsightList({ insights }: { insights: Insight[] }) {
  const [all, setAll] = React.useState(false);
  if (!insights.length) return <p className="card px-4 py-4 text-[14px] text-muted-foreground lg:px-5">Insights appear after a couple of days of spending.</p>;
  const shown = all ? insights : insights.slice(0, 2);
  return (
    <div className="card">
      <ul className="divide-y">
        {shown.map((i) => {
          const Icon = INSIGHT_ICON[i.tone];
          return (
            <li key={i.id} className="flex gap-3 px-4 py-3.5 lg:px-5">
              <Icon
                className={cn(
                  "mt-0.5 size-[18px] shrink-0",
                  i.tone === "positive" && "text-positive",
                  i.tone === "warning" && "text-warning",
                  i.tone === "danger" && "text-danger",
                  i.tone === "neutral" && "text-muted-foreground",
                )}
              />
              <div>
                <p className="text-[15px] font-medium leading-snug">{i.title}</p>
                {i.detail && <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{i.detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      {insights.length > 2 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="flex h-12 w-full items-center justify-center gap-1.5 border-t text-[14px] font-medium text-accent-foreground transition-colors hover:bg-surface-2"
        >
          {all ? "Show less" : `Show ${insights.length - 2} more`}
          <ChevronDown className={cn("size-4 transition-transform", all && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

function DailySpending({ m, currency, today }: { m: NonNullable<ReturnType<typeof useMoney>>; currency: CurrencyCode; today: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <section className="card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left transition-colors hover:bg-surface-2 lg:px-5"
      >
        <span>
          <span className="block text-[16px] font-semibold tracking-tight">Daily spending</span>
          <span className="block text-[13px] text-muted-foreground">Averaging {money(m.avgDailyDiscretionary, currency)}/day on day-to-day costs</span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-8 lg:px-5">
          <DailySpendChart days={m.days} target={m.todayTarget} currency={currency} today={today} />
        </div>
      )}
    </section>
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
      <SectionHeading title="By phase" className="mb-3" />
      <ul className="card divide-y">
        {phases.map((p) => {
          const spent = phaseSpend(data, p.id);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => sheets.open({ type: "phase", id: p.id })} className="w-full px-4 py-3.5 text-left transition-colors hover:bg-surface-2 lg:px-5">
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[14px] tabular text-muted-foreground">
                    <span className="font-medium text-foreground">{money(spent, trip.currency)}</span>
                    {p.budget ? ` of ${money(p.budget, trip.currency)}` : ""}
                  </span>
                </div>
                {p.budget ? <Meter value={spent / p.budget} tone={spent > p.budget ? "danger" : "default"} className="mt-2 h-1.5" label={`${p.name} budget`} /> : null}
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
  const [limit, setLimit] = React.useState(15);
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
      <SectionHeading title="All expenses" count={expenses.length} className="mb-3" />
      {expenses.length > 0 && (
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search expenses" placeholder="Search" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select aria-label="Filter by category" value={cat} onChange={(e) => setCat(e.target.value)} className="w-[132px] sm:w-[170px]">
            <option value="">All</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {expenses.length === 0 ? (
        <div className="card">
          <EmptyState icon={Wallet} title="No expenses yet" description="Log what you spend and it’s compared to your plan automatically." action={<Button onClick={() => sheets.open({ type: "expense" })}>Add expense</Button>} />
        </div>
      ) : filtered.length === 0 ? (
        <p className="card px-4 py-6 text-center text-[14px] text-muted-foreground">No expenses match.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {[...groups.entries()].map(([date, list]) => (
            <div key={date}>
              <div className="mb-2 flex justify-between px-1 text-[14px] text-muted-foreground">
                <span>
                  {relativeDayLabel(date, today)}
                  {relativeDayLabel(date, today) !== fmtWeekdayDate(date) && ` · ${fmtWeekdayDate(date)}`}
                </span>
                <span className="font-medium tabular text-foreground">{money(list.reduce((a, e) => a + e.amount, 0), currency)}</span>
              </div>
              <ul className="card divide-y">
                {list.map((e) => {
                  const c = data.categories.find((x) => x.id === e.categoryId);
                  const method = PAYMENT_METHODS.find((p) => p.value === e.paymentMethod)?.label;
                  return (
                    <li key={e.id}>
                      <ExpenseRow
                        e={e}
                        icon={c?.icon}
                        title={e.merchant || c?.name || "Expense"}
                        sub={[c?.name ?? "Uncategorised", e.location, method, e.linked ? "booking" : undefined].filter(Boolean).join(" · ")}
                        currency={currency}
                        onOpen={() => sheets.open({ type: "expense", id: e.id })}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {filtered.length > limit && (
            <Button variant="outline" onClick={() => setLimit((l) => l + 30)}>
              Show more <ChevronRight />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
