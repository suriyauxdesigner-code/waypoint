import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[15px] font-medium transition-[color,background-color,border-color,box-shadow,transform] outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-muted text-foreground hover:bg-border",
        outline: "border border-border bg-surface hover:bg-muted",
        ghost: "hover:bg-muted text-foreground",
        subtle: "text-muted-foreground hover:text-foreground hover:bg-muted",
        destructive: "bg-danger text-white hover:bg-danger/90",
        "destructive-ghost": "text-danger hover:bg-danger-soft",
        link: "text-foreground underline-offset-4 hover:underline px-0 h-auto",
        signal: "bg-signal text-white hover:bg-signal/90",
        accent: "bg-accent text-white hover:bg-accent/90",
      },
      size: {
        default: "h-11 px-4 lg:h-10 lg:text-sm",
        sm: "h-9 rounded-lg px-3 text-[13px]",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-11 lg:size-10",
        "icon-sm": "size-9 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
