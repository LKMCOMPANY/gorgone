import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* Base styles */
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
        /* Text & Selection */
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        /* Dark mode */
        "dark:bg-input/30",
        /* Transitions */
        "transition-[color,box-shadow] duration-[var(--transition-fast)]",
        /* Focus state */
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        /* Error state */
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        "dark:aria-invalid:ring-destructive/40",
        /* Disabled state */
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none",
        /* File input */
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Input };
