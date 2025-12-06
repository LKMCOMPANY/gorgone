"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Loader2, CheckCircle2, XCircle, Terminal } from "lucide-react";

interface ToolProps {
  name: string;
  status: "pending" | "in-progress" | "complete" | "error";
  input?: any;
  output?: any;
  error?: string;
  defaultOpen?: boolean;
  className?: string;
}

export function Tool({
  name,
  status,
  input,
  output,
  error,
  defaultOpen = false,
  className,
}: ToolProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  // Auto-open on error or if it's just finished
  React.useEffect(() => {
    if (status === "error" || status === "complete") {
      // Optional: auto-open logic if desired, but usually we keep it collapsed unless error
      if (status === "error") setIsOpen(true);
    }
  }, [status]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("w-full rounded-md border bg-card text-card-foreground shadow-sm", className)}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex size-6 items-center justify-center rounded-md border",
            status === "pending" && "bg-muted text-muted-foreground",
            status === "in-progress" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
            status === "complete" && "bg-green-500/10 text-green-500 border-green-500/20",
            status === "error" && "bg-red-500/10 text-red-500 border-red-500/20",
          )}>
            <Terminal className="size-3" />
          </div>
          <span className="text-sm font-medium">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          {status === "in-progress" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          {status === "complete" && <CheckCircle2 className="size-3.5 text-green-500" />}
          {status === "error" && <XCircle className="size-3.5 text-red-500" />}
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
          {/* Input */}
          {input && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Input</span>
              <pre className="overflow-x-auto rounded-md bg-background border p-2 text-xs font-mono text-muted-foreground">
                {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Output */}
          {output && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Result</span>
              <div className="rounded-md bg-background border p-2 text-xs overflow-hidden">
                {output}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-red-500">Error</span>
              <pre className="overflow-x-auto rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-2 text-xs font-mono text-red-600 dark:text-red-400">
                {error}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
