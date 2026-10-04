import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-6", className)}>
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <path
        d="M16 44 C 24 44, 26 22, 34 22 S 44 36, 48 36"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="0.1 8.4"
      />
      <circle cx="16" cy="44" r="4.5" className="fill-primary-foreground" />
      <circle cx="48" cy="20" r="7" className="fill-signal" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <LogoMark />
      Waypoint
    </span>
  );
}
