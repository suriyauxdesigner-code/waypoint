import { money } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";
import { cn, clamp } from "@/lib/utils";

/**
 * Budget → Spent → Left on one bar.
 * Solid = actually spent, light = planned but not yet spent (committed), track = free.
 */
export function BudgetBar({
  budget,
  spent,
  committed = 0,
  marker,
  className,
}: {
  budget: number;
  spent: number;
  committed?: number;
  /** 0–1 position for "where you should be by today". */
  marker?: number;
  className?: string;
}) {
  const over = spent > budget;
  const s = budget > 0 ? clamp(spent / budget, 0, 1) : spent > 0 ? 1 : 0;
  const c = budget > 0 ? clamp(committed / budget, 0, 1 - s) : 0;
  return (
    <div
      role="meter"
      aria-label="Budget used"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(s * 100)}
      className={cn("relative flex h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <span className={cn("h-full transition-[width] duration-500", over ? "bg-danger" : "bg-accent")} style={{ width: `${s * 100}%` }} />
      {c > 0 && <span className="h-full bg-accent/30" style={{ width: `${c * 100}%` }} />}
      {marker !== undefined && (
        <span aria-hidden className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `${clamp(marker, 0, 1) * 100}%` }} />
      )}
    </div>
  );
}

/**
 * "Planned ₹850 · Actual ₹820" — the per-item version of planned vs actual.
 * Actual only appears once something has been paid/logged.
 */
export function PlannedActual({
  planned,
  actual,
  currency,
  className,
  plannedLabel = "Planned",
}: {
  planned: number;
  actual?: number;
  currency: CurrencyCode;
  className?: string;
  plannedLabel?: string;
}) {
  const hasActual = actual !== undefined && actual > 0;
  const diff = hasActual ? actual - planned : 0;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 text-[13px] tabular", className)}>
      <span className="text-muted-foreground">
        {plannedLabel} <span className="text-foreground">{money(planned, currency)}</span>
      </span>
      {hasActual && (
        <span className="text-muted-foreground">
          <span aria-hidden className="mr-2 text-border-strong">|</span>Actual <span className="font-medium text-foreground">{money(actual, currency)}</span>
          {planned > 0 && diff !== 0 && (
            <span className={cn("ml-1", diff > 0 ? "text-danger" : "text-positive")}>
              {diff > 0 ? "+" : "−"}
              {money(Math.abs(diff), currency)}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
