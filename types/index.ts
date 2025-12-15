/**
 * Centralized types for Gorgone V2
 * Social media monitoring platform
 */

// User roles
export type UserRole = "super_admin" | "admin" | "operator" | "manager";

// Client (Operation) type
export interface Client {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// Client with user count
export interface ClientWithStats extends Client {
  user_count: number;
}

// Database profile type
export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  organization: string | null;
  client_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// User type (combination of auth.users + profiles)
export interface User {
  id: string;
  email: string;
  role: UserRole;
  organization: string | null;
  client_id: string | null;
  created_at: string;
}

// Client user (user with profile info and client relationship)
export interface ClientUser {
  id: string;
  email: string;
  role: UserRole;
  organization: string | null;
  client_id: string;
  created_at: string;
  updated_at: string;
}

// Zone data sources configuration
export interface ZoneDataSources {
  twitter: boolean;
  tiktok: boolean;
  media: boolean;
}

// Zone type
export interface Zone {
  id: string;
  name: string;
  client_id: string;
  operational_context: string | null;
  data_sources: ZoneDataSources;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// Zone with additional client information
export interface ZoneWithClient extends Zone {
  client?: Client;
}

// Authentication types
export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Monitoring data types
export interface MonitoringData {
  id: string;
  source: string;
  content: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// Metrics types
export interface Metrics {
  total: number;
  growth: number;
  period: string;
}

export type ApiResponse<T> = {
  data: T;
  error?: string;
  status: "success" | "error";
};

// =====================================================
// TWITTER INTEGRATION TYPES
// =====================================================

// Twitter Profile Tag Types (for Share of Voice)
export type TwitterProfileTagType =
  | "attila"
  | "local_team"
  | "target"
  | "surveillance"
  | "ally"
  | "asset"
  | "adversary";

// Twitter Engagement Tracking Tiers
export type TwitterEngagementTier = "ultra_hot" | "hot" | "warm" | "cold";

// Twitter Rule Query Types
export type TwitterQueryType = "simple" | "builder";

// Twitter Entity Types
export type TwitterEntityType = "hashtag" | "mention" | "url";

// =====================================================
// Query Builder Configuration
// =====================================================

export interface TwitterQueryBuilderConfig {
  keywords: string[];
  hashtags: string[];
  mentions: string[];
  from_users: string[];
  to_users: string[];
  exclude_keywords: string[];
  exclude_users: string[];
  verified_only: boolean;
  has_media: boolean;
  has_links: boolean;
  min_retweets: number | null;
  min_likes: number | null;
  min_replies: number | null;
  interval?: number;
  date_range?: {
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
  lang?: string;
}

// =====================================================
// Database Tables Types
// =====================================================

// Twitter Profile (normalized)
export interface TwitterProfile {
  id: string;
  twitter_user_id: string;
  username: string;
  name: string;
  profile_picture_url: string | null;
  cover_picture_url: string | null;
  description: string | null;
  location: string | null;
  is_verified: boolean;
  is_blue_verified: boolean;
  verified_type: string | null;
  followers_count: number;
  following_count: number;
  tweets_count: number;
  media_count: number;
  favourites_count: number;
  twitter_created_at: string | null;
  is_automated: boolean;
  automated_by: string | null;
  can_dm: boolean;
  possibly_sensitive: boolean;
  profile_url: string | null;
  twitter_url: string | null;
  raw_data: Record<string, unknown> | null;
  first_seen_at: string;
  last_seen_at: string;
  last_updated_at: string;
  total_tweets_collected: number;
  created_at: string;
  updated_at: string;
}

// Twitter Tweet
export interface TwitterTweet {
  id: string;
  zone_id: string;
  tweet_id: string;
  author_profile_id: string;
  conversation_id: string | null;
  text: string;
  lang: string | null;
  source: string | null;
  twitter_created_at: string;
  collected_at: string;
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  view_count: number;
  bookmark_count: number;
  total_engagement: number;
  has_media: boolean;
  has_links: boolean;
  has_hashtags: boolean;
  has_mentions: boolean;
  is_reply: boolean;
  in_reply_to_tweet_id: string | null;
  in_reply_to_user_id: string | null;
  in_reply_to_username: string | null;
  tweet_url: string | null;
  twitter_url: string | null;
  raw_data: Record<string, unknown>;
  is_processed: boolean;
  sentiment_score: number | null;
  embedding: number[] | null;
  embedding_model: string | null;
  embedding_created_at: string | null;
  predictions: TweetPredictions | null; // Engagement predictions
  created_at: string;
  updated_at: string;
}

// Tweet with Profile
export interface TwitterTweetWithProfile extends TwitterTweet {
  author: TwitterProfile;
}

// Tweet with opinion cluster data (for analysis features)
export interface TwitterTweetWithCluster extends TwitterTweetWithProfile {
  cluster: TwitterOpinionCluster | null;
  cluster_confidence: number | null;
}

// Twitter Engagement History
export interface TwitterEngagementHistory {
  id: string;
  tweet_id: string;
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  view_count: number;
  bookmark_count: number;
  total_engagement: number;
  delta_retweets: number;
  delta_replies: number;
  delta_likes: number;
  delta_quotes: number;
  delta_views: number;
  engagement_velocity: number | null;
  snapshot_at: string;
  created_at: string;
}

// Twitter Profile Snapshot
export interface TwitterProfileSnapshot {
  id: string;
  profile_id: string;
  followers_count: number;
  following_count: number;
  tweets_count: number;
  favourites_count: number;
  delta_followers: number;
  delta_following: number;
  delta_tweets: number;
  followers_growth_rate: number | null;
  snapshot_at: string;
  created_at: string;
}

// Twitter Entity
export interface TwitterEntity {
  id: string;
  tweet_id: string;
  zone_id: string;
  entity_type: TwitterEntityType;
  entity_value: string;
  entity_normalized: string;
  start_index: number | null;
  end_index: number | null;
  created_at: string;
}

// Twitter Rule
export interface TwitterRule {
  id: string;
  zone_id: string;
  tag: string;
  query: string;
  query_type: TwitterQueryType;
  interval_seconds: number;
  query_builder_config: TwitterQueryBuilderConfig | null;
  external_rule_id: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// Twitter Profile Zone Tag
export interface TwitterProfileZoneTag {
  id: string;
  profile_id: string;
  zone_id: string;
  tag_type: TwitterProfileTagType;
  notes: string | null;
  confidence_score: number | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// Twitter Engagement Tracking
export interface TwitterEngagementTracking {
  id: string;
  tweet_db_id: string;
  tier: TwitterEngagementTier;
  last_updated_at: string;
  next_update_at: string | null;
  update_count: number;
  created_at: string;
}

// =====================================================
// Predictions Types
// =====================================================

// Single metric prediction (for likes, retweets, etc.)
export interface MetricPrediction {
  current: number;
  velocity: number; // Change per hour
  p1h: number; // Predicted value in 1 hour
  p2h: number; // Predicted value in 2 hours
  p3h: number; // Predicted value in 3 hours
}

// Complete tweet predictions (stored in twitter_tweets.predictions JSONB)
export interface TweetPredictions {
  calculated_at: string; // ISO timestamp
  snapshots_used: number; // Number of snapshots used for calculation
  confidence: number; // 0-1 (based on snapshots / 6)
  
