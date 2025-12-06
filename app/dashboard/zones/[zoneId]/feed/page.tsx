import { notFound } from "next/navigation";
import { getZoneById } from "@/lib/data/zones";
import { ZonePageHeader } from "@/components/dashboard/zones/zone-page-header";
import { EmptyState } from "@/components/dashboard/zones/empty-state";
import { TwitterFeedTabs } from "@/components/dashboard/zones/twitter/twitter-feed-tabs";
import { TikTokFeedTabs } from "@/components/dashboard/zones/tiktok/tiktok-feed-tabs";
import { MediaFeedContent } from "@/components/dashboard/zones/media/media-feed-content";
import { PageContainer } from "@/components/dashboard/page-container";

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
    <PageContainer>
      <div className="animate-in space-y-6">
        <ZonePageHeader
          zone={zone}
          title="Feed"
          description="Real-time social media feed for your zone"
        />

        {!hasEnabledSources ? (
          <EmptyState
            icon="warning"
            title="No Data Sources Enabled"
            description="To view zone data, please enable at least one data source (X, TikTok, or Media) in the zone settings."
          />
        ) : (
          <div>
            {/* Twitter Content with Feed/Profiles tabs */}
            {source === "twitter" && zone?.data_sources.twitter && (
              <TwitterFeedTabs 
                zoneId={zoneId}
                initialView={view}
                initialSearch={search}
                initialSearchType={searchType as "keyword" | "user" | undefined}
              />
            )}

            {/* Media Content */}
            {source === "media" && zone?.data_sources.media && (
              <MediaFeedContent zoneId={zoneId} />
            )}

            {/* TikTok Content with Feed/Profiles tabs */}
            {source === "tiktok" && zone?.data_sources.tiktok && (
              <TikTokFeedTabs
                zoneId={zoneId}
                initialView={view}
                initialSearch={search}
                initialSearchType={searchType as "keyword" | "user" | undefined}
              />
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

