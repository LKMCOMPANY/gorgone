"use client";

import * as React from "react";
import { Bot, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageProps {
  from: "user" | "assistant" | "system";
  children: React.ReactNode;
  className?: string;
}

export function Message({ from, children, className }: MessageProps) {
  const isUser = from === "user";
  const isSystem = from === "system";

  if (isSystem) {
    return (
      <div className={cn("my-4 text-center text-sm text-muted-foreground", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("group flex gap-3 max-w-full", className)}>
      {/* Avatar */}
      <Avatar className={cn("size-8 shrink-0", !isUser && "bg-primary/10 shadow-sm")}>
        <AvatarFallback className={cn(!isUser && "bg-transparent")}>
          {isUser ? (
            <UserIcon className="size-4" />
          ) : (
            <Bot className="size-4 text-primary" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

interface MessageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MessageContent({ children, className }: MessageContentProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {children}
    </div>
  );
}

