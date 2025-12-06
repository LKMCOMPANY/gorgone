import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { GlobalChatSheet } from "@/components/dashboard/chat/global-chat-sheet";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { getCurrentUser } from "@/lib/auth/utils";
import { getActiveZonesByClient } from "@/lib/data/zones";
import { getImpersonationSession } from "@/lib/auth/impersonation";
import { getClientWithStats } from "@/lib/data/clients";
import type { Zone } from "@/types";

export const dynamic = "force-dynamic";

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

  // Check if impersonating
  const impersonationSession = await getImpersonationSession();
  let clientName: string | undefined;
  
  if (impersonationSession) {
    try {
      const client = await getClientWithStats(impersonationSession.clientId);
      clientName = client?.name;
    } catch (error) {
      console.error("Error loading client name:", error);
    }
  }

  return (
    <>
      {/* Impersonation Banner - outside sidebar */}
      {impersonationSession && (
        <ImpersonationBanner
          adminEmail={impersonationSession.adminEmail}
          clientName={clientName}
        />
      )}
      
      <SidebarProvider defaultOpen={true}>
        <DashboardSidebar
          user={user}
          userRole={user.role}
          clientId={user.client_id}
          zones={zones}
        />
        <SidebarInset 
          className="flex flex-col w-full h-screen overflow-hidden relative"
          style={{ paddingTop: impersonationSession ? '48px' : '0' }}
        >
          {/* Header INSIDE Inset - sticky to top of this container */}
          <DashboardHeader user={user} />
          
          {/* Main content area - scrolls relative to Inset */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col w-full relative">
            {children}
            {/* Global Chat Overlay */}
            {zones.length > 0 && <GlobalChatSheet zones={zones} />}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
