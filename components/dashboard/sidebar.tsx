"use client";

import { LayoutDashboard, Users, ChevronUp, ChevronRight, Plus } from "lucide-react";
import Image from "next/image";
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
  SidebarHeader,
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
import { CreateZoneDialog } from "@/components/dashboard/zones/create-zone-dialog";
import { APP_NAME } from "@/lib/constants";
import { GorgoneEye } from "@/components/ui/gorgone-eye";
import type { UserRole, Zone, User } from "@/types";
import {
  BarChart3,
  Network,
  Rss,
  Settings,
  Bot,
  Eye,
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
  // Only show admin menu if super admin AND NOT viewing a specific client (impersonation)
  const showAdminMenu = userRole && isSuperAdmin(userRole) && !clientId;
  const showCreateZone = clientId && userRole && canManageZones(userRole);
  const shouldShowSettings = canViewSettings(userRole);
  
  const initials = user.email.split("@")[0].substring(0, 2).toUpperCase();
  
  const handleLogout = async () => {
    await logout();
  };

  const zonePages = [
    { title: "Overview", url: "overview", icon: BarChart3 },
    { title: "Feed", url: "feed", icon: Rss },
    { title: "Analysis", url: "analysis", icon: Network },
    { 
      title: "Attila", 
      url: "attila", 
      icon: () => (
        <div className="relative size-4">
          <Image
            src="/AttilaBlack.svg"
            alt="Attila"
            fill
            className="object-contain dark:hidden"
          />
          <Image
            src="/AttilaWhite.svg"
            alt="Attila"
            fill
            className="object-contain hidden dark:block"
          />
        </div>
      ),
      requiresAttila: true 
    },
    { title: "Settings", url: "settings", icon: Settings, requiresPermission: true },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center overflow-hidden px-4 py-2 transition-all duration-300 ease-in-out group-data-[collapsible=icon]/sidebar:px-0">
          <div className="flex flex-col whitespace-nowrap transition-all duration-300 ease-in-out group-data-[collapsible=icon]/sidebar:w-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:-translate-x-4">
            <h2 className="text-xl font-bold tracking-tight leading-none">
              {APP_NAME}
            </h2>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
              Operational Monitoring
            </span>
          </div>
          {/* Collapsed Logo (Gorgone Eye) */}
          <div className="hidden group-data-[collapsible=icon]/sidebar:flex w-full items-center justify-center pt-1">
             <div className="relative size-6">
                <GorgoneEye className="h-full w-full" />
             </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/dashboard"} 
                  tooltip={clientId ? "IA Monitoring" : "Home"}
                >
                  <Link href="/dashboard">
                    <div className="relative size-4 shrink-0">
                      <Image
                        src="/GorgoneBlack.svg"
                        alt="Gorgone"
                        fill
                        className="object-contain dark:hidden"
                      />
                      <Image
                        src="/GorgoneWhite.svg"
                        alt="Gorgone"
                        fill
                        className="object-contain hidden dark:block"
                      />
                    </div>
                    <span>{clientId ? "IA Monitoring" : "Home"}</span>
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
                            <div className="relative size-4 shrink-0">
                              <Image
                                src="/GorgoneBlack.svg"
                                alt="Zone"
                                fill
                                className="object-contain dark:hidden"
                              />
                              <Image
                                src="/GorgoneWhite.svg"
                                alt="Zone"
                                fill
                                className="object-contain hidden dark:block"
                              />
                            </div>
                            <span>{zone.name}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down" suppressHydrationWarning>
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
              <CreateZoneDialog clientId={clientId} />
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
