"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[24px] font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">This screen hit an error. Your data is safe on this device.</p>
      <p className="mt-3 max-w-full truncate font-mono text-[12px] text-subtle-foreground">{error.message}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
