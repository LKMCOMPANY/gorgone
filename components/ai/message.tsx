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
        "group flex gap-3 w-full py-2", // Reduced padding, removed flex-row-reverse logic
        className
      )}
      {...props}
    >
      {/* Avatar - Always on left */}
      <Avatar className={cn("size-8 shrink-0", !isUser && "bg-primary/10 shadow-sm")}>
        {avatar && <AvatarImage src={avatar} alt={name || from} />}
        <AvatarFallback className={cn(!isUser && "bg-transparent")}>
          {isUser ? (
            <UserIcon className="size-4" />
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

      {/* Content Wrapper */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Name (optional) */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {isUser ? "You" : "Gorgone AI"}
          </span>
        </div>

        {/* Message Content - No bubbles, clean text */}
        <div className="text-sm leading-relaxed text-foreground/90">
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
