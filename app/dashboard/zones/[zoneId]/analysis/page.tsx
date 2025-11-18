import { notFound } from "next/navigation";
import { getZoneById } from "@/lib/data/zones";
import { ZonePageHeader } from "@/components/dashboard/zones/zone-page-header";
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
    <div className="animate-in" style={{ animationDelay: "50ms" }}>
      <ZonePageHeader
        zone={zone}
        title="Analysis"
        description="3D opinion clustering and sentiment tracking"
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
      ) : zone.data_sources.twitter ? (
        <div className="mt-8">
          <TwitterOpinionMapView zoneId={zoneId} />
        </div>
      ) : (
        <div className="mt-8">
          <div className="rounded-lg border border-border bg-muted/30 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-full bg-primary/10 p-2">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-body-sm font-medium">
                  Advanced analytics coming soon
                </p>
                <p className="text-body-sm text-muted-foreground">
                  This page will provide AI-powered sentiment analysis, trend detection, and insights for {source} content
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

