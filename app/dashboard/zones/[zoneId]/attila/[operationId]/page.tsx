import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/utils";
import { canManageZones } from "@/lib/auth/permissions";
import { getOperationById } from "@/lib/data/attila";
import { getOpinionClusters } from "@/lib/data/opinion";
import { AttilaEditorLayout } from "@/components/dashboard/attila/editor/attila-editor-layout";

interface AttilaEditorPageProps {
  params: Promise<{
    zoneId: string;
    operationId: string;
  }>;
}

export default async function AttilaEditorPage({ params }: AttilaEditorPageProps) {
  const { zoneId, operationId } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!canManageZones(user.role)) notFound();

  const operation = await getOperationById(operationId);
  if (!operation || operation.zone_id !== zoneId) notFound();

  // Fetch clusters if type is influence
  const clusters = operation.type === "influence" 
    ? await getOpinionClusters(zoneId) 
    : [];

  return (
    <AttilaEditorLayout 
      operation={operation} 
      zoneId={zoneId}
      clusters={clusters}
    />
  );
}

