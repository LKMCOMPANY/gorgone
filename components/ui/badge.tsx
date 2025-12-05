import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] duration-[var(--transition-fast)] overflow-hidden [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white shadow-xs [a&]:hover:bg-destructive/90 dark:bg-destructive/60",
        outline:
          "border-border bg-background text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        
        /* Tactical Solids */
        success:
          "border-transparent bg-tactical-green text-white shadow-xs",
        warning:
          "border-transparent bg-tactical-amber text-black shadow-xs",
        danger:
          "border-transparent bg-tactical-red text-white shadow-xs",
        info:
          "border-transparent bg-tactical-blue text-white shadow-xs",

        /* Tactical Outlines (HUD Style) */
        "outline-success":
          "border-tactical-green text-tactical-green bg-tactical-green/10 hover:bg-tactical-green/20",
        "outline-warning":
          "border-tactical-amber text-tactical-amber bg-tactical-amber/10 hover:bg-tactical-amber/20",
        "outline-danger":
          "border-tactical-red text-tactical-red bg-tactical-red/10 hover:bg-tactical-red/20",
        "outline-info":
          "border-tactical-blue text-tactical-blue bg-tactical-blue/10 hover:bg-tactical-blue/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
