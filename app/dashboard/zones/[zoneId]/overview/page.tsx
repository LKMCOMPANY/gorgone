import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getZoneById } from "@/lib/data/zones";
import { ZonePageHeader } from "@/components/dashboard/zones/zone-page-header";
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
    <div className="space-y-8">
      <ZonePageHeader
        zone={zone}
        title="Overview"
        description="Monitor key metrics and insights across all your data sources"
      />

      {!hasEnabledSources ? (
        <div className="mt-8">
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-body font-semibold">No Data Sources Enabled</p>
                <p className="text-body-sm text-muted-foreground max-w-md mx-auto">
                  To view zone data, please enable at least one data source (X, TikTok, or Media) in the zone settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Twitter Overview */}
          {source === "twitter" && zone.data_sources.twitter && (
            <Suspense fallback={<TwitterOverviewTabSkeleton />}>
              <TwitterOverviewTab zoneId={zoneId} period={period as Period} />
            </Suspense>
          )}

          {/* TikTok Overview - Coming soon */}
          {source === "tiktok" && zone.data_sources.tiktok && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-body font-semibold">TikTok Overview Coming Soon</p>
                  <p className="text-body-sm text-muted-foreground max-w-md mx-auto">
                    TikTok analytics and metrics will be available here soon.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Media Overview - Coming soon */}
          {source === "media" && zone.data_sources.media && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-body font-semibold">Media Overview Coming Soon</p>
                  <p className="text-body-sm text-muted-foreground max-w-md mx-auto">
                    Media analytics and metrics will be available here soon.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

