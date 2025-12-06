"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Circle, Clock, FileText, ChevronDown, ListTodo } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "completed" | "error";
  file?: string;
}

interface TaskProps {
  title: string;
  items: TaskItem[];
  defaultOpen?: boolean;
  className?: string;
}

export function Task({ title, items, defaultOpen = true, className }: TaskProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const completedCount = items.filter(i => i.status === "completed").length;
  const totalCount = items.length;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("w-full rounded-lg border bg-card", className)}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ListTodo className="size-4" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} completed
            </div>
          </div>
        </div>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              {item.status === "completed" ? (
                <CheckCircle2 className="size-4 text-green-500 shrink-0" />
              ) : item.status === "in-progress" ? (
                <div className="size-4 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              ) : item.status === "error" ? (
                <div className="size-4 shrink-0 rounded-full border-2 border-red-500 bg-red-500" />
              ) : (
                <Circle className="size-4 text-muted-foreground/30 shrink-0" />
              )}
              
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className={cn(
                  "truncate",
                  item.status === "completed" && "text-muted-foreground line-through",
                  item.status === "in-progress" && "text-foreground font-medium"
                )}>
                  {item.title}
                </span>
                {item.file && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    <FileText className="size-3" />
                    {item.file}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

