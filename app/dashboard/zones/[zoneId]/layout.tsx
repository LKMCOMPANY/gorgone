import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/utils";
import { getZoneById } from "@/lib/data/zones";

interface ZoneLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    zoneId: string;
  }>;
}

export default async function ZoneLayout({
  children,
  params,
}: ZoneLayoutProps) {
  const { zoneId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch zone to verify it exists and user has access
  const zone = await getZoneById(zoneId);

  if (!zone) {
    notFound();
  }

  // Check if user has access to this zone's client
  if (user.role !== "super_admin" && user.role !== "admin") {
    if (user.client_id !== zone.client_id) {
      notFound();
    }
  }

  return <>{children}</>;
}

