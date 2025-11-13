import { notFound } from "next/navigation";
import { getZoneById } from "@/lib/data/zones";
import { ZonePageHeader } from "@/components/dashboard/zones/zone-page-header";

interface FeedPageProps {
  params: Promise<{
    zoneId: string;
  }>;
  searchParams: Promise<{
    source?: string;
  }>;
}

export default async function FeedPage({ params, searchParams }: FeedPageProps) {
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
        title="Feed"
        description="Real-time social media feed for your zone"
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
        <div className="mt-8 space-y-4">
        {/* Feed placeholder items */}
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="card-interactive rounded-lg border border-border bg-card card-padding transition-all duration-[250ms]"
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full animate-pulse bg-muted" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <span className="text-caption text-muted-foreground">•</span>
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                </div>
                <div className="flex gap-6 pt-2">
                  {[
                    <svg
                      key="comment"
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>,
                    <svg
                      key="retweet"
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>,
                    <svg
                      key="like"
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>,
                  ].map((icon, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {icon}
                      <div className="h-3 w-8 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <div className="mx-auto max-w-sm space-y-3">
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
                <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-body font-medium">Real-time feed coming soon</p>
              <p className="text-body-sm text-muted-foreground">
                Posts, mentions, and updates from {source} will appear here in real-time
              </p>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

