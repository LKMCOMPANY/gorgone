"use client";

import { Menu, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_NAME } from "@/lib/constants";
import { GorgoneEye } from "@/components/ui/gorgone-eye";
import type { User } from "@/types";

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 transition-all duration-300">
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
          {/* Theme Toggle - Hidden temporarily to force dark mode */}
          {/* <ThemeToggle /> */}
        </div>
      </div>
    </header>
  );
}
