import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/utils";
import { canManageZones } from "@/lib/auth/permissions";
import { getZoneById } from "@/lib/data/zones";
import { getOperationsAction } from "@/app/actions/attila";
import { getAttilaActivity } from "@/lib/data/attila";
import { AttilaOperationsList } from "@/components/dashboard/attila/attila-operations-list";
import { CreateOperationDialog } from "@/components/dashboard/attila/create-operation-dialog";
import { AttilaMonitoringFeed } from "@/components/dashboard/attila/attila-monitoring-feed";
import { Bot, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense } from "react";
import { AttilaMonitoringSkeleton } from "@/components/dashboard/attila/attila-monitoring-skeleton";

interface AttilaPageProps {
  params: Promise<{
    zoneId: string;
  }>;
}

export default async function AttilaPage({ params }: AttilaPageProps) {
  const { zoneId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManageZones(user.role)) {
    notFound();
  }

  const zone = await getZoneById(zoneId);
  if (!zone) {
    notFound();
  }

  const attilaEnabled = (zone.settings as any)?.attila_enabled === true;
  if (!attilaEnabled) {
    notFound();
  }

  // Fetch Data
  const { data: operations } = await getOperationsAction(zoneId);
  const activity = await getAttilaActivity(zoneId);

  return (
    <div className="animate-in space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="scroll-m-20 text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Bot className="size-8 text-primary" />
            Attila Automation
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage automated AI response operations and monitor activity
          </p>
        </div>
        <CreateOperationDialog zoneId={zoneId} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="operations" className="space-y-6">
        <div className="border-b">
          <TabsList className="bg-transparent p-0 h-auto space-x-6">
            <TabsTrigger 
              value="operations" 
              className="rounded-none border-b-2 border-transparent px-0 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-muted-foreground data-[state=active]:text-foreground transition-all duration-[var(--transition-fast)]"
            >
              <div className="flex items-center gap-2">
                <Bot className="size-4" />
                <span>Operations</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="monitoring" 
              className="rounded-none border-b-2 border-transparent px-0 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-muted-foreground data-[state=active]:text-foreground transition-all duration-[var(--transition-fast)]"
            >
              <div className="flex items-center gap-2">
                <Activity className="size-4" />
                <span>Live Monitoring</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="operations" className="outline-none">
           <AttilaOperationsList 
             zoneId={zoneId} 
             initialOperations={operations || []} 
           />
        </TabsContent>

        <TabsContent value="monitoring" className="outline-none">
           <Suspense fallback={<AttilaMonitoringSkeleton />}>
             <AttilaMonitoringFeed 
               activity={activity} 
               zoneId={zoneId} 
             />
           </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
