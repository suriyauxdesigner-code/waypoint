"use client";

/**
 * ResponsiveSheet — one API, two presentations:
 * a bottom sheet (vaul drawer) on phones, a centred dialog on desktop.
 */
import * as React from "react";
import { Drawer } from "vaul";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { useIsDesktop } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Wider dialog on desktop. */
  wide?: boolean;
}

export function ResponsiveSheet({ open, onOpenChange, title, description, children, footer, className, wide }: SheetProps) {
  const desktop = useIsDesktop();

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(wide && "max-w-2xl", className)}>
          <div className="border-b px-5 pb-3.5 pt-4 pr-12">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription className="mt-0.5">{description}</DialogDescription> : <DialogDescription className="sr-only">{typeof title === "string" ? title : "Dialog"}</DialogDescription>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t bg-surface-2/50 px-5 py-3">{footer}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/35" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border-t bg-surface outline-none",
            className,
          )}
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
          <div className="px-5 pb-2 pt-3">
            <Drawer.Title className="text-[17px] font-semibold tracking-tight">{title}</Drawer.Title>
            {description ? (
              <Drawer.Description className="mt-0.5 text-[13px] text-muted-foreground">{description}</Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{typeof title === "string" ? title : "Sheet"}</Drawer.Description>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2">{children}</div>
          {footer && (
            <div className="flex items-center gap-2 border-t bg-surface px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] [&>*]:flex-1">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
