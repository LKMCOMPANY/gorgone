"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SuggestionProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function Suggestion({ suggestions, onSelect, className }: SuggestionProps) {
  if (!suggestions?.length) return null;

  return (
    <ScrollArea className={cn("w-full whitespace-nowrap pb-2", className)}>
      <div className="flex w-max gap-2 px-1">
        {suggestions.map((suggestion, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion)}
            className="h-8 rounded-full bg-background/50 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:text-accent-foreground transition-all shadow-sm"
          >
            {suggestion}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
