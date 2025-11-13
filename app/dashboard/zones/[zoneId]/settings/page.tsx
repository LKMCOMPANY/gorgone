import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/utils";
import { canViewSettings } from "@/lib/auth/permissions";
import { getZoneById } from "@/lib/data/zones";
import { ZoneSettingsForm } from "@/components/dashboard/zones/zone-settings-form";

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
    <div className="animate-in fade-in-0 duration-300" style={{ animationDelay: "50ms" }}>
      <div className="mb-8 space-y-2">
        <h1 className="text-heading-1">Zone Settings</h1>
        <p className="text-body text-muted-foreground">
          Configure your zone settings and data sources for monitoring
        </p>
      </div>

      <ZoneSettingsForm zone={zone} userRole={user.role} />
    </div>
  );
}

