"use client";

/**
 * ResponsiveSheet — one API, two presentations:
 * a bottom sheet (vaul drawer) on phones, a centred dialog on desktop.
 * Header follows one pattern everywhere: icon chip · title · subtitle · close.
 */
import * as React from "react";
import { Drawer } from "vaul";
import { X, type LucideIcon } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { IconChip, type IconTone } from "./icon-chip";
import { useIsDesktop } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  iconTone?: IconTone;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Wider dialog on desktop. */
  wide?: boolean;
}

function Header({
  title,
  description,
  icon,
  iconTone,
  Title,
  Description,
  Close,
}: Pick<SheetProps, "title" | "description" | "icon" | "iconTone"> & {
  Title: React.ElementType;
  Description: React.ElementType;
  Close: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 border-b px-5 py-4">
      {icon && <IconChip icon={icon} tone={iconTone} />}
      <div className="min-w-0 flex-1">
        <Title className="truncate text-[17px] font-semibold leading-tight tracking-tight">{title}</Title>
        {description ? (
          <Description className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{description}</Description>
        ) : (
          <Description className="sr-only">{typeof title === "string" ? title : "Sheet"}</Description>
        )}
      </div>
      <Close
        aria-label="Close"
        className="grid size-10 shrink-0 place-content-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <X className="size-5" />
      </Close>
    </div>
  );
}

export function ResponsiveSheet({ open, onOpenChange, title, description, icon, iconTone, children, footer, className, wide }: SheetProps) {
  const desktop = useIsDesktop();

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideClose className={cn(wide && "max-w-2xl", className)}>
          <Header title={title} description={description} icon={icon} iconTone={iconTone} Title={DialogTitle} Description={DialogDescription} Close={DialogPrimitive.Close} />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t px-5 py-3.5">{footer}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[oklch(0.2_0.03_266/0.4)]" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col rounded-t-[24px] bg-surface outline-none",
            className,
          )}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
          <Header title={title} description={description} icon={icon} iconTone={iconTone} Title={Drawer.Title} Description={Drawer.Description} Close={Drawer.Close} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5">{children}</div>
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
