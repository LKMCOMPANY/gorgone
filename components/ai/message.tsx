"use client";

import * as React from "react";
import { User as UserIcon, Bot } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from: "user" | "assistant" | "system";
  avatar?: string;
  name?: string;
}

export function Message({ from, avatar, name, children, className, ...props }: MessageProps) {
  const isUser = from === "user";
  const isSystem = from === "system";

  if (isSystem) {
    return (
      <div className={cn("flex w-full justify-center py-4", className)} {...props}>
        <div className="rounded-lg bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex w-full gap-4 py-4 md:px-2",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
      {...props}
    >
      {/* Avatar */}
      <div className={cn("flex shrink-0 flex-col items-center gap-1")}>
        <Avatar className={cn("size-8 border shadow-sm", isUser ? "bg-muted" : "bg-primary/10")}>
          {avatar && <AvatarImage src={avatar} alt={name || from} />}
          <AvatarFallback className="bg-transparent">
            {isUser ? (
              <UserIcon className="size-4 text-muted-foreground" />
            ) : (
              <div className="relative size-5">
                <Image
                  src="/GorgoneBlack.svg"
                  alt="Gorgone"
                  fill
                  className="object-contain dark:hidden"
                />
                <Image
                  src="/GorgoneWhite.svg"
                  alt="Gorgone"
                  fill
                  className="object-contain hidden dark:block"
                />
              </div>
            )}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content Wrapper */}
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-2 min-w-0",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Name (optional) */}
        {name && (
          <span className="text-xs text-muted-foreground px-1">
            {name}
          </span>
        )}

        {/* Message Bubble / Text Area */}
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl px-4 py-3 shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted/30 text-foreground border border-border/50"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function MessageContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 text-sm w-full max-w-none", className)}
      {...props}
    />
  );
}
