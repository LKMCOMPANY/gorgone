import { notFound } from "next/navigation";
import { getZoneById } from "@/lib/data/zones";
import { ZonePageHeader } from "@/components/dashboard/zones/zone-page-header";

interface OverviewPageProps {
  params: Promise<{
    zoneId: string;
  }>;
  searchParams: Promise<{
    source?: string;
  }>;
}

export default async function OverviewPage({
  params,
  searchParams,
}: OverviewPageProps) {
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
        title="Overview"
        description="Monitor key metrics and insights for your zone"
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
        {/* Placeholder cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Posts",
              icon: (
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
            },
            {
              label: "Engagement Rate",
              icon: (
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              ),
            },
            {
              label: "Reach",
              icon: (
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
            },
            {
              label: "Sentiment",
              icon: (
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="card-interactive card-padding rounded-lg border border-border bg-card transition-all duration-[250ms]"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-body-sm text-muted-foreground">
                    {metric.label}
                  </p>
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                </div>
                <div className="flex-shrink-0">{metric.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content placeholder */}
        <div className="rounded-lg border border-border bg-card card-padding">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-heading-3">Activity Overview</h3>
                <p className="text-body-sm text-muted-foreground">
                  Real-time data for {source} will appear here
                </p>
              </div>
            </div>
            <div className="h-[400px] rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
              <div className="text-center space-y-2 p-8">
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
                <p className="text-body font-medium">Charts and analytics coming soon</p>
                <p className="text-body-sm text-muted-foreground max-w-sm">
                  This section will display interactive charts, trends, and key performance indicators
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

