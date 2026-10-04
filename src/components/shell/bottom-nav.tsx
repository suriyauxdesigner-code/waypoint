"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useSheets } from "@/components/forms/sheets-provider";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, type NavItem } from "./nav-items";

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors outline-none",
        active ? "text-foreground" : "text-subtle-foreground",
      )}
    >
      <item.icon className={cn("size-[22px]", active ? "stroke-[2.2]" : "stroke-[1.8]")} />
      {item.label}
    </Link>
  );
}

export function BottomNav() {
  const path = usePathname();
  const sheets = useSheets();
  const [a, b, c, d] = PRIMARY_NAV;
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/92 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/80 pb-safe lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center px-2">
        <Tab item={a} active={a.match(path)} />
        <Tab item={b} active={b.match(path)} />
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            aria-label="Add"
            onClick={() => sheets.open({ type: "add-menu" })}
            className="grid size-12 -translate-y-1 place-content-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_-4px_rgb(0_0_0/0.35)] transition-transform active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Plus className="size-6" strokeWidth={2.2} />
          </button>
        </div>
        <Tab item={c} active={c.match(path)} />
        <Tab item={d} active={d.match(path)} />
      </div>
    </nav>
  );
}
