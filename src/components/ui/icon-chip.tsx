import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconTone = "neutral" | "accent" | "signal" | "positive" | "warning" | "danger" | "outline";

const TONES: Record<IconTone, string> = {
  neutral: "bg-muted text-foreground/80",
  accent: "bg-accent-soft text-accent-foreground",
  signal: "bg-signal-soft text-signal-foreground",
  positive: "bg-positive-soft text-positive",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger",
  outline: "border bg-surface text-foreground/80",
};

/** Round icon badge — the reference's "category chip". Sizes: sm 32 · md 40 · lg 44. */
export function IconChip({
  icon: Icon,
  tone = "neutral",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-content-center rounded-full",
        size === "sm" && "size-8 [&_svg]:size-4",
        size === "md" && "size-10 [&_svg]:size-[18px]",
        size === "lg" && "size-11 [&_svg]:size-5",
        TONES[tone],
        className,
      )}
    >
      <Icon />
    </span>
  );
}
