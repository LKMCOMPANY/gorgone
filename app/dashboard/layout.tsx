import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardFooter } from "@/components/dashboard/footer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatProvider } from "@/components/dashboard/chat/chat-provider";
import { ChatSidebarIntegrated } from "@/components/dashboard/chat/chat-sidebar-integrated";
import { DashboardContentWrapper } from "@/components/dashboard/content-wrapper";
import { getCurrentUser } from "@/lib/auth/utils";
import { getActiveZonesByClient } from "@/lib/data/zones";
import type { Zone } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Load zones if user has a client
  let zones: Zone[] = [];
  if (user.client_id) {
    try {
      zones = await getActiveZonesByClient(user.client_id);
    } catch (error) {
      console.error("Error loading zones:", error);
    }
  }

  return (
    <ChatProvider>
      <SidebarProvider defaultOpen={true}>
        <DashboardContentWrapper>
          <DashboardSidebar
            user={user}
            userRole={user.role}
            clientId={user.client_id}
            zones={zones}
          />
          <SidebarInset className="flex flex-col w-full">
            <DashboardHeader user={user} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
            <DashboardFooter />
          </SidebarInset>
        </DashboardContentWrapper>

        {/* Chat Sidebar - Integrated on desktop, overlay on mobile */}
        {zones.length > 0 && <ChatSidebarIntegrated zones={zones} />}
      </SidebarProvider>
    </ChatProvider>
  );
}
