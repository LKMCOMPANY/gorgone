"use client";

import * as React from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, Newspaper, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentZone } from "@/hooks/use-current-zone";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { cn } from "@/lib/utils";
import type { Zone } from "@/types";
import { Conversation, ConversationEmpty } from "@/components/ai/conversation";
import { Suggestion } from "@/components/ai/suggestion";

interface DashboardChatProps {
  zones: Zone[];
  variant?: "full" | "sheet";
}

export function DashboardChat({ zones, variant = "full" }: DashboardChatProps) {
  // Auto-detect current zone
  const detectedZone = useCurrentZone(zones);
  
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(
    detectedZone?.id || (zones.length > 0 ? zones[0].id : null)
  );

  const activeZone = React.useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || zones[0],
    [zones, selectedZoneId]
  );

  const chatId = `dashboard-chat-${activeZone?.id}`;

  // Default chat transport with UI message support (server returns toUIMessageStreamResponse())
  // This enables tool results (OpinionReportView, TweetCards, etc.) to be rendered
  const transport = React.useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/chat",
      body: {
        zoneId: activeZone?.id,
      },
    });
  }, [activeZone?.id]);

  const {
    messages,
    sendMessage,
    regenerate,
    status,
    error: _error, // Used for error handling below
    clearError,
  } = useAIChat({
    id: chatId,
    transport,
    onError: (error) => {
      console.error("[Chat] Error:", error);
    },
  });

  const [input, setInput] = React.useState("");

  // Reset input when switching zones (fresh context).
  React.useEffect(() => {
    setInput("");
    // Clear any lingering error state on zone switch.
    clearError();
  }, [chatId, clearError]);

  const isLoading = status === "submitted" || status === "streaming";

  // X (Twitter) icon component
  const XIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  // Common suggestions (English only - UI language)
  type SuggestionItem = { text: string; icon?: React.ReactNode };
  const suggestions: SuggestionItem[] = [
    { text: "Generate a complete opinion report", icon: <XIcon className="size-4" /> },
    { text: "Show top tweets by engagement (24h)", icon: <XIcon className="size-4" /> },
    { text: "Generate a media coverage report", icon: <Newspaper className="size-4" /> },
    { text: "Show top influencers by engagement (24h)", icon: <Users className="size-4" /> },
  ];

  const handleSuggestionClick = (suggestion: string) => {
    void sendMessage({ text: suggestion });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    void sendMessage({ text });
  };

  const reload = () => {
    void regenerate();
  };

  if (!activeZone) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No zones available. Please create a zone to start monitoring.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full w-full relative overflow-hidden", variant === "full" ? "bg-background" : "bg-transparent")}>
      {/* Aurora Background - Only for full dashboard view */}
      {variant === "full" && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -inset-[10px] opacity-[0.15] dark:opacity-[0.12] blur-3xl animate-aurora"
            style={{
              background: `
                radial-gradient(ellipse 800px 600px at 50% 0%, oklch(0.62 0.24 285 / 0.8) 0%, transparent 50%),
                radial-gradient(ellipse 600px 500px at 0% 50%, oklch(0.72 0.15 220 / 0.6) 0%, transparent 50%),
                radial-gradient(ellipse 600px 500px at 100% 50%, oklch(0.70 0.18 150 / 0.6) 0%, transparent 50%)
              `
            }}
          />
          {/* Radial mask for focus */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />
        </div>
      )}

      {/* Floating Zone Selector (Top Left) - Minimal & Integrated */}
      {zones.length > 1 && (
        <div className="absolute top-4 left-4 z-20">
          <Select value={activeZone.id} onValueChange={setSelectedZoneId}>
            <SelectTrigger className="h-8 w-auto min-w-[120px] border-none bg-background/50 backdrop-blur-sm hover:bg-accent/50 transition-colors shadow-sm gap-2 rounded-full px-3">
              <span className="text-xs font-medium text-muted-foreground">Zone:</span>
              <SelectValue className="text-xs font-semibold" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id} className="text-xs">
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Conversation Area - Full Height & Scrollable */}
      <div className="flex-1 overflow-hidden relative z-10">
        <Conversation className="h-full">
          {messages.length === 0 ? (
            <ConversationEmpty 
              title="" // Removed title as requested
              description="" // Removed description as requested
              className="bg-transparent"
            >
              <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="mb-8 space-y-2 text-center">
                   <h2 className="text-2xl font-bold tracking-tight">
                     {activeZone.name}
                   </h2>
                   <p className="text-muted-foreground">
                     Ready to analyze your data.
                   </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                  {suggestions.map((s, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start h-auto py-4 px-4 text-left whitespace-normal bg-background/40 backdrop-blur-md hover:bg-background/60 border-white/10 transition-all shadow-sm"
                      onClick={() => handleSuggestionClick(s.text)}
                    >
                      <span className="mr-3 text-primary shrink-0">
                        {s.icon || <Sparkles className="size-4" />}
                      </span>
                      <span className="text-sm">{s.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </ConversationEmpty>
          ) : (
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              reload={reload}
              onQuickAction={(q) => void sendMessage({ text: q })}
            />
          )}
        </Conversation>
      </div>

      {/* Input Area - Floating/Glassmorphism at bottom */}
      <div className="shrink-0 p-4 sm:p-6 bg-transparent relative z-20">
        <div className="mx-auto max-w-3xl w-full relative">
          {/* Contextual Suggestions */}
          {messages.length > 0 && !isLoading && (
             <div className="absolute -top-12 left-0 right-0 flex justify-center">
               <Suggestion 
                 suggestions={suggestions.slice(0, 3).map(s => s.text)} 
                 onSelect={handleSuggestionClick}
                 className="max-w-full"
               />
             </div>
          )}
          
          <div className="relative rounded-2xl border bg-background/50 backdrop-blur-xl shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-shadow focus-within:shadow-xl focus-within:ring-primary/20">
            <ChatInput
              zoneId={activeZone.id}
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              placeholder={`Message ${activeZone.name}...`}
            />
          </div>
          
          <div className="mt-2 text-center">
             <span className="text-[10px] text-muted-foreground/60">
               AI Monitoring can make mistakes. Verify important info.
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}
