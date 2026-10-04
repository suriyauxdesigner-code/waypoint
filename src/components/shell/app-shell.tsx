"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw, Download, Compass } from "lucide-react";
import { useStatus, useActiveTrip } from "@/lib/store/hooks";
import { resetToDemo, wipeStorage } from "@/lib/store/store";
import { repository } from "@/lib/data/local-storage-repository";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSheets } from "@/components/forms/sheets-provider";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Wordmark } from "./logo";
import { IconChip } from "@/components/ui/icon-chip";

function LoadingShell() {
  return (
    <div className="pt-6 lg:pt-10" aria-busy="true" aria-label="Loading your trip">
      <Skeleton className="h-10 w-48 rounded-full" />
      <Skeleton className="mt-6 h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-40" />
      <div className="card mt-6 grid gap-5 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorShell({ message }: { message: string }) {
  const download = () => {
    const raw = repository.readRaw() ?? "";
    const blob = new Blob([raw], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "waypoint-backup.json";
    a.click();
  };
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Wordmark />
      <h1 className="mt-8 text-[22px] font-semibold tracking-tight">We couldn’t open your saved trips</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{message} Your data hasn’t been deleted. Download a copy first, then reset.</p>
      <div className="mt-6 grid gap-2">
        <Button variant="outline" onClick={download}>
          <Download /> Download raw data
        </Button>
        <Button
          onClick={async () => {
            await wipeStorage();
            await resetToDemo();
          }}
        >
          <RotateCcw /> Reset and load demo trip
        </Button>
      </div>
    </div>
  );
}

function NoTrips() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <IconChip icon={Compass} tone="accent" size="lg" className="size-14 [&_svg]:size-6" />
      <h1 className="mt-5 text-[24px] font-semibold tracking-tight">Plan your first trip</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Where you’re going, when, and your budget. Stays, transport and plans can come later — like notes, but organised.</p>
      <div className="mt-6 grid w-full gap-2">
        <Button asChild size="lg">
          <Link href="/new">Plan a trip</Link>
        </Button>
        <Button variant="ghost" onClick={() => resetToDemo()}>
          Load the demo trip
        </Button>
      </div>
    </div>
  );
}

function useAddShortcut() {
  const sheets = useSheets();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (document.querySelector("[role='dialog']")) return;
      if (e.key === "a") {
        e.preventDefault();
        sheets.open({ type: "add-menu" });
      } else if (e.key === "e") {
        e.preventDefault();
        sheets.open({ type: "expense" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheets]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, error } = useStatus();
  const trip = useActiveTrip();
  useAddShortcut();

  if (status === "error") return <ErrorShell message={error ?? ""} />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(112px+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pb-16">
          {status !== "ready" ? <LoadingShell /> : !trip ? <NoTrips /> : children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
