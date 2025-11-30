"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  Rss,
  Settings,
  ChevronDown,
  ChevronRight,
  Bot,
} from "lucide-react";
import {
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
import type { Zone, UserRole } from "@/types";
import { canViewSettings } from "@/lib/auth/permissions";

interface ZonesSidebarSectionProps {
  zones: Zone[];
  userRole?: UserRole | null;
}

const zonePages = [
  {
    title: "Overview",
    url: "overview",
    icon: BarChart3,
  },
  {
    title: "Feed",
    url: "feed",
    icon: Rss,
  },
  {
    title: "Analysis",
    url: "analysis",
    icon: FileText,
  },
  {
    title: "Attila",
    url: "attila",
    icon: Bot,
    requiresAttila: true,
  },
  {
    title: "Settings",
    url: "settings",
    icon: Settings,
    requiresPermission: true,
  },
];

export function ZonesSidebarSection({
  zones,
  userRole,
}: ZonesSidebarSectionProps) {
  const pathname = usePathname();
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  const toggleZone = (zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  };

  // Auto-expand zone if we're on one of its pages
  const activeZoneId = pathname.startsWith("/dashboard/zones/")
    ? pathname.split("/")[3]
    : null;

  const shouldShowSettings = canViewSettings(userRole);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Zones</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {zones.map((zone) => {
            const isExpanded =
              expandedZones.has(zone.id) || activeZoneId === zone.id;

            return (
              <SidebarMenuItem key={zone.id}>
                <SidebarMenuButton
                  onClick={() => toggleZone(zone.id)}
                  className="w-full justify-between transition-colors duration-[150ms] hover:bg-muted/50"
                >
                  <span className="text-body-sm font-medium truncate transition-colors duration-[150ms]">
                    {zone.name}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-[200ms]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-[200ms]" />
                  )}
                </SidebarMenuButton>
                {isExpanded && (
                  <SidebarMenuSub className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    {zonePages
                      .filter((page) => {
                        if (page.requiresPermission && !shouldShowSettings)
                          return false;
                        
                        // Check Attila permission (manager role + enabled in settings)
                        if (page.requiresAttila) {
                          const attilaEnabled = (zone.settings as any)?.attila_enabled === true;
                          // Only managers and above can see Attila, and only if enabled
                          const canAccessAttila = 
                            (userRole === 'manager' || userRole === 'admin' || userRole === 'super_admin') && 
                            attilaEnabled;
                          
                          if (!canAccessAttila) return false;
                        }
                        
                        return true;
                      })
                      .map((page) => {
                        const pageUrl = `/dashboard/zones/${zone.id}/${page.url}`;
                        const isActive = pathname === pageUrl;

                        return (
                          <SidebarMenuSubItem key={page.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive}
                              className="transition-all duration-[150ms]"
                            >
                              <Link href={pageUrl}>
                                <page.icon className="h-4 w-4 transition-transform duration-[150ms] group-hover:scale-110" />
                                <span className="text-body-sm">
                                  {page.title}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

