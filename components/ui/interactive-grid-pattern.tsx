"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface InteractiveGridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  squares?: [number, number]; // [columns, rows]
  squaresClassName?: string;
}

/**
 * InteractiveGridPattern
 * A background grid pattern that lights up cells on hover.
 * Ideally used as a background for dashboard or chat interfaces.
 */
export function InteractiveGridPattern({
  width = 40,
  height = 40,
  squares = [24, 24],
  className,
  squaresClassName,
  ...props
}: InteractiveGridPatternProps) {
  const [horizontal, vertical] = squares;
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  return (
    <svg
      width={width * horizontal}
      height={height * vertical}
      className={cn(
        "absolute inset-0 h-full w-full border-b border-border/5",
        className
      )}
      {...props}
    >
      {Array.from({ length: horizontal * vertical }).map((_, i) => {
        const x = (i % horizontal) * width;
        const y = Math.floor(i / horizontal) * height;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={width}
            height={height}
            className={cn(
              "stroke-border/10 transition-all duration-300 ease-out", // Ultra subtle lines
              hoveredSquare === i
                ? "fill-primary/5" // Very subtle hover
                : "fill-transparent",
              squaresClassName
            )}
            onMouseEnter={() => setHoveredSquare(i)}
            onMouseLeave={() => setHoveredSquare(null)}
          />
        );
      })}
    </svg>
  );
}

