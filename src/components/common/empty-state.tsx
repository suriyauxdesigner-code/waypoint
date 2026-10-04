import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 text-center", compact ? "py-8" : "py-14", className)}>
      {icon && <IconChip icon={icon} size="lg" className="mb-4" />}
      <p className="text-[16px] font-semibold tracking-tight">{title}</p>
      {description && <p className="mt-1 max-w-xs text-[14px] leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
