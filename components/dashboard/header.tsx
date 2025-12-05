"use client";

import { Menu, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useChat } from "@/components/dashboard/chat/chat-provider";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 lg:h-16 lg:px-6">
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
          
          {/* App Title */}
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            {APP_NAME}
          </h2>
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
