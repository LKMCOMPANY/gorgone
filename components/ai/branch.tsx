"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BranchProps extends React.HTMLAttributes<HTMLDivElement> {
  currentBranchIndex: number;
  totalBranches: number;
  onBranchChange: (index: number) => void;
}

export function Branch({
  currentBranchIndex,
  totalBranches,
  onBranchChange,
  className,
  ...props
}: BranchProps) {
  if (totalBranches <= 1) return null;

  return (
    <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)} {...props}>
      <Button
        variant="ghost"
        size="icon"
        className="size-5"
        disabled={currentBranchIndex === 0}
        onClick={() => onBranchChange(currentBranchIndex - 1)}
      >
        <ChevronLeft className="size-3" />
      </Button>
      <span>
        {currentBranchIndex + 1} / {totalBranches}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-5"
        disabled={currentBranchIndex === totalBranches - 1}
        onClick={() => onBranchChange(currentBranchIndex + 1)}
      >
        <ChevronRight className="size-3" />
      </Button>
    </div>
  );
}

