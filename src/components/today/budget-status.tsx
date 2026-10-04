"use client";

import Link from "next/link";
import { Meter } from "@/components/ui/progress";
import type { MoneySummary } from "@/lib/calc/budget";
import { money, pct } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";

export function BudgetStatus({ m, currency }: { m: MoneySummary; currency: CurrencyCode }) {
  const expected = m.totalDays > 0 ? m.daysElapsed / m.totalDays : 0;
  const tone = m.remaining < 0 ? "danger" : m.usedRatio > expected + 0.15 ? "warning" : "default";
  return (
    <Link href="/money" className="block rounded-xl border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[24px] font-semibold tracking-tight tabular">
          {money(m.spent, currency)}
          <span className="ml-1.5 text-[13px] font-normal text-muted-foreground">spent</span>
        </p>
        <p className="text-[13px] text-muted-foreground tabular">of {money(m.budget, currency)}</p>
      </div>
      <Meter value={m.usedRatio} marker={expected} tone={tone} className="mt-3" label="Budget used" />
      <div className="mt-1.5 flex justify-between text-[11px] text-subtle-foreground">
        <span>{pct(m.usedRatio)} used</span>
        <span>tick = {pct(expected)} of trip elapsed</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-3.5">
        <div>
          <dt className="text-[12px] text-muted-foreground">Remaining</dt>
          <dd className="mt-0.5 text-[16px] font-semibold tabular">{money(m.remaining, currency)}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Safe daily spend</dt>
          <dd className="mt-0.5 text-[16px] font-semibold tabular">
            {money(m.safeDaily, currency)}
            <span className="text-[12px] font-normal text-muted-foreground">/day</span>
          </dd>
        </div>
      </dl>
      {m.committed > 0 && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          {money(Math.max(0, m.safeDailyAfterCommitted), currency)}/day after {money(m.committed, currency)} still to pay for bookings
        </p>
      )}
    </Link>
  );
}

export function TodaySpend({ m, currency, onAdd }: { m: MoneySummary; currency: CurrencyCode; onAdd: () => void }) {
  const under = m.todayDelta >= 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3">
      <div>
        <p className="text-[12px] text-muted-foreground">Spent today</p>
        <p className="text-[16px] font-semibold tabular">
          {money(m.spentToday, currency)}
          <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">of {money(m.todayTarget, currency)}</span>
        </p>
        <p className={under ? "text-[12px] text-positive" : "text-[12px] text-danger"}>
          {money(Math.abs(m.todayDelta), currency)} {under ? "under" : "over"} today’s budget
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="h-10 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-transform active:scale-95"
      >
        + Expense
      </button>
    </div>
  );
}
