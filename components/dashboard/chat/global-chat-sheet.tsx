"use client";

import * as React from "react";
import { DashboardChat } from "./dashboard-chat";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Keyboard, X } from "lucide-react";
import { usePathname } from "next/navigation";
import type { Zone } from "@/types";

interface GlobalChatSheetProps {
  zones: Zone[];
}

export function GlobalChatSheet({ zones }: GlobalChatSheetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();

  // Hide on the dedicated AI Monitoring page to avoid duplication
  const isMonitoringPage = pathname === "/dashboard";

  // Keyboard shortcut listener (Cmd+J, Cmd+K, or Space)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+J or Cmd+K to toggle chat
      if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "k")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Space to open chat (only if not in an input/textarea and chat is closed)
      if (e.key === " " && !isOpen) {
        const target = e.target as HTMLElement;
        const isInputField = 
          target.tagName === "INPUT" || 
          target.tagName === "TEXTAREA" || 
          target.isContentEditable;
        
        if (!isInputField) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (isMonitoringPage) return null;

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <Button
          size="icon"
          className="size-12 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all duration-300 group relative"
          onClick={() => setIsOpen(true)}
          title="Open AI Assistant (⌘J or Space)"
        >
          <Keyboard className="size-6" />
          <span className="sr-only">Open AI Assistant (Cmd+J or Space)</span>
        </Button>
      </div>

      {/* Chat Sheet Overlay */}
      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-xl p-0 border-l border-white/10 shadow-2xl sm:rounded-l-2xl overflow-hidden bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 pointer-events-auto"
        >
          {/* Custom Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-50 h-8 w-8 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-md border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>

          {/* Hidden Title/Description for Accessibility */}
          <div className="sr-only">
            <SheetTitle>AI Assistant</SheetTitle>
            <SheetDescription>
              A floating AI assistant to help you analyze your data across the platform.
            </SheetDescription>
          </div>

          <div className="h-full flex flex-col bg-transparent">
             <DashboardChat zones={zones} variant="sheet" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

