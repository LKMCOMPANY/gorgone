import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/utils";
import { canViewSettings } from "@/lib/auth/permissions";
import { getZoneById } from "@/lib/data/zones";
import { ZoneSettingsForm } from "@/components/dashboard/zones/zone-settings-form";
import { PageContainer } from "@/components/dashboard/page-container";

interface SettingsPageProps {
  params: Promise<{
    zoneId: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { zoneId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has permission to view settings
  if (!canViewSettings(user.role)) {
    notFound();
  }

  const zone = await getZoneById(zoneId);

  if (!zone) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="animate-in space-y-6">
        {/* Page Header */}
        <div className="space-y-1.5">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight">
            Zone Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure your zone settings and data sources for monitoring
          </p>
        </div>

        {/* Settings Form */}
        <ZoneSettingsForm zone={zone} userRole={user.role} />
      </div>
    </PageContainer>
  );
}

