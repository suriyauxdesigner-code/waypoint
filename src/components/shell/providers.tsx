"use client";

import * as React from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { useStore } from "@/lib/store/store";
import { SheetsProvider } from "@/components/forms/sheets-provider";

function StoreBoot() {
  const hydrate = useStore((s) => s.hydrate);
  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return null;
}

/** Keeps next-themes in sync with the persisted theme setting. */
function ThemeSync() {
  const theme = useStore((s) => s.data.settings.theme);
  const status = useStore((s) => s.status);
  const { setTheme } = useTheme();
  React.useEffect(() => {
    if (status === "ready") setTheme(theme);
  }, [theme, status, setTheme]);
  return null;
}

function ServiceWorker() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <StoreBoot />
      <ThemeSync />
      <ServiceWorker />
      <SheetsProvider>{children}</SheetsProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "!bg-surface !text-foreground !border-border !rounded-lg !shadow-lg !text-[13px] !font-sans",
            description: "!text-muted-foreground",
            actionButton: "!bg-primary !text-primary-foreground !rounded-md",
          },
        }}
      />
    </ThemeProvider>
  );
}
