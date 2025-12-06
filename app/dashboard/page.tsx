import { DashboardChat } from "@/components/dashboard/chat/dashboard-chat";
import { ClientsQuickAccess } from "@/components/dashboard/clients/clients-quick-access";
import { getActiveZonesByClientAction } from "@/app/actions/zones";
import { getCurrentUser } from "@/lib/auth/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  // Super admin view: show clients quick access
  if (user?.role === "super_admin" && !user?.client_id) {
    return (
      <div className="min-h-full bg-muted/10">
        {/* Page header */}
        <div className="border-b bg-background px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of all active client environments
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            <ClientsQuickAccess />
          </div>
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
