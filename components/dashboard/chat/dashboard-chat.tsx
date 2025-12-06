"use client";

import * as React from "react";
import { useChat as useAIChat } from "ai/react";
import { MessageSquare, Sparkles, ChevronDown } from "lucide-react";
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
import { AuroraBackground } from "@/components/ui/aurora-background";

interface DashboardChatProps {
  zones: Zone[];
}

export function DashboardChat({ zones }: DashboardChatProps) {
  // Auto-detect current zone
  const detectedZone = useCurrentZone(zones);
  
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(
    detectedZone?.id || (zones.length > 0 ? zones[0].id : null)
  );

  const activeZone = React.useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || zones[0],
    [zones, selectedZoneId]
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    reload,
  } = useAIChat({
    api: "/api/chat",
    body: {
      zoneId: activeZone?.id,
    },
    id: `dashboard-chat-${activeZone?.id}`,
    onError: (error) => {
      console.error("[Chat] Error:", error);
    },
  });

  // Common suggestions
  const suggestions = [
    "Analyze the latest trends in this zone",
    "Summarize sentiment for the last 24 hours",
    "Identify key influencers discussing this topic",
    "Compare engagement across platforms"
  ];

  const handleSuggestionClick = (suggestion: string) => {
    append({
      role: "user",
      content: suggestion,
    });
  };

  if (!activeZone) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No zones available. Please create a zone to start monitoring.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <AuroraBackground showRadialGradient={true} className="opacity-60" />
      </div>

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
                      onClick={() => handleSuggestionClick(s)}
                    >
                      <Sparkles className="size-4 mr-3 text-primary shrink-0" />
                      <span className="text-sm">{s}</span>
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
              onQuickAction={(q) => append({ role: "user", content: q })}
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
                 suggestions={suggestions.slice(0, 3)} 
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
