"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export function Loader({ size = 16, className, ...props }: LoaderProps) {
  return (
    <div
      role="status"
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <Loader2
        className="animate-spin text-muted-foreground"
        style={{ width: size, height: size }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
