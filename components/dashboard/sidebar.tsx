"use client";

import { LayoutDashboard, Users, ChevronUp, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isSuperAdmin, canManageZones, canViewSettings, getRoleName } from "@/lib/auth/permissions";
import { logout } from "@/app/actions/auth";
import type { UserRole, Zone, User } from "@/types";
import {
  BarChart3,
  FileText,
  Rss,
  Settings,
  Bot,
  Globe,
} from "lucide-react";

interface DashboardSidebarProps {
  user: User;
  userRole?: UserRole | null;
  clientId?: string | null;
  zones?: Zone[];
}

export function DashboardSidebar({
  user,
  userRole,
  clientId,
  zones = [],
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const showAdminMenu = userRole && isSuperAdmin(userRole);
  const showCreateZone = clientId && userRole && canManageZones(userRole);
  const shouldShowSettings = canViewSettings(userRole);
  
  const initials = user.email.split("@")[0].substring(0, 2).toUpperCase();
  
  const handleLogout = async () => {
    await logout();
  };

  const zonePages = [
    { title: "Overview", url: "overview", icon: BarChart3 },
    { title: "Feed", url: "feed", icon: Rss },
    { title: "Analysis", url: "analysis", icon: FileText },
    { title: "Attila", url: "attila", icon: Bot, requiresAttila: true },
    { title: "Settings", url: "settings", icon: Settings, requiresPermission: true },
  ];

  return (
    <Sidebar collapsible="icon">
      {/* Main Content */}
      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Zones */}
        {clientId && zones.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Zones</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {zones.map((zone) => {
                  const isActive = pathname.startsWith(`/dashboard/zones/${zone.id}`);
                  
                  return (
                    <Collapsible key={zone.id} defaultOpen={isActive} className="group/collapsible" suppressHydrationWarning>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={zone.name} suppressHydrationWarning>
                            <Globe />
                            <span>{zone.name}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {zonePages
                              .filter((page) => {
                                if (page.requiresPermission && !shouldShowSettings) return false;
                                if (page.requiresAttila) {
                                  const attilaEnabled = (zone.settings as any)?.attila_enabled === true;
                                  const canAccessAttila = 
                                    (userRole === 'manager' || userRole === 'admin' || userRole === 'super_admin') && 
                                    attilaEnabled;
                                  if (!canAccessAttila) return false;
                                }
                                return true;
                              })
                              .map((page) => {
                                const pageUrl = `/dashboard/zones/${zone.id}/${page.url}`;
                                return (
                                  <SidebarMenuSubItem key={page.url}>
                                    <SidebarMenuSubButton asChild isActive={pathname === pageUrl}>
                                      <Link href={pageUrl}>
                                        <page.icon />
                                        <span>{page.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin */}
        {showAdminMenu && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/clients")} tooltip="Clients">
                    <Link href="/dashboard/clients">
                      <Users />
                      <span>Clients</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        {/* Create Zone */}
        {showCreateZone && clientId && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Create Zone">
                <Plus />
                <span>Create Zone</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        
        {/* User Menu */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.email}</span>
                    <span className="truncate text-xs">{getRoleName(user.role)}</span>
                  </div>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
