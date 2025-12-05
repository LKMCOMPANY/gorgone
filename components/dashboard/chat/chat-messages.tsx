"use client";

import * as React from "react";
import { Conversation, ConversationContent, ConversationEmpty } from "@/components/ai/conversation";
import { Message, MessageContent } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Tool } from "@/components/ai/tool";
import { Loader } from "@/components/ai/loader";
import { ChatQuickActions } from "./chat-quick-actions";
import { ChatChart } from "./chat-chart";
import type { Message as AIMessage } from "ai";

interface ChatMessagesProps {
  messages: AIMessage[];
  isLoading: boolean;
  onQuickAction?: (query: string) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  onQuickAction,
}: ChatMessagesProps) {
  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <ConversationEmpty
        title="Start a conversation"
        description="Ask questions about your monitored data"
      >
        <ChatQuickActions show={true} onSelect={onQuickAction} />
      </ConversationEmpty>
    );
  }

  return (
    <ConversationContent>
      {messages.map((message) => (
        <Message key={message.id} from={message.role as "user" | "assistant"}>
          <MessageContent>
            {/* Tool Invocations */}
            {(message as any).toolInvocations?.map((tool: any, idx: number) => {
              // Visualization tools
              if (tool.state === "result" && tool.result?._type === "visualization") {
                return (
                  <ChatChart
                    key={idx}
                    type={tool.result.chart_type}
                    title={tool.result.title}
                    data={tool.result.data}
                    config={tool.result.config}
                  />
                );
              }

              // Regular tools
              return (
                <Tool
                  key={idx}
                  name={tool.toolName}
                  status={
                    tool.state === "result"
                      ? "complete"
                      : tool.state === "partial-call"
                        ? "in-progress"
                        : "pending"
                  }
                  defaultOpen={false}
                >
                  {tool.state === "result" && tool.result && (
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  )}
                </Tool>
              );
            })}

            {/* Message Content */}
            {message.content && (
              <Response showCopy={message.role === "assistant"}>
                {message.content}
              </Response>
            )}
          </MessageContent>
        </Message>
      ))}

      {/* Loading Indicator */}
      {isLoading && messages.length > 0 && (
        <Message from="assistant">
          <Loader text="Analyzing your data..." />
        </Message>
      )}
    </ConversationContent>
  );
}


