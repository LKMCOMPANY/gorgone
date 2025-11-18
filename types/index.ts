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
  [clusterKey: `cluster_${number}`]: number; // Tweet count per cluster
}

// Cluster Color Palette
export const OPINION_CLUSTER_COLORS = [
  "#0077BB", // Blue
  "#EE7733", // Orange
  "#009988", // Teal
  "#CC3311", // Red
  "#33BBEE", // Cyan
  "#EE3377", // Magenta
  "#BBBBBB", // Grey
  "#000000", // Black
  "#AA3377", // Purple
  "#DDAA33", // Gold
  "#004488", // Dark Blue
  "#BB5566", // Rose
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
