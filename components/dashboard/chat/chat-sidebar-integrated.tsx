"use client";

import * as React from "react";
import { useChat as useAIChat } from "ai/react";
import { MessageSquare, X, ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useChat } from "./chat-provider";
import { useCurrentZone } from "@/hooks/use-current-zone";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { cn } from "@/lib/utils";
import type { Zone } from "@/types";

interface ChatSidebarIntegratedProps {
  zones: Zone[];
}

export function ChatSidebarIntegrated({ zones }: ChatSidebarIntegratedProps) {
  const { isOpen, close } = useChat();
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-detect current zone from URL
  const detectedZone = useCurrentZone(zones);

  // Allow manual override
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize selected zone on mount
  React.useEffect(() => {
    if (!isInitialized && detectedZone) {
      setSelectedZoneId(detectedZone.id);
      setIsInitialized(true);
    }
  }, [isInitialized, detectedZone]);

  // Update selected zone when URL changes (only when sidebar closed)
  React.useEffect(() => {
    if (detectedZone && !isOpen && detectedZone.id !== selectedZoneId) {
      setSelectedZoneId(detectedZone.id);
    }
  }, [detectedZone, isOpen, selectedZoneId]);

  const activeZone = React.useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || detectedZone || zones[0],
    [zones, selectedZoneId, detectedZone]
  );

  // Don't render if no zone available
  if (!activeZone) return null;

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setInput,
    setMessages,
    error,
  } = useAIChat({
    api: "/api/chat",
    body: {
      zoneId: activeZone.id,
    },
    id: `chat-${activeZone.id}`,
    onError: (error) => {
      console.error("[Chat] Error:", error);
    },
    onResponse: (response) => {
      console.log("[Chat] Response received:", response.status);
    },
  });

  // Reset conversation when zone changes
  React.useEffect(() => {
    setMessages([]);
  }, [activeZone.id, setMessages]);

  // New conversation handler
  const handleNewConversation = React.useCallback(() => {
    setMessages([]);
    setInput("");
  }, [setMessages, setInput]);

  const handleQuickAction = React.useCallback(
    (query: string) => {
      setInput(query);
      setTimeout(() => {
        handleSubmit(new Event("submit") as any);
      }, 100);
    },
    [setInput, handleSubmit]
  );

  // Debug logging
  React.useEffect(() => {
    console.log("[Chat] Active Zone:", activeZone.name, activeZone.id);
    console.log("[Chat] Messages count:", messages.length);
    console.log("[Chat] Is loading:", isLoading);
    if (error) console.error("[Chat] Error state:", error);
  }, [activeZone, messages.length, isLoading, error]);

  return (
    <>
      {/* Desktop: Integrated Sidebar (NO overlay, only on desktop) */}
      {!isMobile && (
        <div
          className={cn(
            "fixed right-0 top-0 z-30 flex h-screen flex-col border-l border-border glass",
            "transition-transform duration-300 ease-in-out",
            "shadow-xl",
            isOpen ? "translate-x-0" : "translate-x-full"
          )}
          style={{ width: "clamp(360px, 28vw, 480px)" }}
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
              <MessageSquare className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">AL-IA</h2>

              {/* Zone Selector */}
              {zones.length > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Analyzing:
                  </span>
                  <Select value={activeZone.id} onValueChange={setSelectedZoneId}>
                    <SelectTrigger className="h-6 w-auto border-none bg-muted/50 px-2 text-xs hover:bg-muted transition-colors duration-[var(--transition-fast)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Badge variant="secondary" className="h-6 text-xs">
                  {activeZone.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* New Conversation Button (only show if messages exist) */}
            {messages.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNewConversation}
                      className="size-8 transition-colors duration-[var(--transition-fast)]"
                    >
                      <RotateCcw className="size-4" />
                      <span className="sr-only">New conversation</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>New conversation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              className="size-8 transition-colors duration-[var(--transition-fast)]"
            >
              <X className="size-4" />
              <span className="sr-only">Close chat</span>
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              onQuickAction={handleQuickAction}
            />
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 pb-4 pt-2">
          <ChatInput
            zoneId={activeZone.id}
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
      )}

      {/* Mobile: Sheet Overlay (only on mobile) */}
      <Sheet open={isOpen && isMobile} onOpenChange={(open) => !open && close()}>
        <SheetContent
          side="right"
          className="w-full p-0"
          aria-describedby="chat-description-mobile"
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
                    <MessageSquare className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <SheetTitle className="scroll-m-20 text-xl font-semibold tracking-tight">AL-IA</SheetTitle>
                    <SheetDescription id="chat-description-mobile" className="sr-only">
                      AI-powered chat for analyzing zone data
                    </SheetDescription>

                  {zones.length > 1 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Analyzing:
                      </span>
                      <Select
                        value={activeZone.id}
                        onValueChange={setSelectedZoneId}
                      >
                        <SelectTrigger className="h-7 w-auto border-none bg-muted/50 px-2 text-sm hover:bg-muted transition-colors duration-[var(--transition-fast)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              {z.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="w-fit">
                      {activeZone.name}
                    </Badge>
                  )}
                  </div>
                </div>

                {/* New Conversation Button (mobile) */}
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNewConversation}
                    className="size-8 flex-shrink-0 transition-colors duration-[var(--transition-fast)]"
                  >
                    <RotateCcw className="size-4" />
                    <span className="sr-only">New conversation</span>
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <ChatMessages
                  messages={messages}
                  isLoading={isLoading}
                  onQuickAction={handleQuickAction}
                />
              </ScrollArea>
            </div>

            <div className="border-t border-border px-4 pb-4 pt-2">
              <ChatInput
                zoneId={activeZone.id}
                value={input}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

