import * as React from "react";
import { cn } from "@/lib/utils";

/** The one surface. Use for a meaningful group (a day, a budget, a list) — never nest cards. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card overflow-hidden", className)} {...props} />;
}

/** Card title row with an optional right-side meta, separated from the body by a divider. */
export function CardHeader({
  title,
  meta,
  className,
  children,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-14 items-center justify-between gap-3 border-b px-4 py-3 lg:px-5", className)}>
      <div className="min-w-0 text-[16px] font-semibold tracking-tight">{title}</div>
      {meta && <div className="shrink-0 text-[14px] text-muted-foreground">{meta}</div>}
      {children}
    </div>
  );
}

/** A list inside a card with inset dividers. */
export function CardList({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("divide-y divide-border [&>li]:px-4 lg:[&>li]:px-5", className)} {...props} />;
}

/** Small stat: label above value. */
export function Stat({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "danger" | "positive" | "muted";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-[17px] font-semibold tracking-tight tabular",
          tone === "danger" && "text-danger",
          tone === "positive" && "text-positive",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </dd>
      {sub && <dd className="text-[12px] text-muted-foreground">{sub}</dd>}
    </div>
  );
}
