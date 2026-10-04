import { cn, clamp } from "@/lib/utils";

/** Thin meter. `marker` draws a tick (e.g. where you "should" be by today). */
export function Meter({
  value,
  marker,
  tone = "default",
  className,
  label,
}: {
  value: number;
  marker?: number;
  tone?: "default" | "positive" | "warning" | "danger";
  className?: string;
  label?: string;
}) {
  const v = clamp(value, 0, 1);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn("relative h-1.5 w-full rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "default" && "bg-accent",
          tone === "positive" && "bg-positive",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-danger",
        )}
        style={{ width: `${v * 100}%` }}
      />
      {marker !== undefined && (
        <div
          aria-hidden
          className="absolute -top-1 h-[calc(100%+8px)] w-0.5 rounded-full bg-foreground/70"
          style={{ left: `${clamp(marker, 0, 1) * 100}%` }}
        />
      )}
    </div>
  );
}
