"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { TripPill } from "./trip-switcher";

/** Mobile-only utilities: checklist and settings (desktop has them in the sidebar). */
export function MobileUtilities({ inverted }: { inverted?: boolean }) {
  const path = usePathname();
  const cls = (active: boolean) =>
    cn(
      "grid size-10 place-content-center rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring",
      inverted ? "bg-white/12 text-white hover:bg-white/20" : "card text-foreground/80 hover:bg-muted",
      active && !inverted && "text-accent-foreground",
    );
  return (
    <div className="flex items-center gap-2 lg:hidden">
      <Link href="/checklist" aria-label="Checklist" className={cls(path.startsWith("/checklist"))}>
        <ListChecks className="size-[19px]" />
      </Link>
      <Link href="/settings" aria-label="Settings" className={cls(path.startsWith("/settings"))}>
        <Settings className="size-[19px]" />
      </Link>
    </div>
  );
}

/** Top bar used on phones above every screen: trip switcher left, utilities right. */
export function MobileTopBar({ inverted, className }: { inverted?: boolean; className?: string }) {
  return (
    <div className={cn("flex h-14 items-center justify-between gap-3 lg:hidden", className)}>
      <TripPill inverted={inverted} />
      <MobileUtilities inverted={inverted} />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: React.ReactNode;
  /** One quiet line under the title. */
  description?: React.ReactNode;
  /** Deprecated visual label; kept for call-site compatibility, not rendered. */
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("pt-safe", className)}>
      <MobileTopBar className="pt-2" />
      <div className="mt-4 flex items-end justify-between gap-3 lg:mt-0 lg:pt-10">
        <div className="min-w-0">
          {title && <h1 className="truncate text-[28px] font-semibold leading-tight tracking-tight lg:text-[30px]">{title}</h1>}
          {description && <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
