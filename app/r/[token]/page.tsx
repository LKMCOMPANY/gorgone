import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getPublishedReportAction } from "@/app/actions/reports";
import { SharedReportView } from "@/components/reports/shared-report-view";
import { SharedReportPasswordForm } from "@/components/reports/shared-report-password-form";

export const dynamic = "force-dynamic";

interface SharedReportPageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedReportPage({ params }: SharedReportPageProps) {
  const { token } = await params;
  
  // Fetch the report data
  const report = await getPublishedReportAction(token);
  
  if (!report) {
    notFound();
  }

  // Check if password verification is needed
  if (report.has_password) {
    // Check for session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`report_access_${token}`);
    
    // If no valid session, show password form
    if (!sessionCookie || sessionCookie.value !== "verified") {
      return (
        <SharedReportPasswordForm 
          token={token} 
          reportTitle={report.title} 
        />
      );
    }
  }

  // User has access - show the report
  return <SharedReportView report={report} />;
}