  engagement: {
    likes: MetricPrediction;
    retweets: MetricPrediction;
    replies: MetricPrediction;
    quotes: MetricPrediction;
  };
  
  reach: {
    views: MetricPrediction;
  };
  
  model_version?: string; // For future model evolution
}

// Tweet with predictions included
export interface TwitterTweetWithPredictions extends TwitterTweet {
  predictions: TweetPredictions | null;
}

// =====================================================
// Materialized Views Types
// =====================================================

// Zone Stats (Hourly)
export interface TwitterZoneStatsHourly {
  zone_id: string;
  hour: string;
  total_tweets: number;
  unique_authors: number;
  total_retweets: number;
  total_replies: number;
  total_likes: number;
  total_quotes: number;
  total_views: number;
  total_engagement: number;
  avg_engagement: number;
  avg_retweets: number;
  avg_likes: number;
  tweets_with_media: number;
  tweets_with_links: number;
  reply_tweets: number;
  avg_sentiment: number | null;
}

// Zone Stats (Daily)
export interface TwitterZoneStatsDaily extends TwitterZoneStatsHourly {
  day: string;
}

// Top Profile by Zone
export interface TwitterTopProfile {
  zone_id: string;
  profile_id: string;
  twitter_user_id: string;
  username: string;
  name: string;
  profile_picture_url: string | null;
  is_verified: boolean;
  is_blue_verified: boolean;
  followers_count: number;
  tweet_count: number;
  total_engagement: number;
  avg_engagement: number;
  last_tweet_at: string;
}

// Top Tweet by Zone
export interface TwitterTopTweet {
  zone_id: string;
  tweet_id: string;
  twitter_tweet_id: string;
  text: string;
  author_profile_id: string;
  author_username: string;
  author_name: string;
  twitter_created_at: string;
  current_engagement: number;
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  view_count: number;
  period_start: string;
  period_end: string;
}

// Trending Hashtag
export interface TwitterTrendingHashtag {
  zone_id: string;
  hashtag: string;
  original_hashtag: string;
  tweet_count_24h: number;
  unique_authors_24h: number;
  total_engagement_24h: number;
  last_used_at: string;
}

// Share of Voice
export interface TwitterShareOfVoice {
  zone_id: string;
  tag_type: TwitterProfileTagType;
  tag_tweets: number;
  tag_engagement: number;
  tag_unique_authors: number;
  total_zone_tweets: number;
  total_zone_engagement: number;
  volume_percentage: number;
  engagement_percentage: number;
}

// =====================================================
// Regular Views Types
// =====================================================

// Thread with Context
export interface TwitterThreadContext {
  id: string;
  tweet_id: string;
  conversation_id: string | null;
  text: string;
  author_profile_id: string;
  in_reply_to_tweet_id: string | null;
  twitter_created_at: string;
  total_engagement: number;
  depth: number;
  path: string[];
  root_tweet_id: string;
}

// Thread View (alias for ThreadContext)
export type TwitterThreadView = TwitterThreadContext;

// Orphaned Reply
export interface TwitterOrphanedReply extends TwitterTweet {
  missing_parent_id: string;
}

// =====================================================
// API Response Types (TwitterAPI.io)
// =====================================================

// Search Response
export interface TwitterAPISearchResponse {
  tweets: TwitterAPITweet[];
  has_next_page: boolean;
  next_cursor: string | null;
}

// Webhook Payload
export interface TwitterAPIWebhookPayload {
  event_type: "tweet";
  rule_id: string;
  rule_tag: string;
  tweets: TwitterAPITweet[];
  timestamp: number;
}

// Tweet from API (camelCase from twitterapi.io)
export interface TwitterAPITweet {
  type: "tweet";
  id: string;
  url: string;
  text: string;
  source: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount?: number;
  createdAt: string;
  lang: string;
  bookmarkCount?: number;
  isReply?: boolean;
  inReplyToId?: string;
  conversationId: string;
  displayTextRange?: [number, number];
  inReplyToUserId?: string;
  inReplyToUsername?: string;
  author?: TwitterAPIUser;
  entities?: TwitterAPIEntities;
  quoted_tweet?: any;
  retweeted_tweet?: any;
  isLimitedReply?: boolean;
}

// User from API
export interface TwitterAPIUser {
  type?: "user";
  id: string;
  userName: string; // CamelCase as per API
  url: string;
  name: string;
  isBlueVerified?: boolean;
  verifiedType?: string;
  profilePicture?: string;
  coverPicture?: string;
  description?: string;
  profile_bio?: {
    description?: string;
    entities?: {
      url?: {
        urls?: Array<{
          url: string;
          display_url: string;
          expanded_url: string;
          indices?: number[];
        }>;
      };
      description?: Record<string, any>;
    };
  };
  location?: string;
  followers?: number;
  following?: number;
  canDm?: boolean;
  createdAt?: string;
  favouritesCount?: number;
  hasCustomTimelines?: boolean;
  isTranslator?: boolean;
  mediaCount?: number;
  statusesCount?: number;
  withheldInCountries?: string[];
  possiblySensitive?: boolean;
  pinnedTweetIds?: string[];
  isAutomated?: boolean;
  automatedBy?: string;
  unavailable?: boolean;
  message?: string;
  unavailableReason?: string;
}

// Entities from API (exact structure from twitterapi.io)
export interface TwitterAPIEntities {
  user_mentions?: Array<{
    id_str: string;
    name: string;
    screen_name: string;
    indices?: [number, number];
  }>;
  hashtags?: Array<{
    text: string;
    indices?: [number, number];
  }>;
  urls?: Array<{
    url: string;
    expanded_url?: string;
    display_url?: string;
    indices?: [number, number];
  }>;
}

// =====================================================
// Utility Types
// =====================================================

// Profile Ratios
export interface TwitterProfileRatios {
  total_posts: number;
  original_posts: number;
  replies: number;
  retweets: number;
  reply_ratio: number;
  retweet_ratio: number;
  original_ratio: number;
}

// Volume Chart Data Point
export interface TwitterVolumeChartData {
  hour: string;
  total_tweets: number;
  total_engagement: number;
  unique_authors: number;
  total_retweets: number;
  total_replies: number;
  total_likes: number;
  total_quotes: number;
}

// Time Period Options
export type TwitterTimePeriod = "3h" | "6h" | "12h" | "24h" | "7d" | "30d";

// Convert period to hours
export const TWITTER_PERIOD_HOURS: Record<TwitterTimePeriod, number> = {
  "3h": 3,
  "6h": 6,
  "12h": 12,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

// ============================================================================
// OPINION MAP TYPES
// ============================================================================

// Opinion Session Status
export type OpinionSessionStatus =
  | "pending"
  | "vectorizing"
  | "reducing"
  | "clustering"
  | "labeling"
  | "completed"
  | "failed"
  | "cancelled";

// Tweet Projection (3D coordinates + cluster)
export interface TwitterTweetProjection {
  id: string;
  tweet_db_id: string;
  zone_id: string;
  session_id: string;
  x: number; // 0-100 normalized
  y: number; // 0-100 normalized
  z: number; // 0-100 normalized
  cluster_id: number;
  cluster_confidence: number; // 0-1
  created_at: string;
}

// Tweet Projection with full tweet data (for UI)
export interface TwitterTweetProjectionWithTweet extends TwitterTweetProjection {
  tweet: TwitterTweetWithProfile;
}

// Alias for enriched projections (used in opinion map UI)
export type EnrichedTwitterProjection = TwitterTweetProjection & {
  tweet_id: string
  text: string
  twitter_created_at: string
  author_profile_id: string
  retweet_count: number
  reply_count: number
  like_count: number
  quote_count: number
  view_count: number
  total_engagement: number
  has_media: boolean
  has_links: boolean
  has_hashtags: boolean
  author_name: string
  author_username: string
  author_profile_picture_url: string | null
  author_verified: boolean
  author_followers_count: number
  raw_data: Record<string, unknown>
}

// Opinion Cluster Metadata
export interface TwitterOpinionCluster {
  id: string;
  zone_id: string;
  session_id: string;
  cluster_id: number;
  label: string;
  keywords: string[];
  reasoning: string | null;
  tweet_count: number;
  centroid_x: number; // 0-100 normalized
  centroid_y: number; // 0-100 normalized
  centroid_z: number; // 0-100 normalized
  avg_sentiment: number | null; // -1 to 1
  coherence_score: number | null; // 0-1
  created_at: string;
}

// Opinion Session (job tracking)
export interface TwitterOpinionSession {
  id: string;
  zone_id: string;
  session_id: string;
  status: OpinionSessionStatus;
  progress: number; // 0-100
  current_phase: string | null;
  phase_message: string | null;
  config: OpinionSessionConfig;
  total_tweets: number | null;
  vectorized_tweets: number;
  total_clusters: number | null;
  outlier_count: number | null;
  execution_time_ms: number | null;
  error_message: string | null;
  error_stack: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
}

// Opinion Session Configuration
export interface OpinionSessionConfig {
  start_date: string; // ISO 8601
  end_date: string; // ISO 8601
  sample_size: number;
  sampled_tweet_ids?: string[];
  actual_sample_size?: number;
  enable_3d?: boolean;
  sampling_strategy?: "stratified" | "uniform" | "hybrid";
}

// Opinion Evolution Data Point (for time series chart)
export interface OpinionEvolutionData {
  date: string; // YYYY-MM-DD or YYYY-MM-DD HH:00
  [key: string]: string | number; // Tweet count per cluster
}

// Modern Cluster Color Palette - 36 perceptually distinct colors
// Optimized for both light and dark modes with high contrast and elegance
export const OPINION_CLUSTER_COLORS = [
  // Primary Vibrant Colors
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  
  // Secondary Rich Colors
  "#6366F1", // Indigo
  "#84CC16", // Lime
  "#14B8A6", // Teal
  "#F43F5E", // Rose
  "#A855F7", // Violet
  "#EAB308", // Yellow
  "#0EA5E9", // Sky
  "#FB923C", // Orange Light
  
  // Tertiary Sophisticated Colors
  "#8B5A3C", // Brown
  "#64748B", // Slate
  "#7C3AED", // Purple Deep
  "#DC2626", // Red Dark
  "#059669", // Emerald
  "#D97706", // Amber Dark
  "#2563EB", // Blue Deep
  "#BE123C", // Rose Dark
  
  // Quaternary Elegant Colors
  "#4F46E5", // Indigo Dark
  "#65A30D", // Lime Dark
  "#0D9488", // Teal Dark
  "#DB2777", // Pink Dark
  "#9333EA", // Violet Dark
  "#CA8A04", // Yellow Dark
  "#0284C7", // Sky Dark
  "#EA580C", // Orange Deep
  
  // Accent Colors
  "#7E22CE", // Purple Extra
  "#16A34A", // Green Deep
  "#0891B2", // Cyan Dark
  "#BE185D", // Pink Extra
] as const;

// Get cluster color by index
export function getOpinionClusterColor(clusterId: number): string {
  return OPINION_CLUSTER_COLORS[clusterId % OPINION_CLUSTER_COLORS.length];
}

// Sampling Result
export interface OpinionSamplingResult {
  tweets: TwitterTweet[];
  total_available: number;
  sampled_count: number;
  buckets_used: number;
  cache_hit_rate?: number; // % of tweets already embedded
}

// Embedding Result (from OpenAI)
export interface OpinionEmbeddingResult {
  success: boolean;
  embedding?: number[]; // 1536-dimensional vector
  error?: string;
  tokens_used?: number;
}

// Clustering Result (from K-means)
export interface OpinionClusteringResult {
  labels: number[]; // Cluster assignment per tweet
  confidence: number[]; // Confidence score per tweet
  centroids: number[][]; // Cluster centroids in 20D space
  cluster_count: number;
  outlier_count: number;
  silhouette_score?: number; // Quality metric
}

// UMAP Projection Result
export interface OpinionUMAPResult {
  projections: number[][]; // [x, y, z] coordinates
  processing_time_ms: number;
  explained_variance?: number;
}

// AI Labeling Result
export interface OpinionLabelingResult {
  label: string;
  keywords: string[];
  sentiment: number; // -1 to 1
  confidence: number; // 0-1
  reasoning?: string;
}

// Selection State (for UI interactions)
export type OpinionSelectionState =
  | { type: "none" }
  | { type: "selected"; tweetId: string; clusterId: number };

// ============================================================================
// END OPINION MAP TYPES
// ============================================================================

// ============================================================================
// MEDIA MONITORING TYPES (Event Registry API)
// ============================================================================

/**
 * Media Article from Event Registry
 */
export interface MediaArticle {
  id: string;
  zone_id: string;
  article_uri: string;
  event_uri: string | null;
  title: string;
  body: string;
  url: string;
  lang: string;
  published_at: string;
  collected_at: string;
  source_uri: string;
  source_title: string;
  source_description: string | null;
  source_location_country: string | null;
  source_location_label: string | null;
  authors: any[];
  image_url: string | null;
  videos: any[];
  sentiment: number | null;
  relevance: number | null;
  social_score: number;
  shares_facebook: number;
  shares_twitter: number;
  shares_total: number;
  categories: any[];
  concepts: any[];
  location_label: string | null;
  location_country: string | null;
  extracted_dates: any[];
  links: any[];
  is_duplicate: boolean;
  duplicate_list: any[];
  original_article_uri: string | null;
  is_processed: boolean;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

/**
 * Media Source (normalized)
 */
export interface MediaSource {
  id: string;
  source_uri: string;
  title: string;
  website_url: string | null;
  description: string | null;
  location_country: string | null;
  location_label: string | null;
  importance_rank: number | null;
  alexa_global_rank: number | null;
  alexa_country_rank: number | null;
  source_type: string | null;
  language: string | null;
  article_count: number;
  first_seen_at: string;
  last_seen_at: string;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

/**
 * Media Rule configuration
 */
export interface MediaRule {
  id: string;
  zone_id: string;
  name: string;
  description: string | null;
  query_type: "simple" | "advanced";
  query_config: Record<string, any>;
  fetch_interval_minutes: number;
  articles_per_fetch: number;
  sort_by: "date" | "rel" | "sourceImportance" | "socialScore";
  sort_asc: boolean;
  data_types: string[];
  force_max_data_time_window: number | null;
  duplicate_filter: "skipDuplicates" | "keepOnlyDuplicates" | "keepAll";
  event_filter: "skipArticlesWithoutEvent" | "keepOnlyArticlesWithoutEvent" | "keepAll";
  include_body: boolean;
  include_social_score: boolean;
  include_sentiment: boolean;
  include_concepts: boolean;
  include_categories: boolean;
  include_authors: boolean;
  include_videos: boolean;
  include_links: boolean;
  is_active: boolean;
  last_fetched_at: string | null;
  last_fetch_status: string | null;
  last_fetch_error: string | null;
  articles_collected: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/**
 * Media Rule with statistics
 */
export interface MediaRuleWithStats extends MediaRule {
  recent_articles_count?: number;
  last_24h_articles_count?: number;
}

// ============================================================================
// END MEDIA MONITORING TYPES
// ============================================================================

// ============================================================================
// CHAT INTELLIGENCE TYPES
// ============================================================================

export interface ChatConversation {
  id: string;
  zone_id: string;
  client_id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: Record<string, unknown>;
  tool_results?: Record<string, unknown>;
  created_at: string;
}

export interface ChatUsage {
  id: string;
  conversation_id: string | null;
  zone_id: string;
  client_id: string;
  user_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number | null;
  created_at: string;
}

export interface ChatReport {
  id: string;
  conversation_id: string | null;
  zone_id: string;
  client_id: string;
  title: string;
  summary: string | null;
  content: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

// ============================================================================
// END CHAT INTELLIGENCE TYPES
// ============================================================================

// ============================================================================
// ATTILA AUTOMATION TYPES
// ============================================================================

export type AttilaOperationType = "sniper" | "sentinel" | "influence";

export type AttilaOperationStatus = "draft" | "active" | "paused" | "completed";

export interface AttilaOperationConfig {
  context: string;
  guidelines: string;
  language_elements: string;
  
  // Sniper specific
  engagement_threshold?: number;
  post_types?: ("original" | "reply" | "quote" | "retweet")[];
  profile_types?: TwitterProfileTagType[];
  
  // Sentinel specific
  alert_threshold?: number;
  
  // Influence specific
  target_clusters?: number[];
}

export interface AttilaOperation {
  id: string;
  zone_id: string;
  name: string;
  status: AttilaOperationStatus;
  type: AttilaOperationType;
  config: AttilaOperationConfig;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// END ATTILA AUTOMATION TYPES
// ============================================================================

// =====================================================
// REPORTS TYPES
// =====================================================

export type ReportStatus = "draft" | "published";

// Tiptap document structure
export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface TiptapDocument {
  type: "doc";
  content: TiptapNode[];
}

// Embedded items in reports
export interface ReportEmbeddedPost {
  id: string;
  type: "twitter" | "tiktok" | "media";
  postData: Record<string, unknown>;
}

export interface ReportEmbeddedChart {
  id: string;
  type: "line" | "bar" | "area";
  title: string;
  data: Array<{ timestamp: string; value: number; label?: string }>;
  config?: Record<string, unknown>;
}

export interface ReportEmbeddedStat {
  id: string;
  label: string;
  value: number | string;
  change?: number;
  changeType?: "positive" | "negative" | "neutral";
}

export interface ReportEmbeddedItems {
  posts: ReportEmbeddedPost[];
  charts: ReportEmbeddedChart[];
  stats: ReportEmbeddedStat[];
}

// Report configuration
export interface ReportConfig {
  period: "3h" | "6h" | "12h" | "24h" | "7d" | "30d";
  start_date: string;
  end_date: string;
  data_sources: ("twitter" | "tiktok" | "media")[];
  ai_language?: string;
}

// Report metadata
export interface ReportMetadata {
  version: string;
  word_count: number;
  last_edited_at: string;
  template_id?: string;
}

// Full report content structure (stored in JSONB)
export interface ReportContent {
  tiptap_document: TiptapDocument;
  config: ReportConfig;
  metadata: ReportMetadata;
  embedded_items: ReportEmbeddedItems;
  template_id?: string;
}

// Report entity
export interface Report {
  id: string;
  zone_id: string;
  client_id: string;
  conversation_id: string | null;
  title: string;
  summary: string | null;
  status: ReportStatus;
  content: ReportContent;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Sharing fields
  share_token?: string | null;
  share_password_hash?: string | null;
  published_at?: string | null;
}

// Report with zone information
export interface ReportWithZone extends Report {
  zone?: {
    id: string;
    name: string;
  };
}

// Report list item (lightweight for listing)
export interface ReportListItem {
  id: string;
  title: string;
  status: ReportStatus;
  zone_id: string;
  zone_name?: string;
  created_at: string;
  updated_at: string;
  word_count?: number;
  share_token?: string | null;
  published_at?: string | null;
}

// Published report data (for public viewing)
export interface PublishedReportData {
  id: string;
  title: string;
  content: ReportContent;
  zone_name: string | null;
  published_at: string;
  has_password: boolean;
}

// Result from publishing a report
export interface PublishReportResult {
  report?: Report;
  shareToken: string;
  password: string;
  shareUrl: string;
}

// =====================================================
// END REPORTS TYPES
// =====================================================
