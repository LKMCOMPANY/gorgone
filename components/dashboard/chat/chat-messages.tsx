"use client";

import * as React from "react";
import { ConversationContent } from "@/components/ai/conversation";
import { Message, MessageContent } from "@/components/ai/message";
import { Tool } from "@/components/ai/tool";
import { Loader } from "@/components/ai/loader";
import { Actions, ActionButton } from "@/components/ai/actions";
import { ChatChart } from "./chat-chart";
import { MemoizedReactMarkdown } from "@/components/ai/markdown";
import type { Message as AIMessage } from "ai";
import { Copy, RefreshCw } from "lucide-react";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

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

                {/* Message Content (Markdown) */}
                {message.content && (
                  <div className="relative group/content">
                    <div className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 text-sm max-w-none break-words prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-a:text-primary hover:prose-a:underline">
                      <MemoizedReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        components={{
                          p({ children }) {
                          return <p className="mb-2 last:mb-0 animate-in fade-in duration-300">{children}</p>;
                        },
                        code({ node, inline, className, children, ...props }: any) {
                          if (children.length) {
                            if (children[0] == '▍') {
                              return (
                                <span className="mt-1 animate-pulse cursor-default">▍</span>
                              )
                            }
                    
                            children[0] = (children[0] as string).replace('`▍`', '▍')
                          }

                          const match = /language-(\w+)/.exec(className || "");

                          if (inline) {
                            return (
                              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
                                {children}
                              </code>
                            );
                          }

                          return (
                            <div className="my-4 rounded-md bg-muted/50 p-4 overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </div>
                          );
                        },
                      }}
                    >
                      {message.content}
                    </MemoizedReactMarkdown>
                    </div>
                    
                    {message.role === "assistant" && !isLoading && (
                      <div className="mt-2 flex justify-start opacity-0 group-hover/content:opacity-100 transition-opacity">
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
                      </div>
                    )}
                  </div>
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
