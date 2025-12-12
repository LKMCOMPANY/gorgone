"use client";

import * as React from "react";
import { ConversationContent } from "@/components/ai/conversation";
import { Message, MessageContent } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Tool } from "@/components/ai/tool";
import { Loader } from "@/components/ai/loader";
import { Actions, ActionButton } from "@/components/ai/actions";
import { ChatChart } from "./chat-chart";
import { Copy, RefreshCw } from "lucide-react";

type VisualizationPayload = {
  _type: "visualization";
  chart_type: "line" | "bar" | "area";
  title: string;
  data: Array<{ timestamp: string; value: number; label: string }>;
  config: Record<string, { label: string; color?: string }>;
};

// Use the return type of useChat from ai/react
interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant" | "data";
  content?: string;
  parts?: Array<{
    type: string;
    text?: string;
    toolName?: string;
    toolCallId?: string;
    args?: Record<string, unknown>;
    result?: unknown;
    state?: string;
  }>;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onQuickAction?: (query: string) => void;
  reload?: () => void;
}

// Helper to extract text content from message parts
function getMessageText(message: ChatMessage): string {
  // Legacy: if message has content string, use it
  if (message.content) {
    return message.content;
  }
  
  // SDK 5.x: extract text from parts
  if (message.parts) {
    return message.parts
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text)
      .join("");
  }
  
  return "";
}

function extractVisualizationFromText(text: string): {
  visualization?: VisualizationPayload;
  cleanedText: string;
} {
  if (!text) return { cleanedText: "" };

  const marker = "VISUALIZATION_JSON:";
  const markerIdx = text.indexOf(marker);
  if (markerIdx === -1) return { cleanedText: text };

  // Find the first ```json fence after the marker.
  const fenceStart = text.indexOf("```json", markerIdx);
  if (fenceStart === -1) return { cleanedText: text };

  const jsonStart = fenceStart + "```json".length;
  const fenceEnd = text.indexOf("```", jsonStart);
  if (fenceEnd === -1) return { cleanedText: text };

  const jsonText = text.slice(jsonStart, fenceEnd).trim();
  try {
    const parsed = JSON.parse(jsonText) as Partial<VisualizationPayload>;
    if (
      parsed &&
      parsed._type === "visualization" &&
      (parsed.chart_type === "line" ||
        parsed.chart_type === "bar" ||
        parsed.chart_type === "area") &&
      typeof parsed.title === "string" &&
      Array.isArray(parsed.data)
    ) {
      // Remove the marker + code block from the displayed text.
      const before = text.slice(0, markerIdx).trimEnd();
      const after = text.slice(fenceEnd + 3).trimStart();
      const cleanedText = [before, after].filter(Boolean).join("\n\n");
      return { visualization: parsed as VisualizationPayload, cleanedText };
    }
  } catch {
    // fall through
  }

  return { cleanedText: text };
}

// Helper to extract tool invocations from message parts
function getToolInvocations(message: ChatMessage): Array<{
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: string;
}> {
  if (message.parts) {
    return message.parts
      .filter((part) => part.type === "tool-invocation" || part.type === "tool-result")
      .map((part) => ({
        toolName: part.toolName || "",
        args: part.args || {},
        result: part.result,
        state: part.state || "pending",
      }));
  }
  
  // Legacy fallback for toolInvocations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacyInvocations = (message as any).toolInvocations;
  if (Array.isArray(legacyInvocations)) {
    return legacyInvocations;
  }
  
  return [];
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
          const rawTextContent = getMessageText(message);
          const { visualization, cleanedText: textContent } =
            extractVisualizationFromText(rawTextContent);
          const toolInvocations = getToolInvocations(message);
          
          // Skip data messages
          if (message.role === "data") {
            return null;
          }
          
          return (
            <Message key={message.id} from={message.role as "user" | "assistant"}>
              <MessageContent>
                {/* Visualization (text-stream fallback) */}
                {visualization && (
                  <div className="my-4 w-full">
                    <ChatChart
                      type={visualization.chart_type}
                      title={visualization.title}
                      data={visualization.data}
                      config={visualization.config}
                    />
                  </div>
                )}

                {/* Tool Invocations */}
                {toolInvocations.map((tool, idx) => {
                  // Visualization tools
                  const toolResult = tool.result as Record<string, unknown> | undefined;
                  if (tool.state === "result" && toolResult?._type === "visualization") {
                    return (
                      <div key={idx} className="my-4 w-full">
                        <ChatChart
                          type={toolResult.chart_type as "line" | "bar" | "area"}
                          title={toolResult.title as string}
                          data={toolResult.data as Array<{ timestamp: string; value: number; label: string }>}
                          config={toolResult.config as { [key: string]: { label: string; color?: string } }}
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
                {textContent && (
                  <>
                    <Response showCopy={false}>
                      {textContent}
                    </Response>
                    
                    {message.role === "assistant" && !isLoading && (
                      <Actions>
                        <ActionButton 
                          label="Copy" 
                          tooltip="Copy to clipboard"
                          icon={<Copy className="size-3.5" />}
                          onClick={() => handleCopy(textContent)} 
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
