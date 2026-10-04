import { CalendarDays, ListChecks, Settings, Sun, Ticket, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Today", icon: Sun, match: (p) => p === "/" },
  { href: "/trip", label: "Plan", icon: CalendarDays, match: (p) => p.startsWith("/trip") },
  { href: "/money", label: "Budget", icon: Wallet, match: (p) => p.startsWith("/money") },
  { href: "/bookings", label: "Bookings", icon: Ticket, match: (p) => p.startsWith("/bookings") },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/checklist", label: "Checklist", icon: ListChecks, match: (p) => p.startsWith("/checklist") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
];
