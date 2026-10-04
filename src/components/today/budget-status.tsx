"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { BudgetBar } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import type { MoneySummary } from "@/lib/calc/budget";
import { money } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Budget at a glance: Left (hero) → Spent / To pay / Safe per day, then today's spend.
 * One card — answers "how much do I have left?" and "how am I doing today?".
 */
export function BudgetCard({ m, currency, onAdd, showToday = true }: { m: MoneySummary; currency: CurrencyCode; onAdd: () => void; showToday?: boolean }) {
  const expected = m.totalDays > 0 ? m.daysElapsed / m.totalDays : 0;
  const under = m.todayDelta >= 0;
  return (
    <div className="card">
      <Link href="/money" className="block px-4 pb-4 pt-4 transition-colors hover:bg-surface-2 lg:px-5">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-medium text-muted-foreground">Budget left</p>
          <ChevronRight className="size-4 text-subtle-foreground" />
        </div>
        <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight tabular">
          <span className={cn(m.remaining < 0 && "text-danger")}>{money(m.remaining, currency)}</span>
          <span className="ml-2 text-[15px] font-normal tracking-normal text-muted-foreground">of {money(m.budget, currency)}</span>
        </p>
        <BudgetBar budget={m.budget} spent={m.spent} committed={m.committed} marker={showToday ? expected : undefined} className="mt-4" />
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-[13px] text-muted-foreground">Spent</dt>
            <dd className="text-[15px] font-semibold tabular">{money(m.spent, currency)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Still to pay</dt>
            <dd className="text-[15px] font-semibold tabular">{money(m.committed, currency)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Safe / day</dt>
            <dd className="text-[15px] font-semibold tabular">{money(m.safeDaily, currency)}</dd>
          </div>
        </dl>
      </Link>
      {showToday && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 lg:px-5">
          <div className="min-w-0">
            <p className="text-[15px]">
              <span className="font-semibold tabular">{money(m.spentToday, currency)}</span>
              <span className="text-muted-foreground"> spent today of {money(m.todayTarget, currency)}</span>
            </p>
            <p className={cn("text-[13px]", under ? "text-positive" : "text-danger")}>
              {money(Math.abs(m.todayDelta), currency)} {under ? "under" : "over"} today’s budget
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onAdd} className="shrink-0">
            <Plus /> Expense
          </Button>
        </div>
      )}
    </div>
  );
}
