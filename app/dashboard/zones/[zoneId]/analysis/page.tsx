import { notFound } from "next/navigation";
import { getZoneById } from "@/lib/data/zones";
import { ZonePageHeader } from "@/components/dashboard/zones/zone-page-header";

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
    <div className="animate-in fade-in-0 duration-300" style={{ animationDelay: "50ms" }}>
      <ZonePageHeader
        zone={zone}
        title="Analysis"
        description="In-depth analysis and sentiment tracking"
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
        <div className="mt-8 space-y-6">
        {/* Analysis sections grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sentiment Analysis */}
          <div className="card-interactive rounded-lg border border-border bg-card card-padding transition-all duration-[250ms]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-heading-3">Sentiment Analysis</h3>
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <div className="h-[200px] rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
                <p className="text-body-sm text-muted-foreground">
                  Sentiment distribution chart
                </p>
              </div>
            </div>
          </div>

          {/* Top Keywords */}
          <div className="card-interactive rounded-lg border border-border bg-card card-padding transition-all duration-[250ms]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-heading-3">Top Keywords</h3>
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div className="h-[200px] rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
                <p className="text-body-sm text-muted-foreground">
                  Trending keywords cloud
                </p>
              </div>
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="card-interactive rounded-lg border border-border bg-card card-padding transition-all duration-[250ms]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-heading-3">Trend Analysis</h3>
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="h-[200px] rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
                <p className="text-body-sm text-muted-foreground">
                  Activity trends over time
                </p>
              </div>
            </div>
          </div>

          {/* Influencers */}
          <div className="card-interactive rounded-lg border border-border bg-card card-padding transition-all duration-[250ms]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-heading-3">Top Influencers</h3>
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="h-[200px] rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
                <p className="text-body-sm text-muted-foreground">
                  Most influential accounts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info message */}
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

