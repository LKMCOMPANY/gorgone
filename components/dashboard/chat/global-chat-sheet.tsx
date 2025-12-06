"use client";

import * as React from "react";
import { DashboardChat } from "./dashboard-chat";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
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

  // Keyboard shortcut listener (Cmd+J or Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "k")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isMonitoringPage) return null;

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          className="size-12 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all duration-300"
          onClick={() => setIsOpen(true)}
        >
          <MessageSquarePlus className="size-6" />
          <span className="sr-only">Open AI Assistant</span>
        </Button>
      </div>

      {/* Chat Sheet Overlay */}
      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-xl p-0 border-l border-white/10 shadow-2xl sm:rounded-l-2xl overflow-hidden bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 pointer-events-auto"
        >
          {/* Hidden Title/Description for Accessibility */}
          <div className="sr-only">
            <SheetTitle>AI Assistant</SheetTitle>
            <SheetDescription>
              A floating AI assistant to help you analyze your data across the platform.
            </SheetDescription>
          </div>

          <div className="h-full flex flex-col bg-transparent">
             <DashboardChat zones={zones} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

