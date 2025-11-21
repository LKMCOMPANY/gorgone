"use client";

import * as React from "react";
import { Bot, User as UserIcon, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatQuickActions } from "./chat-quick-actions";
import { MessageContent } from "./message-content";
import { cn } from "@/lib/utils";
import type { Message } from "ai";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onQuickAction?: (query: string) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  onQuickAction,
}: ChatMessagesProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return <ChatMessagesEmpty onQuickAction={onQuickAction} />;
  }

  return (
    <div ref={scrollRef} className="space-y-6 p-6 max-w-full overflow-x-hidden">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && messages.length > 0 && (
        <div className="flex gap-3 max-w-full">
          <Avatar className="h-8 w-8 flex-shrink-0 bg-primary/10">
            <AvatarFallback>
              <Bot className="h-4 w-4 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      )}
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className="group flex gap-3 max-w-full overflow-hidden">
      <Avatar className={cn("h-8 w-8 flex-shrink-0", !isUser && "bg-primary/10")}>
        <AvatarFallback>
          {isUser ? (
            <UserIcon className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4 text-primary" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        <MessageContent 
          content={message.content} 
          role={message.role}
          toolInvocations={(message as any).toolInvocations}
        />
      </div>
    </div>
  );
}

interface ChatMessagesEmptyProps {
  onQuickAction?: (query: string) => void;
}

function ChatMessagesEmpty({ onQuickAction }: ChatMessagesEmptyProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-body font-medium">Start a conversation</p>
            <p className="text-body-sm text-muted-foreground">
              Ask questions about your monitored data
            </p>
          </div>
        </div>
      </div>
      <ChatQuickActions show={true} onSelect={onQuickAction} />
    </div>
  );
}


