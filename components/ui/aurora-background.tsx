"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  showRadialGradient?: boolean;
}

export function AuroraBackground({
  children,
  showRadialGradient = true,
  className,
  ...props
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center bg-background text-foreground transition-bg",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            "pointer-events-none absolute -inset-[10px] opacity-50 blur-[10px] invert-0 filter will-change-transform [--aurora-opacity:0.5] [--aurora-1:oklch(0.62_0.24_285)] [--aurora-2:oklch(0.72_0.15_220)] [--aurora-3:oklch(0.70_0.18_150)] dark:invert",
            "bg-[radial-gradient(ellipse_at_100%_0%,var(--aurora-1)_0%,transparent_50%),radial-gradient(ellipse_at_0%_100%,var(--aurora-2)_10%,transparent_40%),radial-gradient(ellipse_at_60%_-20%,var(--aurora-3)_0%,transparent_50%),radial-gradient(ellipse_at_100%_100%,var(--aurora-1)_0%,transparent_50%)]",
            "[background-size:200%_100%,200%_100%]",
            "[background-position:50%_50%,50%_50%]",
            "[animation:aurora_60s_ease_infinite]"
          )}
        />
        {showRadialGradient && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--background)_90%)]" />
        )}
      </div>
      {children}
    </div>
  );
}

