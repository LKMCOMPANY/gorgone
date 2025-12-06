"use client";

import * as React from "react";
import { ConversationContent } from "@/components/ai/conversation";
import { Message, MessageContent } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Tool } from "@/components/ai/tool";
import { Loader } from "@/components/ai/loader";
import { Actions, ActionButton } from "@/components/ai/actions";
import { ChatChart } from "./chat-chart";
import type { Message as AIMessage } from "ai";
import { Copy, RefreshCw } from "lucide-react";

interface ChatMessagesProps {
  messages: AIMessage[];
  isLoading: boolean;
  onQuickAction?: (query: string) => void;
  reload?: () => void;
}

export function ChatMessages({
  messages,
  isLoading,
  reload,
}: ChatMessagesProps) {
  if (messages.length === 0 && !isLoading) {
    return null;
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <ConversationContent>
      <div className="max-w-3xl mx-auto space-y-6 pb-4">
        {messages.map((message, i) => {
          const isLast = i === messages.length - 1;
          
          return (
            <Message key={message.id} from={message.role as "user" | "assistant"}>
              <MessageContent>
                {/* Tool Invocations */}
                {(message as any).toolInvocations?.map((tool: any, idx: number) => {
                  // Visualization tools
                  if (tool.state === "result" && tool.result?._type === "visualization") {
                    return (
                      <div key={idx} className="my-4 w-full">
                        <ChatChart
                          type={tool.result.chart_type}
                          title={tool.result.title}
                          data={tool.result.data}
                          config={tool.result.config}
                        />
                      </div>
                    );
                  }

                  // Regular tools
                  return (
                    <div key={idx} className="my-2">
                      <Tool
                        name={tool.toolName}
                        status={
                          tool.state === "result"
                            ? "complete"
                            : tool.state === "partial-call"
                              ? "in-progress"
                              : tool.state === "error" 
                                ? "error" 
                                : "pending"
                        }
                        input={tool.args}
                        output={
                          tool.state === "result" ? (
                             <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                               {typeof tool.result === 'string' 
                                 ? tool.result 
                                 : JSON.stringify(tool.result, null, 2)}
                             </pre>
                          ) : null
                        }
                        defaultOpen={false}
                      />
                    </div>
                  );
                })}

                {/* Message Content */}
                {message.content && (
                  <>
                    <Response showCopy={false}>
                      {message.content}
                    </Response>
                    
                    {message.role === "assistant" && !isLoading && (
                      <Actions>
                        <ActionButton 
                          label="Copy" 
                          tooltip="Copy to clipboard"
                          icon={<Copy className="size-3.5" />}
                          onClick={() => handleCopy(message.content)} 
                        />
                        {isLast && reload && (
                          <ActionButton 
                            label="Regenerate" 
                            tooltip="Regenerate response"
                            icon={<RefreshCw className="size-3.5" />} 
                            onClick={reload} 
                          />
                        )}
                      </Actions>
                    )}
                  </>
                )}
              </MessageContent>
            </Message>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <Message from="assistant">
            <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
               <Loader size={16} />
               <span>Thinking...</span>
            </div>
          </Message>
        )}
      </div>
    </ConversationContent>
  );
}
