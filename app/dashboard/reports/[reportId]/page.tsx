import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { ReportEditorPage } from "@/components/dashboard/reports/report-editor-page";
import { ReportEditorSkeleton } from "@/components/dashboard/reports";
import { getReportAction } from "@/app/actions/reports";
import { getCurrentUser } from "@/lib/auth/utils";

export const dynamic = "force-dynamic";

interface ReportPageProps {
  params: Promise<{ reportId: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { reportId } = await params;
  const user = await getCurrentUser();

  if (!user?.client_id) {
    redirect("/dashboard");
  }

  const report = await getReportAction(reportId);

  if (!report) {
    notFound();
  }

  return (
    <Suspense fallback={<ReportEditorSkeleton />}>
      <ReportEditorPage report={report} />
    </Suspense>
  );
}

