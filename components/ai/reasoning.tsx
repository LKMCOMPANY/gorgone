"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, ChevronDown } from "lucide-react";

interface ReasoningProps {
  children: React.ReactNode;
  isStreaming?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export function Reasoning({ 
  children, 
  isStreaming = false, 
  defaultOpen = false,
  className 
}: ReasoningProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [duration, setDuration] = React.useState(0);
  const startTimeRef = React.useRef<number | null>(null);

  // Auto-open during streaming
  React.useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    }
  }, [isStreaming]);

  // Capture start time when streaming begins (avoid impure calls during render).
  React.useEffect(() => {
    if (isStreaming) {
      startTimeRef.current = Date.now();
      setDuration(0);
    } else {
      startTimeRef.current = null;
    }
  }, [isStreaming]);

  // Track duration
  React.useEffect(() => {
    if (!isStreaming) return;
    
    const interval = setInterval(() => {
      const start = startTimeRef.current;
      if (start == null) return;
      setDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("border-l-2 border-muted pl-4 my-2", className)}
    >
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Brain className="size-4" />
        <span>
          {isStreaming ? "Reasoning..." : `Thought for ${duration}s`}
        </span>
        <ChevronDown className={cn("size-3 transition-transform duration-200", isOpen && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 text-sm text-muted-foreground/80 italic">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

