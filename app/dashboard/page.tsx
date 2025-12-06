import { DashboardChat } from "@/components/dashboard/chat/dashboard-chat";
import { ClientsQuickAccess } from "@/components/dashboard/clients/clients-quick-access";
import { getActiveZonesByClientAction } from "@/app/actions/zones";
import { getCurrentUser } from "@/lib/auth/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  // Super admin view: show clients quick access
  if (user?.role === "super_admin" && !user?.client_id) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Select a client to view their dashboard
            </p>
          </div>
          <ClientsQuickAccess />
        </div>
      </div>
    );
  }
  
  // Client user view: show AI chat
  let zones: any[] = [];
  if (user?.client_id) {
      zones = await getActiveZonesByClientAction(user.client_id) || [];
  }

  // Full height minus header (if present) is handled by layout flex-1, 
  // but we enforce 100% height here to fill the parent main container.
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <DashboardChat zones={zones} />
    </div>
  );
}
