import { notFound } from "next/navigation";
import { getZoneById } from "@/lib/data/zones";
import { ZonePageHeader } from "@/components/dashboard/zones/zone-page-header";
import { EmptyState } from "@/components/dashboard/zones/empty-state";
import { TwitterOpinionMapView } from "@/components/dashboard/zones/twitter/opinion-map/twitter-opinion-map-view";

interface AnalysisPageProps {
  params: Promise<{
    zoneId: string;
  }>;
  searchParams: Promise<{
    source?: string;
  }>;
}

export default async function AnalysisPage({
  params,
  searchParams,
}: AnalysisPageProps) {
  const { zoneId } = await params;
  const { source = "twitter" } = await searchParams;

  const zone = await getZoneById(zoneId);

  if (!zone) {
    notFound();
  }

  // Check if at least one data source is enabled
  const hasEnabledSources =
    zone.data_sources.twitter ||
    zone.data_sources.tiktok ||
    zone.data_sources.media;

  return (
    <div className="animate-in space-y-6">
      <ZonePageHeader
        zone={zone}
        title="Analysis"
        description="3D opinion clustering and sentiment tracking"
      />

      {!hasEnabledSources ? (
        <EmptyState
          icon="warning"
          title="No Data Sources Enabled"
          description="To view zone data, please enable at least one data source (X, TikTok, or Media) in the zone settings."
        />
      ) : zone.data_sources.twitter ? (
        <TwitterOpinionMapView zoneId={zoneId} />
      ) : (
        <EmptyState
          icon="lightbulb"
          title="Advanced Analytics Coming Soon"
          description={`This page will provide AI-powered sentiment analysis, trend detection, and insights for ${source} content.`}
          variant="muted"
        />
      )}
    </div>
  );
}

