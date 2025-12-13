/**
 * Types for Tiptap custom node extensions
 * Used for embedding rich content in reports
 */

import type { TweetData } from "@/components/ui/tweet-card";
import type { TikTokVideoData } from "@/components/ui/tiktok-video-card";
import type { ArticleData } from "@/components/ui/article-card";
import type { AccountData } from "@/components/ui/account-card";
import type { ChartConfig } from "@/components/ui/chart";
import type { OpinionReportData } from "@/components/ui/opinion-report-view";

// ============================================================================
// Chart Node Types
// ============================================================================

export interface ChartNodeAttributes {
  type: "line" | "bar" | "area";
  title: string;
  data: Array<{ timestamp: string; value: number; label: string }>;
  config: ChartConfig;
}

// ============================================================================
// Tweet Node Types
// ============================================================================

export interface TweetNodeAttributes {
  tweet: TweetData;
}

// ============================================================================
// TikTok Node Types
// ============================================================================

export interface TikTokNodeAttributes {
  video: TikTokVideoData;
}

// ============================================================================
// Article Node Types
// ============================================================================

export interface ArticleNodeAttributes {
  article: ArticleData;
}

// ============================================================================
// Account Node Types
// ============================================================================

export interface AccountNodeAttributes {
  account: AccountData;
}

// ============================================================================
// Stats Card Node Types
// ============================================================================

export interface StatsCardNodeAttributes {
  title: string;
  stats: Array<{
    label: string;
    value: string | number;
    change?: number;
    trend?: "up" | "down" | "neutral";
  }>;
  period?: string;
}

// ============================================================================
// Opinion Report Node Types
// ============================================================================

export interface OpinionReportNodeAttributes {
  /** Serialized JSON string of OpinionReportData */
  reportData: string;
}

// Re-export for convenience
export type { OpinionReportData };

// ============================================================================
// Union type for all embeddable content
// ============================================================================

export type EmbeddableContent =
  | { type: "chart"; data: ChartNodeAttributes }
  | { type: "tweet"; data: TweetNodeAttributes }
  | { type: "tiktok"; data: TikTokNodeAttributes }
  | { type: "article"; data: ArticleNodeAttributes }
  | { type: "account"; data: AccountNodeAttributes }
  | { type: "stats"; data: StatsCardNodeAttributes }
  | { type: "opinionReport"; data: OpinionReportNodeAttributes };

