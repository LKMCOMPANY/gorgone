"use client";

import { Menu, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useChat } from "@/components/dashboard/chat/chat-provider";
import { APP_NAME } from "@/lib/constants";
import type { User } from "@/types";

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const { toggleSidebar, open: openSidebar, setOpen: setSidebarOpen } = useSidebar();
  const { toggle: toggleChat, open: openChat, isOpen: isChatOpen } = useChat();

  // Auto-close sidebar when opening chat on desktop
  const handleChatToggle = () => {
    if (!isChatOpen && window.innerWidth >= 1024) {
      // Closing sidebar on desktop to make room for chat
      setSidebarOpen(false);
    }
    toggleChat();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 lg:h-16">
        <div className="flex items-center gap-2">
          {/* Menu toggle - Always visible, before title */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="transition-colors duration-[150ms]"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            {APP_NAME}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Chat Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleChatToggle}
            className="transition-colors duration-[150ms]"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="sr-only">Open chat</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
