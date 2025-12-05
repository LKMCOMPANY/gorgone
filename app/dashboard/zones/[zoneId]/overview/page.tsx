import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getZoneById } from "@/lib/data/zones";
import { ZonePageHeader } from "@/components/dashboard/zones/zone-page-header";
import { EmptyState } from "@/components/dashboard/zones/empty-state";
import { TwitterOverviewTab, TwitterOverviewTabSkeleton } from "@/components/dashboard/zones/twitter/twitter-overview-tab";
import type { Period } from "@/components/dashboard/zones/twitter/twitter-period-selector";

interface OverviewPageProps {
  params: Promise<{
    zoneId: string;
  }>;
  searchParams: Promise<{
    source?: string;
    period?: string;
  }>;
}

export default async function OverviewPage({
  params,
  searchParams,
}: OverviewPageProps) {
  const { zoneId } = await params;
  const { source = "twitter", period = "24h" } = await searchParams;

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
        title="Overview"
        description="Monitor key metrics and insights across all your data sources"
      />

      {!hasEnabledSources ? (
        <EmptyState
          icon="warning"
          title="No Data Sources Enabled"
          description="To view zone data, please enable at least one data source (X, TikTok, or Media) in the zone settings."
        />
      ) : (
        <div className="space-y-6">
          {/* Twitter Overview */}
          {source === "twitter" && zone.data_sources.twitter && (
            <Suspense fallback={<TwitterOverviewTabSkeleton />}>
              <TwitterOverviewTab zoneId={zoneId} period={period as Period} />
            </Suspense>
          )}

          {/* TikTok Overview - Coming soon */}
          {source === "tiktok" && zone.data_sources.tiktok && (
            <EmptyState
              icon="lightbulb"
              title="TikTok Overview Coming Soon"
              description="TikTok analytics and metrics will be available here soon."
              variant="muted"
            />
          )}

          {/* Media Overview - Coming soon */}
          {source === "media" && zone.data_sources.media && (
            <EmptyState
              icon="lightbulb"
              title="Media Overview Coming Soon"
              description="Media analytics and metrics will be available here soon."
              variant="muted"
            />
          )}
        </div>
      )}
    </div>
  );
}

