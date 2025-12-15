/**
 * Tiptap Extensions Index
 * 
 * All custom node extensions use the same pattern for Tiptap 3.x:
 * - `default: null` for proper JSON serialization (attrs != default are serialized)
 * - `parseHTML` and `renderHTML` functions for HTML attribute mapping
 * - Data stored as JSON-stringified strings in data-* attributes
 * - Helper parse functions to handle both string and object formats
 * 
 * Content is serialized as JSON string before Server Action transmission
 * to prevent data loss with complex nested objects (see report-editor-page.tsx)
 */

// Node Extensions
export { ChartNode, createChartNode } from "./chart-node";
export { TweetNode, createTweetNode } from "./tweet-node";
export { TikTokNode, createTikTokNode } from "./tiktok-node";
export { ArticleNode, createArticleNode } from "./article-node";
export { AccountNode, createAccountNode } from "./account-node";
export { StatsNode, createStatsNode } from "./stats-node";
export { OpinionReportNode, createOpinionReportNode } from "./opinion-report-node";
export { ImageNode, createImageNode } from "./image-node";

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
export type { ImageNodeAttributes } from "./image-node";

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
import { ImageNode } from "./image-node";

export const reportExtensions = [
  ChartNode,
  TweetNode,
  TikTokNode,
  ArticleNode,
  AccountNode,
  StatsNode,
  OpinionReportNode,
  ImageNode,
];
