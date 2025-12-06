"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationProps {
  children: React.ReactNode;
  className?: string;
}

export function Conversation({ children, className }: ConversationProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {children}
    </div>
  );
}

interface ConversationContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ConversationContent({ children, className }: ConversationContentProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [children]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden space-y-4 p-4 scrollbar-thin",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ConversationEmptyProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function ConversationEmpty({
  children,
  title = "Start a conversation",
  description = "Ask a question to get started",
  className,
}: ConversationEmptyProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
            <MessageSquare className="size-7 text-primary" />
          </div>
          
          {/* Text */}
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {description}
            </p>
          </div>
        </div>
      </div>
      
      {/* Quick Actions or other content */}
      {children}
    </div>
  );
}

