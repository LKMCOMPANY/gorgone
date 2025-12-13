/**
 * Tiptap Extensions Index
 * 
 * All custom node extensions use the `rendered: false` pattern for attributes,
 * ensuring proper JSON serialization without HTML attr interference.
 */

// Node Extensions
export { ChartNode, createChartNode } from "./chart-node";
export { TweetNode, createTweetNode } from "./tweet-node";
export { TikTokNode, createTikTokNode } from "./tiktok-node";
export { ArticleNode, createArticleNode } from "./article-node";
export { AccountNode, createAccountNode } from "./account-node";
export { StatsNode, createStatsNode } from "./stats-node";
export { OpinionReportNode, createOpinionReportNode } from "./opinion-report-node";

// Types
export type {
  ChartNodeAttributes,
  TweetNodeAttributes,
  TikTokNodeAttributes,
  ArticleNodeAttributes,
  AccountNodeAttributes,
  StatsCardNodeAttributes,
  OpinionReportNodeAttributes,
  EmbeddableContent,
} from "./types";

// ============================================================================
// All Custom Report Extensions Array (for easy import into editor)
// ============================================================================

import { ChartNode } from "./chart-node";
import { TweetNode } from "./tweet-node";
import { TikTokNode } from "./tiktok-node";
import { ArticleNode } from "./article-node";
import { AccountNode } from "./account-node";
import { StatsNode } from "./stats-node";
import { OpinionReportNode } from "./opinion-report-node";

export const reportExtensions = [
  ChartNode,
  TweetNode,
  TikTokNode,
  ArticleNode,
  AccountNode,
  StatsNode,
  OpinionReportNode,
];
