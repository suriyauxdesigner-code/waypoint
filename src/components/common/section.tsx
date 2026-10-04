import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Section title above a group: sentence case, quiet count, one optional text action. */
export function SectionHeading({
  title,
  action,
  href,
  onAction,
  className,
  count,
}: {
  title: string;
  action?: string;
  href?: string;
  onAction?: () => void;
  className?: string;
  count?: number;
}) {
  const actionClass =
    "-mr-2 flex h-9 items-center gap-0.5 rounded-lg px-2 text-[14px] font-medium text-accent-foreground transition-colors hover:bg-accent-soft";
  return (
    <div className={cn("flex min-h-9 items-center justify-between gap-3", className)}>
      <h2 className="flex items-baseline gap-2 text-[17px] font-semibold tracking-tight">
        {title}
        {count !== undefined && <span className="text-[14px] font-normal tabular text-muted-foreground">{count}</span>}
      </h2>
      {action &&
        (href ? (
          <Link href={href} className={actionClass}>
            {action}
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <button type="button" onClick={onAction} className={actionClass}>
            {action}
          </button>
        ))}
    </div>
  );
}
