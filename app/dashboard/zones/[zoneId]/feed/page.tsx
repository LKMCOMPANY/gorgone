import { notFound } from "next/navigation";
import { getZoneById } from "@/lib/data/zones";
import { ZonePageHeader } from "@/components/dashboard/zones/zone-page-header";
import { TwitterFeedTabs } from "@/components/dashboard/zones/twitter/twitter-feed-tabs";

interface FeedPageProps {
  params: Promise<{
    zoneId: string;
  }>;
  searchParams: Promise<{
    source?: string;
    view?: string;
    search?: string;
    searchType?: string;
  }>;
}

export default async function FeedPage({ params, searchParams }: FeedPageProps) {
  const { zoneId } = await params;
  const { source = "twitter", view = "feed", search, searchType } = await searchParams;

  const zone = await getZoneById(zoneId);

  if (!zone) {
    notFound();
  }

  // Check if at least one data source is enabled
  const hasEnabledSources =
    zone?.data_sources.twitter ||
    zone?.data_sources.tiktok ||
    zone?.data_sources.media;

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
        <div className="mt-8">
          {/* Twitter Content with Feed/Profiles tabs */}
          {source === "twitter" && zone?.data_sources.twitter && (
            <TwitterFeedTabs 
              zoneId={zoneId}
              initialView={view}
              initialSearch={search}
              initialSearchType={searchType as "keyword" | "user" | undefined}
            />
          )}

          {/* Other sources placeholders */}
          {source !== "twitter" && (
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
                  <p className="text-body font-medium">Feed coming soon</p>
                  <p className="text-body-sm text-muted-foreground">
                    Posts from {source} will appear here once integration is complete
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

