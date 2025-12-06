import { DashboardChat } from "@/components/dashboard/chat/dashboard-chat";
import { getActiveZonesByClientAction } from "@/app/actions/zones";
import { getCurrentUser } from "@/lib/auth/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
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
