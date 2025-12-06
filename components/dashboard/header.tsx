"use client";

import { Menu, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useChat } from "@/components/dashboard/chat/chat-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_NAME } from "@/lib/constants";
import { GorgoneEye } from "@/components/ui/gorgone-eye";
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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex h-14 items-center justify-between px-4 lg:h-16 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="transition-colors duration-[var(--transition-fast)]"
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>

        {/* Center: Logo Eye */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-6 w-24">
            <GorgoneEye className="h-full w-full" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Chat Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleChatToggle}
            className="transition-colors duration-[var(--transition-fast)]"
          >
            <MessageSquare className="size-5" />
            <span className="sr-only">Open chat</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
