# Twitter Database Architecture - Optimized for High Volume

**Goal**: Handle 10,000+ tweets/hour with modular data access for multiple analytics modules  
**Principles**: Normalization, Indexing, Aggregation, Time-series optimization  
**Date**: November 13, 2025

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Tables](#core-tables)
3. [Optimization Strategies](#optimization-strategies)
4. [Data Layer Design](#data-layer-design)
5. [Query Patterns](#query-patterns)
6. [Scaling Considerations](#scaling-considerations)

---

## Architecture Overview

### Design Principles

1. **Normalization**: Avoid duplicates (profiles, entities)
2. **Time-series Optimization**: Efficient historical data storage
3. **Pre-aggregation**: Materialized views for analytics
4. **Smart Indexing**: Indexes matching query patterns
5. **Modular Access**: Single data layer for all modules

### Data Flow

```
Twitter API → Webhook → Processor → Database
                                  ↓
                            Data Layer
                                  ↓
        ┌──────────────┬──────────────┬──────────────┐
        ↓              ↓              ↓              ↓
    Feed Module   Analytics    Top Users    Trends
                   Module        Module      Module
```

---

## Core Tables

### 1. `twitter_profiles` - User Profile Management

**Purpose**: Store Twitter user profiles separately to avoid duplication and enable profile monitoring.

**Key Insight**: Same users appear in multiple tweets → normalize to save space and enable profile tracking.

```sql
CREATE TABLE twitter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Twitter Identity (UNIQUE constraint for deduplication)
  twitter_user_id TEXT NOT NULL UNIQUE,     -- Twitter's user ID
  username TEXT NOT NULL,                   -- Current username (can change)
  name TEXT NOT NULL,                       -- Display name
  
  -- Profile Media
  profile_picture_url TEXT,
  cover_picture_url TEXT,
  description TEXT,
  location TEXT,
  
  -- Verification Status
  is_verified BOOLEAN DEFAULT false,        -- Legacy verification
  is_blue_verified BOOLEAN DEFAULT false,   -- Twitter Blue
  verified_type TEXT,                       -- Type of verification
  
  -- Stats (Latest snapshot)
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  tweets_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  favourites_count INTEGER DEFAULT 0,
  
  -- Account Info
  twitter_created_at TIMESTAMPTZ,           -- When account was created
  
  -- Flags
  is_automated BOOLEAN DEFAULT false,
  automated_by TEXT,
  can_dm BOOLEAN DEFAULT false,
  possibly_sensitive BOOLEAN DEFAULT false,
  
  -- URLs
  profile_url TEXT,                         -- x.com URL
  twitter_url TEXT,                         -- twitter.com URL
  
  -- Raw Data (for future reference)
  raw_data JSONB,
  
  -- Tracking
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),  -- When first captured
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),   -- Last time seen in tweets
  last_updated_at TIMESTAMPTZ DEFAULT NOW(), -- Last profile update
  
  -- Stats tracking
  total_tweets_collected INTEGER DEFAULT 0,  -- How many tweets from this user we collected
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE UNIQUE INDEX idx_twitter_profiles_twitter_id ON twitter_profiles(twitter_user_id);
CREATE INDEX idx_twitter_profiles_username ON twitter_profiles(username);
CREATE INDEX idx_twitter_profiles_followers ON twitter_profiles(followers_count DESC);
CREATE INDEX idx_twitter_profiles_last_seen ON twitter_profiles(last_seen_at DESC);
CREATE INDEX idx_twitter_profiles_total_tweets ON twitter_profiles(total_tweets_collected DESC);

-- Full-text search on name and username
CREATE INDEX idx_twitter_profiles_search ON twitter_profiles 
  USING gin(to_tsvector('english', name || ' ' || username || ' ' || COALESCE(description, '')));

-- Trigger for updated_at
CREATE TRIGGER update_twitter_profiles_updated_at
  BEFORE UPDATE ON twitter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Benefits**:
- ✅ No duplicate profile data across tweets
- ✅ Can track profile evolution (followers growth, username changes)
- ✅ Enable "Top Users" module (by followers, by tweet count)
- ✅ Profile monitoring (specific users in zone)
- ✅ 70-80% storage savings on high-volume zones

---

### 2. `twitter_tweets` - Tweet Storage (Optimized)

**Purpose**: Store tweets with reference to profiles (foreign key).

```sql
CREATE TABLE twitter_tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  -- Twitter IDs (for deduplication)
  tweet_id TEXT NOT NULL UNIQUE,            -- Twitter's unique tweet ID
  author_profile_id UUID NOT NULL           -- FK to twitter_profiles
    REFERENCES twitter_profiles(id) ON DELETE CASCADE,
  conversation_id TEXT,                     -- Thread/conversation ID
  
  -- Content
  text TEXT NOT NULL,
  lang TEXT,
  source TEXT,                              -- App used (e.g., "Twitter for iPhone")
  
  -- Timestamps
  twitter_created_at TIMESTAMPTZ NOT NULL,  -- When tweet was posted
  collected_at TIMESTAMPTZ DEFAULT NOW(),   -- When we received it
  
  -- Engagement Metrics (SNAPSHOT at collection time)
  -- These are point-in-time values. Historical tracking in twitter_engagement_history
  retweet_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  
  -- Total engagement (computed column for sorting)
  total_engagement INTEGER GENERATED ALWAYS AS 
    (retweet_count + reply_count + like_count + quote_count) STORED,
  
  -- Content Flags (for filtering)
  has_media BOOLEAN DEFAULT false,
  has_links BOOLEAN DEFAULT false,
  has_hashtags BOOLEAN DEFAULT false,
  has_mentions BOOLEAN DEFAULT false,
  
  -- Conversation Context
  is_reply BOOLEAN DEFAULT false,
  in_reply_to_tweet_id TEXT,
  in_reply_to_user_id TEXT,
  in_reply_to_username TEXT,
  
  -- URLs
  tweet_url TEXT,                           -- x.com URL
  twitter_url TEXT,                         -- twitter.com URL
  
  -- Full Tweet Data (JSONB for flexibility)
  raw_data JSONB NOT NULL,                  -- Complete tweet object
  
  -- Processing Status
  is_processed BOOLEAN DEFAULT false,
  sentiment_score DECIMAL,                  -- -1 to 1 (future: sentiment analysis)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_twitter_tweets_tweet_id ON twitter_tweets(tweet_id);
CREATE INDEX idx_twitter_tweets_zone_id ON twitter_tweets(zone_id);
CREATE INDEX idx_twitter_tweets_author ON twitter_tweets(author_profile_id);
CREATE INDEX idx_twitter_tweets_created_at ON twitter_tweets(twitter_created_at DESC);
CREATE INDEX idx_twitter_tweets_collected_at ON twitter_tweets(collected_at DESC);
CREATE INDEX idx_twitter_tweets_conversation ON twitter_tweets(conversation_id);
CREATE INDEX idx_twitter_tweets_total_engagement ON twitter_tweets(total_engagement DESC);

-- Composite indexes for common queries
CREATE INDEX idx_twitter_tweets_zone_created 
  ON twitter_tweets(zone_id, twitter_created_at DESC);
CREATE INDEX idx_twitter_tweets_zone_engagement 
  ON twitter_tweets(zone_id, total_engagement DESC);

-- Full-text search on tweet content
CREATE INDEX idx_twitter_tweets_text_search 
  ON twitter_tweets USING gin(to_tsvector('english', text));

-- GIN index for JSONB queries
CREATE INDEX idx_twitter_tweets_raw_data 
  ON twitter_tweets USING gin(raw_data);

-- Partial indexes for filtering
CREATE INDEX idx_twitter_tweets_has_media 
  ON twitter_tweets(zone_id, twitter_created_at DESC) WHERE has_media = true;
CREATE INDEX idx_twitter_tweets_is_reply 
  ON twitter_tweets(zone_id, twitter_created_at DESC) WHERE is_reply = true;
```

**Storage Optimization**:
- Profile data stored once in `twitter_profiles`
- Only FK reference here
- 60-70% size reduction vs embedding full profile

---

### 3. `twitter_engagement_history` - Time-Series Engagement Tracking

**Purpose**: Track engagement evolution over time for trending analysis and growth tracking.

**Key Insight**: Engagement metrics change over time. We need historical snapshots to:
- Show engagement growth curves
- Identify viral tweets (rapid engagement increase)
- Calculate engagement velocity
- Detect anomalies

```sql
CREATE TABLE twitter_engagement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  
  -- Engagement Snapshot
  retweet_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  
  -- Total (for quick sorting)
  total_engagement INTEGER GENERATED ALWAYS AS 
    (retweet_count + reply_count + like_count + quote_count) STORED,
  
  -- Delta from previous snapshot (computed by application)
  delta_retweets INTEGER DEFAULT 0,
  delta_replies INTEGER DEFAULT 0,
  delta_likes INTEGER DEFAULT 0,
  delta_quotes INTEGER DEFAULT 0,
  delta_views INTEGER DEFAULT 0,
  
  -- Velocity (engagement per hour since last snapshot)
  engagement_velocity DECIMAL,              -- Total engagement change / hours elapsed
  
  -- Snapshot Time
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX idx_twitter_engagement_tweet_id ON twitter_engagement_history(tweet_id);
CREATE INDEX idx_twitter_engagement_snapshot_at ON twitter_engagement_history(snapshot_at DESC);
CREATE INDEX idx_twitter_engagement_velocity ON twitter_engagement_history(engagement_velocity DESC);

-- Composite index for tweet timeline
CREATE INDEX idx_twitter_engagement_tweet_time 
  ON twitter_engagement_history(tweet_id, snapshot_at DESC);

-- Hypertable optimization (if using TimescaleDB extension)
-- SELECT create_hypertable('twitter_engagement_history', 'snapshot_at');
```

**Update Strategy**:
```typescript
// Update engagement every N hours for active tweets
// - First 24h: Every hour
// - 24-72h: Every 6 hours
// - 72h+: Every 24 hours
// - After 7 days: Stop tracking (tweet is "cold")
```

**Benefits**:
- ✅ Track viral tweets in real-time
- ✅ Show engagement growth curves
- ✅ Calculate trending scores
- ✅ Identify influential content

---

### 4. `twitter_profile_snapshots` - Profile Evolution Tracking

**Purpose**: Track profile stats evolution over time (followers growth, etc.).

```sql
CREATE TABLE twitter_profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES twitter_profiles(id) ON DELETE CASCADE,
  
  -- Stats Snapshot
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  tweets_count INTEGER DEFAULT 0,
  favourites_count INTEGER DEFAULT 0,
  
  -- Deltas from previous snapshot
  delta_followers INTEGER DEFAULT 0,
  delta_following INTEGER DEFAULT 0,
  delta_tweets INTEGER DEFAULT 0,
  
  -- Growth rate (followers per day)
  followers_growth_rate DECIMAL,
  
  -- Snapshot Time
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_twitter_profile_snapshots_profile_id 
  ON twitter_profile_snapshots(profile_id);
CREATE INDEX idx_twitter_profile_snapshots_snapshot_at 
  ON twitter_profile_snapshots(snapshot_at DESC);
CREATE INDEX idx_twitter_profile_snapshots_growth 
  ON twitter_profile_snapshots(followers_growth_rate DESC);

-- Composite for profile timeline
CREATE INDEX idx_twitter_profile_snapshots_profile_time 
  ON twitter_profile_snapshots(profile_id, snapshot_at DESC);
```

**Benefits**:
- ✅ Track follower growth for monitored profiles
- ✅ Identify rapidly growing accounts
- ✅ Profile influence score calculation

---

### 5. `twitter_entities` - Extracted Entities (Optimized)

**Purpose**: Fast lookups for hashtags, mentions, URLs.

```sql
CREATE TABLE twitter_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  -- Entity Details
  entity_type TEXT NOT NULL                 -- 'hashtag' | 'mention' | 'url'
    CHECK (entity_type IN ('hashtag', 'mention', 'url')),
  entity_value TEXT NOT NULL,               -- The actual value
  entity_normalized TEXT NOT NULL,          -- Lowercase, no special chars
  
  -- Position in tweet (for highlighting)
  start_index INTEGER,
  end_index INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast entity lookups
CREATE INDEX idx_twitter_entities_tweet_id ON twitter_entities(tweet_id);
CREATE INDEX idx_twitter_entities_zone_id ON twitter_entities(zone_id);
CREATE INDEX idx_twitter_entities_type ON twitter_entities(entity_type);
CREATE INDEX idx_twitter_entities_normalized ON twitter_entities(entity_normalized);

-- Composite index for trending hashtags/mentions
CREATE INDEX idx_twitter_entities_zone_type_value 
  ON twitter_entities(zone_id, entity_type, entity_normalized);
```

---

### 6. `twitter_rules` - Webhook Rules (No Changes)

Already well-designed in previous analysis.

---

## Optimization Strategies

### 1. Materialized Views for Analytics

Pre-compute expensive aggregations and refresh periodically.

#### View: `twitter_zone_stats_hourly`

```sql
CREATE MATERIALIZED VIEW twitter_zone_stats_hourly AS
SELECT
  zone_id,
  date_trunc('hour', twitter_created_at) as hour,
  
  -- Volume
  COUNT(*) as total_tweets,
  COUNT(DISTINCT author_profile_id) as unique_authors,
  
  -- Engagement
  SUM(retweet_count) as total_retweets,
  SUM(reply_count) as total_replies,
  SUM(like_count) as total_likes,
  SUM(quote_count) as total_quotes,
  SUM(view_count) as total_views,
  SUM(total_engagement) as total_engagement,
  
  -- Averages
  AVG(total_engagement) as avg_engagement,
  AVG(retweet_count) as avg_retweets,
  AVG(like_count) as avg_likes,
  
  -- Content Analysis
  COUNT(*) FILTER (WHERE has_media = true) as tweets_with_media,
  COUNT(*) FILTER (WHERE has_links = true) as tweets_with_links,
  COUNT(*) FILTER (WHERE is_reply = true) as reply_tweets,
  
  -- Sentiment (future)
  AVG(sentiment_score) as avg_sentiment
FROM twitter_tweets
GROUP BY zone_id, date_trunc('hour', twitter_created_at);

-- Indexes on materialized view
CREATE INDEX idx_zone_stats_hourly_zone_hour 
  ON twitter_zone_stats_hourly(zone_id, hour DESC);
CREATE INDEX idx_zone_stats_hourly_engagement 
  ON twitter_zone_stats_hourly(total_engagement DESC);

-- Refresh strategy: Every hour
-- REFRESH MATERIALIZED VIEW CONCURRENTLY twitter_zone_stats_hourly;
```

**Usage**:
```typescript
// Get volume chart for last 24 hours (instant query)
const stats = await supabase
  .from('twitter_zone_stats_hourly')
  .select('hour, total_tweets, total_engagement')
  .eq('zone_id', zoneId)
  .gte('hour', new Date(Date.now() - 24 * 60 * 60 * 1000))
  .order('hour', { ascending: true });
```

---

#### View: `twitter_top_profiles_by_zone`

```sql
CREATE MATERIALIZED VIEW twitter_top_profiles_by_zone AS
SELECT
  t.zone_id,
  p.id as profile_id,
  p.twitter_user_id,
  p.username,
  p.name,
  p.profile_picture_url,
  p.is_verified,
  p.is_blue_verified,
  p.followers_count,
  
  -- Aggregated stats from tweets
  COUNT(t.id) as tweet_count,
  SUM(t.total_engagement) as total_engagement,
  AVG(t.total_engagement) as avg_engagement,
  MAX(t.twitter_created_at) as last_tweet_at
FROM twitter_tweets t
JOIN twitter_profiles p ON t.author_profile_id = p.id
GROUP BY 
  t.zone_id, 
  p.id, p.twitter_user_id, p.username, p.name, 
  p.profile_picture_url, p.is_verified, p.is_blue_verified, 
  p.followers_count;

-- Indexes
CREATE INDEX idx_top_profiles_zone_engagement 
  ON twitter_top_profiles_by_zone(zone_id, total_engagement DESC);
CREATE INDEX idx_top_profiles_zone_tweet_count 
  ON twitter_top_profiles_by_zone(zone_id, tweet_count DESC);
```

**Usage**:
```typescript
// Get top 10 users by engagement (instant query)
const topUsers = await supabase
  .from('twitter_top_profiles_by_zone')
  .select('*')
  .eq('zone_id', zoneId)
  .order('total_engagement', { ascending: false })
  .limit(10);
```

---

#### View: `twitter_trending_hashtags`

```sql
CREATE MATERIALIZED VIEW twitter_trending_hashtags AS
SELECT
  e.zone_id,
  e.entity_normalized as hashtag,
  e.entity_value as original_hashtag,
  
  -- Last 24h stats
  COUNT(DISTINCT e.tweet_id) as tweet_count_24h,
  COUNT(DISTINCT t.author_profile_id) as unique_authors_24h,
  SUM(t.total_engagement) as total_engagement_24h,
  MAX(t.twitter_created_at) as last_used_at,
  
  -- Sample tweets (for preview)
  array_agg(t.text ORDER BY t.total_engagement DESC) 
    FILTER (WHERE rn <= 3) as sample_tweets
FROM twitter_entities e
JOIN twitter_tweets t ON e.tweet_id = t.id
LEFT JOIN LATERAL (
  SELECT ROW_NUMBER() OVER (PARTITION BY e.entity_normalized ORDER BY t.total_engagement DESC) as rn
) ranks ON true
WHERE 
  e.entity_type = 'hashtag'
  AND t.twitter_created_at >= NOW() - INTERVAL '24 hours'
GROUP BY e.zone_id, e.entity_normalized, e.entity_value;

-- Index
CREATE INDEX idx_trending_hashtags_zone_count 
  ON twitter_trending_hashtags(zone_id, tweet_count_24h DESC);
```

---

### 2. Partitioning Strategy (For High Volume)

For zones with 100K+ tweets:

```sql
-- Partition twitter_tweets by month
CREATE TABLE twitter_tweets_2025_11 PARTITION OF twitter_tweets
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE twitter_tweets_2025_12 PARTITION OF twitter_tweets
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Auto-create partitions with pg_partman extension
```

**Benefits**:
- Faster queries (only scan relevant partitions)
- Easier archival (drop old partitions)
- Better maintenance (vacuum specific partitions)

---

### 3. Caching Strategy (Redis)

```typescript
// Cache hot data in Redis
const CACHE_KEYS = {
  // Zone stats (TTL: 5 minutes)
  zoneStats: (zoneId: string) => `zone:${zoneId}:stats`,
  
  // Top profiles (TTL: 15 minutes)
  topProfiles: (zoneId: string) => `zone:${zoneId}:top-profiles`,
  
  // Trending hashtags (TTL: 10 minutes)
  trendingHashtags: (zoneId: string) => `zone:${zoneId}:trending`,
  
  // Recent tweets (TTL: 1 minute)
  recentTweets: (zoneId: string, page: number) => `zone:${zoneId}:tweets:${page}`,
};
```

---

## Data Layer Design

### Modular Functions (No Duplication)

```
lib/data/twitter/
├── profiles.ts          # Profile CRUD + stats
├── tweets.ts            # Tweet CRUD + queries
├── engagement.ts        # Engagement tracking
├── entities.ts          # Hashtags, mentions, URLs
├── analytics.ts         # Pre-aggregated analytics
└── trending.ts          # Trending calculations
```

### Example: `lib/data/twitter/analytics.ts`

```typescript
/**
 * Twitter analytics data layer
 * Uses materialized views for performance
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { redis } from "@/lib/cache/redis";

/**
 * Get volume chart data (last N hours)
 */
export async function getVolumeChart(
  zoneId: string,
  hours: number = 24
): Promise<VolumeChartData[]> {
  const cacheKey = `zone:${zoneId}:volume:${hours}h`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query materialized view
  const supabase = createAdminClient();
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('twitter_zone_stats_hourly')
    .select('hour, total_tweets, total_engagement, unique_authors')
    .eq('zone_id', zoneId)
    .gte('hour', startTime.toISOString())
    .order('hour', { ascending: true });
  
  if (error) throw error;
  
  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(data), { ex: 300 });
  
  return data;
}

/**
 * Get top users by engagement
 */
export async function getTopUsers(
  zoneId: string,
  limit: number = 10,
  orderBy: 'engagement' | 'tweet_count' = 'engagement'
): Promise<TopUserData[]> {
  const cacheKey = `zone:${zoneId}:top-users:${orderBy}:${limit}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query materialized view
  const supabase = createAdminClient();
  const orderColumn = orderBy === 'engagement' ? 'total_engagement' : 'tweet_count';
  
  const { data, error } = await supabase
    .from('twitter_top_profiles_by_zone')
    .select('*')
    .eq('zone_id', zoneId)
    .order(orderColumn, { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  // Cache for 15 minutes
  await redis.set(cacheKey, JSON.stringify(data), { ex: 900 });
  
  return data;
}

/**
 * Get trending hashtags (last 24h)
 */
export async function getTrendingHashtags(
  zoneId: string,
  limit: number = 20
): Promise<TrendingHashtagData[]> {
  const cacheKey = `zone:${zoneId}:trending:${limit}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query materialized view
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('twitter_trending_hashtags')
    .select('*')
    .eq('zone_id', zoneId)
    .order('tweet_count_24h', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  // Cache for 10 minutes
  await redis.set(cacheKey, JSON.stringify(data), { ex: 600 });
  
  return data;
}
```

**All modules use the same functions** → No duplicate queries!

---

## Query Patterns

### Pattern 1: Feed (Recent Tweets)

```typescript
// Efficient with composite index: idx_twitter_tweets_zone_created
const { data } = await supabase
  .from('twitter_tweets')
  .select(`
    *,
    author:twitter_profiles(*)
  `)
  .eq('zone_id', zoneId)
  .order('twitter_created_at', { ascending: false })
  .range(offset, offset + limit);
```

**Performance**: `O(log n)` with index, ~5ms for 1M tweets

---

### Pattern 2: Top Engaged Tweets

```typescript
// Efficient with index: idx_twitter_tweets_zone_engagement
const { data } = await supabase
  .from('twitter_tweets')
  .select(`
    *,
    author:twitter_profiles(*)
  `)
  .eq('zone_id', zoneId)
  .order('total_engagement', { ascending: false })
  .limit(10);
```

**Performance**: `O(log n)` with index, ~3ms

---

### Pattern 3: Profile Tweets

```typescript
// Efficient with index: idx_twitter_tweets_author
const { data } = await supabase
  .from('twitter_tweets')
  .select('*')
  .eq('author_profile_id', profileId)
  .order('twitter_created_at', { ascending: false })
  .limit(20);
```

---

### Pattern 4: Search by Hashtag

```typescript
// Uses materialized view for speed
const { data } = await supabase
  .from('twitter_entities')
  .select(`
    *,
    tweet:twitter_tweets(
      *,
      author:twitter_profiles(*)
    )
  `)
  .eq('zone_id', zoneId)
  .eq('entity_type', 'hashtag')
  .eq('entity_normalized', hashtag.toLowerCase())
  .order('created_at', { ascending: false });
```

---

## Scaling Considerations

### For 10,000 tweets/hour (240K/day)

**Database Size Estimates**:
- **Tweets**: ~500 bytes/tweet → 120 MB/day → 3.6 GB/month
- **Profiles**: ~1 KB/profile (with deduplication: ~10K unique profiles) → 10 MB
- **Entities**: ~100 bytes/entity (avg 3/tweet) → 72 MB/day → 2.2 GB/month
- **Total**: ~6 GB/month per high-volume zone

**Query Performance**:
- Feed queries: < 10ms (with indexes)
- Analytics queries: < 50ms (with materialized views)
- Search queries: < 100ms (with full-text indexes)

### Refresh Strategy for Materialized Views

```sql
-- Hourly refresh (low impact)
REFRESH MATERIALIZED VIEW CONCURRENTLY twitter_zone_stats_hourly;

-- Every 15 minutes (medium impact)
REFRESH MATERIALIZED VIEW CONCURRENTLY twitter_top_profiles_by_zone;

-- Every 10 minutes (low impact)
REFRESH MATERIALIZED VIEW CONCURRENTLY twitter_trending_hashtags;
```

Use **cron job** or **QStash** for scheduled refreshes.

---

## Summary

### ✅ Architecture Benefits

1. **Profile Normalization** → 70% storage savings
2. **Time-series Tables** → Track engagement evolution
3. **Materialized Views** → 10-100x faster analytics
4. **Smart Indexes** → Sub-10ms queries
5. **Modular Data Layer** → Zero code duplication
6. **Redis Caching** → < 1ms for hot data

### 🎯 Module Support

**All these modules use the SAME data layer**:
- ✅ Feed (recent tweets)
- ✅ Volume chart
- ✅ Top users
- ✅ Trending hashtags
- ✅ Engagement curves
- ✅ Profile monitoring
- ✅ Search & filters

### 📊 Performance Targets

- **Feed load**: < 100ms
- **Analytics dashboard**: < 200ms
- **Search results**: < 150ms
- **Real-time stats**: < 50ms (cached)

---

**Status**: Ready for implementation 🚀  
**Next**: Create migration scripts and data layer functions

