import Link from "next/link";
import { cn } from "@/lib/utils";

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
  return (
    <div className={cn("flex h-8 items-center justify-between gap-3", className)}>
      <h2 className="eyebrow flex items-center gap-1.5">
        {title}
        {count !== undefined && <span className="tabular text-subtle-foreground">{count}</span>}
      </h2>
      {action &&
        (href ? (
          <Link href={href} className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            {action}
          </Link>
        ) : (
          <button type="button" onClick={onAction} className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            {action}
          </button>
        ))}
    </div>
  );
}
