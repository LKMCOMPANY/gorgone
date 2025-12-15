import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/dashboard/page-container";
import { ReportList, ReportListSkeleton } from "@/components/dashboard/reports";
import { getReportsAction } from "@/app/actions/reports";
import { getCurrentUser } from "@/lib/auth/utils";
import { getActiveZonesByClient } from "@/lib/data/zones";
import { CreateReportDialog } from "@/components/dashboard/reports/create-report-dialog";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  
  if (!user?.client_id) {
    redirect("/dashboard");
  }

  // Get zones for the create dialog
  const zones = await getActiveZonesByClient(user.client_id);

  return (
    <PageContainer>
      <div className="animate-in space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight">
              Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Create and manage intelligence reports with AI assistance.
            </p>
          </div>
          <CreateReportDialog zones={zones} />
        </div>

        {/* Reports List */}
        <Suspense fallback={<ReportListSkeleton />}>
          <ReportsListContent />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function ReportsListContent() {
  const reports = await getReportsAction();

  if (!reports) {
    return (
      <div className="py-16 text-center animate-in">
        <div className="inline-flex items-center justify-center size-16 rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
          <FileText className="size-8 text-destructive/50" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Unable to load reports</h3>
        <p className="text-sm text-muted-foreground">
          Please try again later.
        </p>
      </div>
    );
  }

  return <ReportList reports={reports} />;
}

