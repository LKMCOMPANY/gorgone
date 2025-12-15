import { DashboardChat } from "@/components/dashboard/chat/dashboard-chat";
import { ClientsQuickAccess } from "@/components/dashboard/clients/clients-quick-access";
import { getActiveZonesByClientAction } from "@/app/actions/zones";
import { getCurrentUser } from "@/lib/auth/utils";
import { PageContainer } from "@/components/dashboard/page-container";
import { Building2 } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  // Super admin view: show clients quick access
  if (user?.role === "super_admin" && !user?.client_id) {
    return (
      <PageContainer>
        <div className="animate-in space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage all client environments
                </p>
              </div>
            </div>
          </div>

          {/* Clients List */}
          <ClientsQuickAccess />
        </div>
      </PageContainer>
    );
  }
  
  // Client user view: show AI chat
  let zones: any[] = [];
  if (user?.client_id) {
      zones = await getActiveZonesByClientAction(user.client_id) || [];
  }

  // Full height minus header (approximate) to prevent main scrollbar
  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)] w-full flex flex-col overflow-hidden">
      <DashboardChat zones={zones} />
    </div>
  );
}
