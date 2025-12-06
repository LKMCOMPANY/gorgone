"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, AlertCircle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ToolProps {
  name: string;
  status?: "pending" | "in-progress" | "complete" | "error";
  children?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const statusIcons = {
  pending: Loader2,
  "in-progress": Loader2,
  complete: CheckCircle2,
  error: AlertCircle,
};

const statusColors = {
  pending: "text-muted-foreground",
  "in-progress": "text-primary",
  complete: "text-[var(--tactical-green)]",
  error: "text-[var(--tactical-red)]",
};

const statusLabels = {
  pending: "Pending",
  "in-progress": "Running",
  complete: "Complete",
  error: "Error",
};

export function Tool({
  name,
  status = "complete",
  children,
  defaultOpen = false,
  className,
}: ToolProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const hasContent = Boolean(children);

  const StatusIcon = statusIcons[status];
  const isAnimated = status === "pending" || status === "in-progress";

  return (
    <div className={cn("rounded-xl border border-border bg-muted/30 overflow-hidden shadow-xs w-full max-w-full", className)}>
      {/* Header */}
      <button
        onClick={() => hasContent && setIsOpen(!isOpen)}
        disabled={!hasContent}
        className={cn(
          "w-full max-w-full flex items-center gap-3 p-3 text-left transition-colors duration-[var(--transition-fast)]",
          hasContent && "hover:bg-muted/50 cursor-pointer"
        )}
      >
        {/* Icon */}
        <div className="shrink-0 flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Wrench className="size-3.5 text-primary" />
        </div>

        {/* Tool Name */}
        <div className="flex-1 min-w-0">
          <p className="text-[7px] font-mono text-muted-foreground/60 truncate uppercase tracking-widest opacity-50">{name}</p>
        </div>

        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className={cn(
            "shrink-0 gap-1.5 transition-colors duration-[var(--transition-fast)] text-xs h-5 px-2",
            statusColors[status]
          )}
        >
          <StatusIcon className={cn("size-2.5", isAnimated && "animate-spin")} />
          <span className="text-[10px]">{statusLabels[status]}</span>
        </Badge>

        {/* Expand Icon */}
        {hasContent && (
          <div className="shrink-0">
            {isOpen ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
          </div>
        )}
      </button>

      {/* Content */}
      {hasContent && isOpen && (
        <div className="border-t border-border bg-muted/20 p-3 w-full max-w-full overflow-hidden">
          <div className="text-xs text-muted-foreground break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

