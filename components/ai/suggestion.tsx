"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SuggestionProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function Suggestion({ children, onClick, icon, className }: SuggestionProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-auto justify-start gap-3 p-3 glass",
        "hover:bg-accent/50 hover:shadow-sm",
        "transition-all duration-[var(--transition-fast)]",
        className
      )}
    >
      {icon && (
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0 shadow-sm">
          {icon}
        </div>
      )}
      <span className="text-sm text-left flex-1">{children}</span>
    </Button>
  );
}

interface SuggestionsProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Suggestions({ children, title, className }: SuggestionsProps) {
  return (
    <div className={cn("border-t border-border bg-muted/20 p-4", className)}>
      {title && (
        <p className="text-sm font-medium mb-3">{title}</p>
      )}
      <div className="grid gap-2">
        {children}
      </div>
    </div>
  );
}

