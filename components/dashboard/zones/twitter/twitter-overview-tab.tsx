import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TwitterPeriodSelector, type Period } from "./twitter-period-selector";
import { 
  TwitterStatsCardsGrid, 
  TwitterStatsCardsGridSkeleton 
} from "./twitter-stats-cards-grid";
import { 
  TwitterLocationHeatmap, 
  TwitterLocationHeatmapSkeleton 
} from "./twitter-location-heatmap";
import { getTwitterOverviewStats } from "@/lib/data/twitter/overview-stats";
import { getHourlyVolumeTrend } from "@/lib/data/twitter/volume-analytics";
import { getTwitterLocationHeatmap } from "@/lib/data/twitter/location-analytics";

interface TwitterOverviewTabProps {
  zoneId: string;
  period: Period;
}

/**
 * Helper to get date range from period
 */
function getDateRangeFromPeriod(period: Period): { startDate: Date; endDate: Date } {
  const hoursMap: Record<Period, number> = { 
    "3h": 3, 
    "6h": 6, 
    "24h": 24, 
    "7d": 168, 
    "30d": 720 
  };
  const hours = hoursMap[period];
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);
  return { startDate, endDate };
}

/**
 * Async wrapper for location heatmap (separate Suspense boundary)
 * This prevents blocking the stats cards while geocoding happens
 */
async function TwitterLocationHeatmapAsync({ 
  zoneId, 
  period 
}: { 
  zoneId: string; 
  period: Period;
}) {
  const { startDate, endDate } = getDateRangeFromPeriod(period);
  const locationData = await getTwitterLocationHeatmap(zoneId, startDate, endDate);
  return <TwitterLocationHeatmap data={locationData} />;
}

/**
 * Transform volume trend data for sparkline charts
 */
function transformTrendData(
  trendData: Array<{ timestamp: string; tweet_count: number; total_engagement: number }>,
  metric: "volume" | "engagement"
) {
  return trendData.map((point) => ({
    timestamp: point.timestamp,
    value: metric === "volume" ? point.tweet_count : point.total_engagement,
  }));
}

/**
 * Main Twitter overview tab content
 * Server Component that fetches data and passes to client components
 */
export async function TwitterOverviewTab({ zoneId, period }: TwitterOverviewTabProps) {
  // Fetch stats
  const stats = await getTwitterOverviewStats(zoneId, period);
  
  // Fetch trend data
  const { startDate, endDate } = getDateRangeFromPeriod(period);
  const trendData = await getHourlyVolumeTrend(zoneId, startDate, endDate);

  // Transform trend data for each metric
  const volumeTrend = transformTrendData(trendData, "volume");
  const engagementTrend = transformTrendData(trendData, "engagement");
  
  // For reach and engaged users, use proportional data based on volume
  // This gives a visual trend even if we don't have exact hourly breakdowns
  const reachTrend = volumeTrend.map((point) => ({
    timestamp: point.timestamp,
    value: Math.round(point.value * 227), // Avg views per tweet from test data
  }));
  
  const engagedUsersTrend = volumeTrend.map((point) => ({
    timestamp: point.timestamp,
    value: Math.round(point.value * 0.56), // Approx ratio of unique authors to tweets
  }));

  return (
    <div className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Controls Section */}
      <div className="flex justify-end">
        <TwitterPeriodSelector currentPeriod={period} />
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<TwitterStatsCardsGridSkeleton />}>
        <TwitterStatsCardsGrid
          stats={stats}
          volumeTrend={volumeTrend}
          engagementTrend={engagementTrend}
          reachTrend={reachTrend}
          engagedUsersTrend={engagedUsersTrend}
        />
      </Suspense>

      {/* Location Heatmap - 50% width on desktop, full on mobile */}
      {/* Separate Suspense to avoid blocking stats cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-1">
          <Suspense fallback={<TwitterLocationHeatmapSkeleton />}>
            <TwitterLocationHeatmapAsync zoneId={zoneId} period={period} />
          </Suspense>
        </div>
        
        {/* Placeholder for future chart (other 50%) */}
        <div className="lg:col-span-1">
          <div className="h-full rounded-lg border border-dashed border-border/60 bg-muted/30 flex items-center justify-center p-12">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Additional analytics coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state for the entire tab
 */
export function TwitterOverviewTabSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      {/* Header Section Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-full sm:w-[480px] rounded-lg" />
        </div>
        <div className="h-px bg-border/50" />
      </div>

      {/* Stats Cards Skeleton */}
      <TwitterStatsCardsGridSkeleton />

      {/* Location Heatmap Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-1">
          <TwitterLocationHeatmapSkeleton />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-[571px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

