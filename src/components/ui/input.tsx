import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "flex h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-[15px] lg:h-10 lg:text-sm shadow-[0_1px_0_0_rgb(0_0_0/0.02)] outline-none transition-[border-color,box-shadow] placeholder:text-subtle-foreground focus-visible:border-border-strong focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-danger/15";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input ref={ref} type={type} className={cn(inputClass, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(inputClass, "min-h-20 py-2.5 h-auto resize-none", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

/** Native select: best possible picker on phones, styled to match inputs. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(inputClass, "appearance-none pr-9 cursor-pointer", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      >
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  ),
);
Select.displayName = "Select";

/** Amount input with currency prefix. */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { symbol?: string }
>(({ className, symbol = "₹", ...props }, ref) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[15px] lg:text-sm">
      {symbol}
    </span>
    <input
      ref={ref}
      type="number"
      inputMode="decimal"
      min={0}
      step="1"
      className={cn(inputClass, "pl-7 tabular", className)}
      {...props}
    />
  </div>
));
MoneyInput.displayName = "MoneyInput";
