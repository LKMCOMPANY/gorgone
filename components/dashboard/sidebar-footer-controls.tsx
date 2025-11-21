"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/app/actions/auth";
import { getRoleName } from "@/lib/auth/permissions";
import type { User } from "@/types";

interface SidebarFooterControlsProps {
  user: User;
}

export function SidebarFooterControls({ user }: SidebarFooterControlsProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  const handleLogout = async () => {
    await logout();
  };

  const initials = user.email.split("@")[0].substring(0, 2).toUpperCase();

  return (
    <div
      className={isCollapsed ? "flex flex-col items-center gap-2 py-2" : "flex items-center justify-between gap-2 px-2 py-2"}
    >
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.email}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {getRoleName(user.role)}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

