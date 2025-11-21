"use client";

import { LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@/components/ui/sidebar";
import { isSuperAdmin, canManageZones } from "@/lib/auth/permissions";
import { ZonesSidebarSection } from "@/components/dashboard/zones/zones-sidebar-section";
import { CreateZoneDialog } from "@/components/dashboard/zones/create-zone-dialog";
import { SidebarFooterControls } from "@/components/dashboard/sidebar-footer-controls";
import type { UserRole, Zone, User } from "@/types";

const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
];

const adminMenuItems = [
  {
    title: "Clients",
    url: "/dashboard/clients",
    icon: Users,
  },
];

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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Zones Section - Show if user has a client */}
        {clientId && zones.length > 0 && (
          <ZonesSidebarSection zones={zones} userRole={userRole} />
        )}

        {showAdminMenu && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with Controls */}
      <SidebarFooter>
        {showCreateZone && clientId && (
          <SidebarMenu>
            <SidebarMenuItem>
              <CreateZoneDialog clientId={clientId} />
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        
        {/* Theme Toggle & User Menu - Outside SidebarMenu */}
        <SidebarFooterControls user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
