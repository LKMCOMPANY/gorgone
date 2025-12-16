"use client";

/**
 * Opinion Report View Component
 * 
 * Shared component for rendering Opinion Report analysis.
 * Used in both:
 * - Chat messages (chat-messages.tsx)
 * - Report editor (opinion-report-node.tsx)
 * 
 * Displays:
 * - Header with stats (tweets analyzed, clusters, period)
 * - Opinion evolution chart (stacked area showing cluster trends)
 * - Cluster cards with labels, percentages, descriptions, keywords
 * - Representative tweets per cluster
 * 
 * Supports i18n via optional `language` prop for static UI labels.
 */

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { TweetCardList, type TweetData } from "@/components/ui/tweet-card";
import { ChatOpinionEvolutionChart } from "@/components/dashboard/chat/chat-opinion-evolution-chart";
import {
  type SupportedLanguage,
  getOpinionReportLabels,
} from "@/lib/constants/languages";

// ============================================================================
// Types
// ============================================================================

/** Cluster info for evolution chart */
interface ClusterChartInfo {
  id: number;
  label: string;
  color: string;
}

/** Evolution chart data structure */
export interface EvolutionChartData {
  _type?: "visualization";
  chart_type: "stacked_area";
  title: string;
  description?: string;
  data: Array<Record<string, string | number>>;
  config: Record<string, { label: string; color: string }>;
  clusters: ClusterChartInfo[];
}

/** Tweet example from opinion report */
export interface OpinionTweetExample {
  tweet_id: string;
  text: string;
  author_username: string;
  author_name: string;
  author_verified: boolean;
  author_profile_picture_url: string | null;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    views: number;
  };
  tweet_url: string;
}

/** Cluster data from opinion report */
export interface OpinionClusterData {
  label: string;
  description: string | null;
  percentage: string;
  sentiment_label: string;
  keywords: string[];
  color?: string;
  examples: OpinionTweetExample[];
}

/** Full Opinion Report payload */
export interface OpinionReportData {
  _type?: "opinion_report";
  available?: boolean;
  session: {
    data_period: { display: string };
    total_tweets_analyzed: number;
    total_clusters: number;
  };
  clusters: OpinionClusterData[];
  /** Evolution chart (stacked area showing cluster trends over time) */
  evolution_chart?: EvolutionChartData | null;
  /** Legacy: Sentiment evolution chart (for backwards compatibility) */
  sentiment_evolution_chart?: any;
}

// ============================================================================
// Helpers
// ============================================================================

/** Convert tool tweet format to TweetData format */
function toTweetData(tweet: OpinionTweetExample): TweetData {
  return {
    tweet_id: tweet.tweet_id,
    text: tweet.text,
    author_username: tweet.author_username,
    author_name: tweet.author_name,
    author_verified: tweet.author_verified,
    author_profile_picture_url: tweet.author_profile_picture_url,
    engagement: tweet.engagement,
    tweet_url: tweet.tweet_url,
  };
}

/**
 * Get translated sentiment label
 */
function getTranslatedSentimentLabel(
  sentimentLabel: string,
  labels: ReturnType<typeof getOpinionReportLabels>
): string {
  switch (sentimentLabel.toLowerCase()) {
    case "positive":
      return labels.positive;
    case "negative":
      return labels.negative;
    default:
      return labels.neutral;
  }
}

/**
 * Get sentiment badge styling
 */
function getSentimentBadgeClass(sentimentLabel: string): string {
  switch (sentimentLabel.toLowerCase()) {
    case "positive":
      return "border-green-500/50 text-green-600 bg-green-500/10";
    case "negative":
      return "border-red-500/50 text-red-600 bg-red-500/10";
    default:
      return "border-gray-500/50 text-gray-600 bg-gray-500/10";
  }
}

// ============================================================================
// Component
// ============================================================================

interface OpinionReportViewProps {
  report: OpinionReportData;
  /** Optional: hide header (for compact mode) */
  hideHeader?: boolean;
  /** Optional: limit number of clusters shown */
  maxClusters?: number;
  /** Optional: language for UI labels (default: en) */
  language?: SupportedLanguage;
  className?: string;
}

export function OpinionReportView({
  report,
  hideHeader = false,
  maxClusters,
  language = "en",
  className,
}: OpinionReportViewProps) {
  const clusters = maxClusters
    ? report.clusters.slice(0, maxClusters)
    : report.clusters;

  // Get translated labels for UI
  const labels = getOpinionReportLabels(language);

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header Card */}
        {!hideHeader && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-lg font-semibold mb-3">{labels.title}</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {report.session.total_tweets_analyzed.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {labels.tweetsAnalyzed}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {report.session.total_clusters}
                </div>
                <div className="text-xs text-muted-foreground">
                  {labels.clusters}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {report.session.data_period.display}
                </div>
                <div className="text-xs text-muted-foreground">
                  {labels.period}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Opinion Evolution Chart (stacked area - same as Analysis page) */}
        {report.evolution_chart && report.evolution_chart.data?.length > 1 && (
          <ChatOpinionEvolutionChart
            title={report.evolution_chart.title || "Opinion Evolution"}
            description={report.evolution_chart.description}
            data={report.evolution_chart.data}
            clusters={report.evolution_chart.clusters}
            config={report.evolution_chart.config}
          />
        )}

        {/* Clusters */}
        {clusters.map((cluster, idx) => (
          <div key={idx} className="rounded-xl border bg-card p-5 space-y-4">
            {/* Cluster header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Color indicator */}
                  {cluster.color && (
                    <div
                      className="size-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cluster.color }}
                    />
                  )}
                  <h4 className="text-base font-semibold">{cluster.label}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {cluster.percentage}%
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getSentimentBadgeClass(cluster.sentiment_label)}
                  >
                    {getTranslatedSentimentLabel(cluster.sentiment_label, labels)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Full Description */}
            {cluster.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cluster.description}
              </p>
            )}

            {/* Keywords */}
            {cluster.keywords && cluster.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cluster.keywords.slice(0, 8).map((kw, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}

            {/* Tweet examples */}
            {cluster.examples && cluster.examples.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-2 font-medium">
                  {labels.representativeTweets}
                </div>
                <TweetCardList tweets={cluster.examples.map(toTweetData)} compact />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Re-export types for consumers
export type { TweetData };
