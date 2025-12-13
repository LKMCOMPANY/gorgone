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
 * - Sentiment evolution chart (optional)
 * - Cluster cards with labels, percentages, descriptions, keywords
 * - Representative tweets per cluster
 */

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { TweetCardList, type TweetData } from "@/components/ui/tweet-card";
import { ChatChart } from "@/components/dashboard/chat/chat-chart";

// ============================================================================
// Types
// ============================================================================

/** Visualization/Chart data structure */
export interface VisualizationData {
  _type?: "visualization";
  chart_type: "line" | "bar" | "area";
  title: string;
  data: Array<{ timestamp: string; value: number; label: string }>;
  config: Record<string, { label: string; color?: string }>;
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
  /** Sentiment evolution chart (optional) */
  sentiment_evolution_chart?: VisualizationData | null;
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

// ============================================================================
// Component
// ============================================================================

interface OpinionReportViewProps {
  report: OpinionReportData;
  /** Optional: hide header (for compact mode) */
  hideHeader?: boolean;
  /** Optional: limit number of clusters shown */
  maxClusters?: number;
  className?: string;
}

export function OpinionReportView({
  report,
  hideHeader = false,
  maxClusters,
  className,
}: OpinionReportViewProps) {
  const clusters = maxClusters
    ? report.clusters.slice(0, maxClusters)
    : report.clusters;

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header Card */}
        {!hideHeader && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-lg font-semibold mb-3">Opinion Report</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {report.session.total_tweets_analyzed.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Tweets Analyzed
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {report.session.total_clusters}
                </div>
                <div className="text-xs text-muted-foreground">Clusters</div>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {report.session.data_period.display}
                </div>
                <div className="text-xs text-muted-foreground">Period</div>
              </div>
            </div>
          </div>
        )}

        {/* Sentiment Evolution Chart (if available) */}
        {report.sentiment_evolution_chart && (
          <div className="rounded-xl border bg-card p-5">
            <ChatChart
              type={report.sentiment_evolution_chart.chart_type}
              title={report.sentiment_evolution_chart.title}
              data={report.sentiment_evolution_chart.data}
              config={report.sentiment_evolution_chart.config}
            />
          </div>
        )}

        {/* Clusters */}
        {clusters.map((cluster, idx) => (
          <div key={idx} className="rounded-xl border bg-card p-5 space-y-4">
            {/* Cluster header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-semibold">{cluster.label}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {cluster.percentage}%
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      cluster.sentiment_label === "positive"
                        ? "border-green-500/50 text-green-600 bg-green-500/10"
                        : cluster.sentiment_label === "negative"
                          ? "border-red-500/50 text-red-600 bg-red-500/10"
                          : "border-gray-500/50 text-gray-600 bg-gray-500/10"
                    }
                  >
                    {cluster.sentiment_label}
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
                  Representative Tweets
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

