"use client";

import { cn } from "@/lib/utils";
import { TwitterStatsCard } from "./twitter-stats-card";
import { TwitterStatsCardSkeleton } from "./twitter-stats-card-skeleton";

interface TrendDataPoint {
  timestamp: string;
  value: number;
}

interface TwitterOverviewStats {
  volume: number;
  engagement: number;
  reach: number;
  engaged_users: number;
  previous_volume?: number;
  previous_engagement?: number;
  previous_reach?: number;
  previous_engaged_users?: number;
}

interface TwitterStatsCardsGridProps {
  stats: TwitterOverviewStats;
  volumeTrend: TrendDataPoint[];
  engagementTrend: TrendDataPoint[];
  reachTrend: TrendDataPoint[];
  engagedUsersTrend: TrendDataPoint[];
}

/**
 * Grid of 4 stats cards with sparklines
 * Responsive layout: 1 col mobile → 2 cols tablet → 4 cols desktop
 * Staggered entrance animation for polish
 */
export function TwitterStatsCardsGrid({
  stats,
  volumeTrend,
  engagementTrend,
  reachTrend,
  engagedUsersTrend,
}: TwitterStatsCardsGridProps) {
  const cards = [
    {
      label: "Volume",
      value: stats.volume,
      previousValue: stats.previous_volume || 0,
      trendData: volumeTrend,
    },
    {
      label: "Engagement",
      value: stats.engagement,
      previousValue: stats.previous_engagement || 0,
      trendData: engagementTrend,
    },
    {
      label: "Reach",
      value: stats.reach,
      previousValue: stats.previous_reach || 0,
      trendData: reachTrend,
    },
    {
      label: "Engaged Users",
      value: stats.engaged_users,
      previousValue: stats.previous_engaged_users || 0,
      trendData: engagedUsersTrend,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: `${index * 75}ms` }}
        >
          <TwitterStatsCard {...card} />
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for stats cards grid with stagger animation
 */
export function TwitterStatsCardsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <TwitterStatsCardSkeleton key={index} index={index} />
      ))}
    </div>
  );
}

