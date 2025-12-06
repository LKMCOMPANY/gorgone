"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookOpen, ChevronDown, ExternalLink } from "lucide-react";

interface Source {
  title: string;
  url: string;
}

interface SourcesProps {
  sources: Source[];
  className?: string;
}

export function Sources({ sources, className }: SourcesProps) {
  if (!sources?.length) return null;

  return (
    <Collapsible className={cn("my-2", className)}>
      <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-muted/50 px-3 py-1.5 rounded-full w-fit">
        <BookOpen className="size-3.5" />
        <span>{sources.length} Sources</span>
        <ChevronDown className="size-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {sources.map((source, idx) => (
            <a
              key={idx}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
            >
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                <span className="text-xs font-bold">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-foreground/90 group-hover:text-primary transition-colors">
                  {source.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {new URL(source.url).hostname}
                </p>
              </div>
              <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

