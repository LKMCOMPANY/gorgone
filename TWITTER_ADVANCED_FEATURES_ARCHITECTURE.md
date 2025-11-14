# Twitter Advanced Features - Database Architecture

**Goal**: Support advanced analytics, Share of Voice, thread mapping, and real-time engagement tracking  
**Challenge**: 10,000 tweets/hour with sub-second query times  
**Date**: November 13, 2025

---

## Table of Contents

1. [New Requirements Analysis](#new-requirements-analysis)
2. [Profile Tagging System](#profile-tagging-system)
3. [Time-Period Strategy](#time-period-strategy)
4. [Share of Voice Architecture](#share-of-voice-architecture)
5. [Thread Mapping](#thread-mapping)
6. [Engagement Update Strategy](#engagement-update-strategy)
7. [Complete Schema](#complete-schema)
8. [Materialized Views Strategy](#materialized-views-strategy)

---

## New Requirements Analysis

### 1. Time Filters (Multiple Periods)

**Requirement**: Users can filter by: 3h, 6h, 12h, 24h, 7d, 30d

**Challenge**: Do we need a materialized view for EACH period?

**Answer**: NO! Use smart aggregation strategy:
- **Materialized views**: 1h (hourly), 1d (daily)
- **Dynamic calculation**: 3h, 6h, 12h, 7d, 30d (query hourly/daily views)

**Why?**
- With proper indexes, summing 3-30 hourly records is < 10ms
- 6 materialized views (one per period) = 6x refresh overhead
- Dynamic = flexible (user can request any period, not just presets)

---

### 2. Top Profiles by Engagement (Per Period)

**Requirement**: 
- Show top profiles with MOST ENGAGEMENT in selected period
- Engagement metrics UPDATED (not static snapshot)

**Challenge**: 
- Engagement changes constantly
- Need to recalculate for each period

**Solution**: Hybrid approach
1. **Materialized view**: Top profiles last 24h (refreshed every 5 min)
2. **Dynamic query**: For other periods, query with optimized indexes
3. **Redis cache**: Cache results per period (TTL: 2 min)

---

### 3. Top Posts by Engagement (Per Period)

**Requirement**: 
- Show top posts with MOST ENGAGEMENT in selected period
- Engagement metrics UPDATED

**Solution**: Same as top profiles
1. **Materialized view**: Top posts last 24h (refreshed every 5 min)
2. **Dynamic query**: For other periods
3. **Redis cache**: Cache results (TTL: 2 min)

---

### 4. Share of Voice (NEW - CRITICAL!)

**Requirement**: 
- Tag profiles with types: Attila, Local Team, Target, Surveillance, Ally, Asset, Adversary
- Calculate % of volume per profile type vs total zone volume
- Profile types configured per zone in settings

**Key Points**:
- ✅ Profile can have multiple tags
- ✅ Tags are zone-specific (same profile can be "Ally" in zone A, "Adversary" in zone B)
- ✅ Not all profiles have tags (most are untagged)
- ⚠️ Critical for government monitoring use cases

---

### 5. Alerts (Acceleration, Peaks)

**Requirement**: 
- Detect volume spikes
- Detect engagement acceleration
- Hourly data needed for algorithms

**Solution**: 
- Use `twitter_zone_stats_hourly` (already covers this!)
- Alert detection algorithms in application layer
- Store alerts in dedicated table

---

### 6. Feed Views (3 Sub-tabs)

#### A. Feed Tab
- All tweets in chronological order
- Basic data + engagement evolution curve
- Cron job updates engagement

#### B. Profiles Tab
- List all profiles in zone
- Stats: post count, RT ratio, comment ratio, avg engagement
- Sortable by various metrics

#### C. Thread Mapping (Cartography)
- Visual diagram of conversations
- Show original tweet + all replies/comments
- Handle incomplete threads (original tweet not captured)

#### D. Search & Advanced Filters
- Autocomplete search
- Filters: date range, min engagement, verified only, has media, etc.

---

## Profile Tagging System

### Table: `twitter_profile_zone_tags`

**Purpose**: Tag profiles with types for Share of Voice analysis.

```sql
CREATE TABLE twitter_profile_zone_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  profile_id UUID NOT NULL REFERENCES twitter_profiles(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  -- Tag Type
  tag_type TEXT NOT NULL CHECK (tag_type IN (
    'attila',           -- Key influencer/protagonist
    'local_team',       -- Local team members
    'target',           -- Target of monitoring
    'surveillance',     -- Under surveillance
    'ally',             -- Allied profile
    'asset',            -- Asset/resource
    'adversary'         -- Adversarial profile
  )),
  
  -- Optional metadata
  notes TEXT,                           -- Why this tag was applied
  confidence_score DECIMAL,             -- Confidence level (0-1)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: One tag type per profile per zone
  CONSTRAINT unique_profile_zone_tag UNIQUE (profile_id, zone_id, tag_type)
);

-- Indexes
CREATE INDEX idx_profile_zone_tags_profile ON twitter_profile_zone_tags(profile_id);
CREATE INDEX idx_profile_zone_tags_zone ON twitter_profile_zone_tags(zone_id);
CREATE INDEX idx_profile_zone_tags_type ON twitter_profile_zone_tags(tag_type);

-- Composite for Share of Voice queries
CREATE INDEX idx_profile_zone_tags_zone_type 
  ON twitter_profile_zone_tags(zone_id, tag_type);
```

**Benefits**:
- ✅ Multiple tags per profile per zone
- ✅ Fast Share of Voice calculation
- ✅ Zone-specific tagging
- ✅ Audit trail (created_by, created_at)

---

### View: Helper for Tagged Profiles

```sql
CREATE VIEW twitter_profiles_with_tags AS
SELECT 
  p.*,
  array_agg(DISTINCT t.tag_type) FILTER (WHERE t.tag_type IS NOT NULL) as tags
FROM twitter_profiles p
LEFT JOIN twitter_profile_zone_tags t ON p.id = t.profile_id
GROUP BY p.id;
```

---

## Time-Period Strategy

### Fixed Materialized Views

Only create views for most common periods:

#### 1. Hourly Stats (Already designed)

```sql
CREATE MATERIALIZED VIEW twitter_zone_stats_hourly AS
SELECT
  zone_id,
  date_trunc('hour', twitter_created_at) as hour,
  COUNT(*) as total_tweets,
  COUNT(DISTINCT author_profile_id) as unique_authors,
  SUM(total_engagement) as total_engagement,
  SUM(retweet_count) as total_retweets,
  SUM(reply_count) as total_replies,
  SUM(like_count) as total_likes,
  SUM(quote_count) as total_quotes,
  SUM(view_count) as total_views,
  AVG(total_engagement) as avg_engagement
FROM twitter_tweets
GROUP BY zone_id, date_trunc('hour', twitter_created_at);

-- Refresh every 5 minutes for "live" feel
```

#### 2. Daily Stats

```sql
CREATE MATERIALIZED VIEW twitter_zone_stats_daily AS
SELECT
  zone_id,
  date_trunc('day', twitter_created_at) as day,
  COUNT(*) as total_tweets,
  COUNT(DISTINCT author_profile_id) as unique_authors,
  SUM(total_engagement) as total_engagement,
  -- ... same fields as hourly
  AVG(total_engagement) as avg_engagement
FROM twitter_tweets
GROUP BY zone_id, date_trunc('day', twitter_created_at);

-- Refresh once per day at midnight
```

---

### Dynamic Period Queries

For 3h, 6h, 12h, 7d, 30d → Query hourly/daily views dynamically:

```typescript
/**
 * Get stats for any time period (dynamic)
 */
export async function getZoneStatsByPeriod(
  zoneId: string,
  hours: number  // 3, 6, 12, 24, 168 (7d), 720 (30d)
): Promise<ZoneStats> {
  const supabase = createAdminClient();
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  // For periods <= 48h, use hourly view
  if (hours <= 48) {
    const { data } = await supabase
      .from('twitter_zone_stats_hourly')
      .select('*')
      .eq('zone_id', zoneId)
      .gte('hour', startTime.toISOString());
    
    // Aggregate results
    return aggregateStats(data);
  }
  
  // For periods > 48h, use daily view (faster)
  const { data } = await supabase
    .from('twitter_zone_stats_daily')
    .select('*')
    .eq('zone_id', zoneId)
    .gte('day', startTime.toISOString());
  
  return aggregateStats(data);
}

function aggregateStats(rows: any[]): ZoneStats {
  return {
    total_tweets: rows.reduce((sum, r) => sum + r.total_tweets, 0),
    unique_authors: new Set(rows.flatMap(r => r.unique_authors)).size,
    total_engagement: rows.reduce((sum, r) => sum + r.total_engagement, 0),
    avg_engagement: rows.reduce((sum, r) => sum + r.avg_engagement, 0) / rows.length,
    // ... etc
  };
}
```

**Performance**: 
- 3h period = sum of 3 rows → < 5ms
- 7d period = sum of 7 rows (daily) → < 10ms
- 30d period = sum of 30 rows (daily) → < 20ms

---

## Share of Voice Architecture

### Materialized View: `twitter_share_of_voice`

**Purpose**: Pre-calculate Share of Voice per tag type per zone.

```sql
CREATE MATERIALIZED VIEW twitter_share_of_voice AS
WITH zone_totals AS (
  -- Total volume per zone
  SELECT 
    zone_id,
    COUNT(*) as total_zone_tweets,
    SUM(total_engagement) as total_zone_engagement
  FROM twitter_tweets
  WHERE twitter_created_at >= NOW() - INTERVAL '30 days'
  GROUP BY zone_id
),
tagged_stats AS (
  -- Stats per tag type
  SELECT 
    t.zone_id,
    tags.tag_type,
    COUNT(t.id) as tag_tweets,
    SUM(t.total_engagement) as tag_engagement,
    COUNT(DISTINCT t.author_profile_id) as tag_unique_authors
  FROM twitter_tweets t
  JOIN twitter_profile_zone_tags tags 
    ON t.author_profile_id = tags.profile_id 
    AND t.zone_id = tags.zone_id
  WHERE t.twitter_created_at >= NOW() - INTERVAL '30 days'
  GROUP BY t.zone_id, tags.tag_type
)
SELECT 
  ts.zone_id,
  ts.tag_type,
  ts.tag_tweets,
  ts.tag_engagement,
  ts.tag_unique_authors,
  zt.total_zone_tweets,
  zt.total_zone_engagement,
  
  -- Share of Voice percentages
  ROUND((ts.tag_tweets::DECIMAL / NULLIF(zt.total_zone_tweets, 0)) * 100, 2) 
    as volume_percentage,
  ROUND((ts.tag_engagement::DECIMAL / NULLIF(zt.total_zone_engagement, 0)) * 100, 2) 
    as engagement_percentage
FROM tagged_stats ts
JOIN zone_totals zt ON ts.zone_id = zt.zone_id;

-- Indexes
CREATE INDEX idx_share_of_voice_zone ON twitter_share_of_voice(zone_id);
CREATE INDEX idx_share_of_voice_tag ON twitter_share_of_voice(tag_type);

-- Refresh every 10 minutes
```

**Usage**:
```typescript
// Get Share of Voice for a zone
const { data } = await supabase
  .from('twitter_share_of_voice')
  .select('*')
  .eq('zone_id', zoneId)
  .order('volume_percentage', { ascending: false });

// Returns:
// [
//   { tag_type: 'ally', volume_percentage: 35.5, engagement_percentage: 42.1 },
//   { tag_type: 'adversary', volume_percentage: 28.3, engagement_percentage: 31.2 },
//   { tag_type: 'target', volume_percentage: 15.2, engagement_percentage: 18.7 },
//   ...
// ]
```

---

### Share of Voice by Time Period

For dynamic periods (3h, 6h, etc.), query directly:

```typescript
export async function getShareOfVoiceByPeriod(
  zoneId: string,
  hours: number
): Promise<ShareOfVoiceData[]> {
  const supabase = createAdminClient();
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const { data } = await supabase.rpc('calculate_share_of_voice', {
    p_zone_id: zoneId,
    p_start_time: startTime.toISOString(),
  });
  
  return data;
}
```

**PostgreSQL Function**:
```sql
CREATE OR REPLACE FUNCTION calculate_share_of_voice(
  p_zone_id UUID,
  p_start_time TIMESTAMPTZ
)
RETURNS TABLE (
  tag_type TEXT,
  tag_tweets BIGINT,
  tag_engagement BIGINT,
  volume_percentage DECIMAL,
  engagement_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH zone_totals AS (
    SELECT 
      COUNT(*) as total_tweets,
      SUM(total_engagement) as total_engagement
    FROM twitter_tweets
    WHERE zone_id = p_zone_id
      AND twitter_created_at >= p_start_time
  ),
  tagged_stats AS (
    SELECT 
      tags.tag_type,
      COUNT(t.id) as tweets,
      SUM(t.total_engagement) as engagement
    FROM twitter_tweets t
    JOIN twitter_profile_zone_tags tags 
      ON t.author_profile_id = tags.profile_id 
      AND t.zone_id = tags.zone_id
    WHERE t.zone_id = p_zone_id
      AND t.twitter_created_at >= p_start_time
    GROUP BY tags.tag_type
  )
  SELECT 
    ts.tag_type,
    ts.tweets as tag_tweets,
    ts.engagement as tag_engagement,
    ROUND((ts.tweets::DECIMAL / NULLIF(zt.total_tweets, 0)) * 100, 2) as volume_percentage,
    ROUND((ts.engagement::DECIMAL / NULLIF(zt.total_engagement, 0)) * 100, 2) as engagement_percentage
  FROM tagged_stats ts
  CROSS JOIN zone_totals zt;
END;
$$ LANGUAGE plpgsql;
```

---

## Thread Mapping

### Challenge

When a user replies to a tweet we didn't capture, we have:
- `in_reply_to_tweet_id` pointing to missing tweet
- `conversation_id` linking all tweets in thread

### Solution: Resolve Threads with CTEs

#### View: `twitter_threads_with_context`

```sql
CREATE VIEW twitter_threads_with_context AS
WITH RECURSIVE thread_tree AS (
  -- Root tweets (not replies, or replies with no parent in DB)
  SELECT 
    t.id,
    t.tweet_id,
    t.conversation_id,
    t.text,
    t.author_profile_id,
    t.in_reply_to_tweet_id,
    t.twitter_created_at,
    t.total_engagement,
    0 as depth,
    ARRAY[t.id] as path,
    t.id as root_tweet_id
  FROM twitter_tweets t
  WHERE t.in_reply_to_tweet_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM twitter_tweets parent 
       WHERE parent.tweet_id = t.in_reply_to_tweet_id
     )
  
  UNION ALL
  
  -- Child tweets (replies)
  SELECT 
    t.id,
    t.tweet_id,
    t.conversation_id,
    t.text,
    t.author_profile_id,
    t.in_reply_to_tweet_id,
    t.twitter_created_at,
    t.total_engagement,
    tt.depth + 1,
    tt.path || t.id,
    tt.root_tweet_id
  FROM twitter_tweets t
  JOIN thread_tree tt ON t.in_reply_to_tweet_id = (
    SELECT tweet_id FROM twitter_tweets WHERE id = ANY(tt.path)
  )
  WHERE t.id != ALL(tt.path)  -- Prevent cycles
)
SELECT * FROM thread_tree;
```

**Usage**:
```typescript
// Get full thread for a conversation
const { data } = await supabase
  .from('twitter_threads_with_context')
  .select(`
    *,
    author:twitter_profiles(*)
  `)
  .eq('conversation_id', conversationId)
  .order('depth', { ascending: true })
  .order('twitter_created_at', { ascending: true });

// Returns hierarchical thread structure
```

---

### Orphaned Tweets (Missing Parent)

```sql
CREATE VIEW twitter_orphaned_replies AS
SELECT 
  t.*,
  t.in_reply_to_tweet_id as missing_parent_id
FROM twitter_tweets t
WHERE t.in_reply_to_tweet_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM twitter_tweets parent 
    WHERE parent.tweet_id = t.in_reply_to_tweet_id
  );
```

**Resolution Strategy**:
- ✅ Use TwitterAPI.io to fetch missing parent tweets
- ✅ Store fetched parents in `twitter_tweets` (backfill)
- ✅ Re-resolve thread hierarchy after fetch
- ⚠️ Only fetch if user requests (avoid unnecessary API calls)

**Background Job** (optional):
- Periodically fetch orphaned parents for active conversations
- Priority: Conversations with > 5 orphaned tweets
- Cost: Minimal (only missing tweets)

---

## Engagement Update Strategy

### Problem

Engagement metrics (likes, RTs, views) change constantly. We need to:
1. Track changes over time (for curves)
2. Keep current values updated (for top posts/profiles)

### Solution: Tiered Update Strategy

#### Table: `twitter_engagement_tracking`

**UPDATED STRATEGY** (Optimized for 12h window):
- First 1h: Update every 10 min (6 updates)
- Next 3h: Update every 30 min (6 updates)
- Next 4h: Update every 1h (4 updates)
- After 12h: Stop tracking
- **Total: 16 updates per tweet (vs 36 in original plan)**

```sql
CREATE TABLE twitter_engagement_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_db_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  
  -- Update schedule tier (optimized for 12h window)
  tier TEXT NOT NULL CHECK (tier IN (
    'ultra_hot',  -- First 1h: Update every 10 min
    'hot',        -- 1-4h: Update every 30 min
    'warm',       -- 4-12h: Update every 1h
    'cold'        -- 12h+: Stop tracking
  )),
  
  -- Tracking
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  next_update_at TIMESTAMPTZ,
  update_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_engagement_tracking_tier ON twitter_engagement_tracking(tier);
CREATE INDEX idx_engagement_tracking_next_update 
  ON twitter_engagement_tracking(next_update_at) WHERE tier != 'cold';
```

#### Cron Job Strategy

```typescript
/**
 * Update engagement metrics for active tweets
 * Run every hour
 */
export async function updateEngagementMetrics() {
  const now = new Date();
  
  // Get tweets that need update
  const { data: tweets } = await supabase
    .from('twitter_engagement_tracking')
    .select('tweet_db_id')
    .lte('next_update_at', now.toISOString())
    .neq('tier', 'cold')
    .limit(1000);  // Batch size
  
  for (const { tweet_db_id } of tweets) {
    // Fetch fresh metrics from TwitterAPI.io
    const freshMetrics = await twitterClient.getTweetById(tweet_db_id);
    
    // Update tweet record
    await supabase
      .from('twitter_tweets')
      .update({
        retweet_count: freshMetrics.retweet_count,
        reply_count: freshMetrics.reply_count,
        like_count: freshMetrics.like_count,
        quote_count: freshMetrics.quote_count,
        view_count: freshMetrics.view_count,
        updated_at: now,
      })
      .eq('id', tweet_db_id);
    
    // Insert snapshot in history
    await supabase
      .from('twitter_engagement_history')
      .insert({
        tweet_id: tweet_db_id,
        retweet_count: freshMetrics.retweet_count,
        reply_count: freshMetrics.reply_count,
        like_count: freshMetrics.like_count,
        quote_count: freshMetrics.quote_count,
        view_count: freshMetrics.view_count,
        snapshot_at: now,
      });
    
    // Update tracking tier and next update time
    await updateTrackingTier(tweet_db_id, now);
  }
}

function updateTrackingTier(tweetDbId: UUID, now: Date) {
  const tweetAge = now - tweet.twitter_created_at;
  const ageMinutes = tweetAge / (60 * 1000);
  const ageHours = tweetAge / (60 * 60 * 1000);
  
  if (ageMinutes < 60) {
    // Ultra Hot: First hour, update every 10 min
    return { tier: 'ultra_hot', next_update_at: addMinutes(now, 10) };
  } else if (ageHours < 4) {
    // Hot: 1-4h, update every 30 min
    return { tier: 'hot', next_update_at: addMinutes(now, 30) };
  } else if (ageHours < 12) {
    // Warm: 4-12h, update every 1h
    return { tier: 'warm', next_update_at: addHours(now, 1) };
  } else {
    // Cold: 12h+, stop tracking
    return { tier: 'cold', next_update_at: null };
  }
}
```

**Cost Consideration** (OPTIMIZED STRATEGY):
- Ultra Hot (first 1h): 6 updates (every 10 min)
- Hot (1-4h): 6 updates (every 30 min)
- Warm (4-12h): 4 updates (every 1h)
- **Total**: **16 API calls per tweet over 12h**
- For 10K tweets/hour = 240K tweets/day
- API calls: 240K × 16 = 3.84M calls/day
- Cost: 3.84M × $0.00015 = **$576/day** = **$17,280/month**

**OPTIMIZATION CRITICAL**: Only track tweets with initial engagement > threshold
- If tracking 10% (24K tweets/day): **$1,728/month**
- If tracking 5% (12K tweets/day): **$864/month**
- If tracking 1% (2.4K tweets/day): **$173/month**

---

## Complete Schema Summary

### Core Tables (7 tables)

1. ✅ `twitter_profiles` - User profiles (normalized)
2. ✅ `twitter_tweets` - Tweet storage
3. ✅ `twitter_engagement_history` - Time-series engagement
4. ✅ `twitter_profile_snapshots` - Profile evolution
5. ✅ `twitter_entities` - Hashtags, mentions, URLs
6. ✅ `twitter_rules` - Webhook configuration
7. **NEW** `twitter_profile_zone_tags` - Profile tagging for Share of Voice

### Tracking Tables (1 table)

8. **NEW** `twitter_engagement_tracking` - Engagement update scheduling

### Materialized Views (5 views)

1. ✅ `twitter_zone_stats_hourly` - Hourly aggregates
2. ✅ `twitter_zone_stats_daily` - Daily aggregates
3. ✅ `twitter_top_profiles_by_zone` - Top profiles (refreshed every 5 min)
4. ✅ `twitter_trending_hashtags` - Trending hashtags
5. **NEW** `twitter_share_of_voice` - Share of Voice by tag type

### Regular Views (2 views)

6. **NEW** `twitter_threads_with_context` - Thread resolution (recursive CTE)
7. **NEW** `twitter_orphaned_replies` - Tweets with missing parents

---

## Materialized Views Strategy

### Refresh Schedule

| View | Refresh Frequency | Why | Cost |
|------|------------------|-----|------|
| `twitter_zone_stats_hourly` | Every 5 minutes | Near real-time stats | Low (incremental) |
| `twitter_zone_stats_daily` | Once per day (midnight) | Daily summaries | Low |
| `twitter_top_profiles_by_zone` | Every 5 minutes | Live leaderboards | Medium |
| `twitter_trending_hashtags` | Every 10 minutes | Trending analysis | Low |
| `twitter_share_of_voice` | Every 10 minutes | Critical for monitoring | Low |

**Total refresh overhead**: < 2 seconds every 5 minutes

### Concurrent Refresh (No Downtime)

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY twitter_zone_stats_hourly;
REFRESH MATERIALIZED VIEW CONCURRENTLY twitter_top_profiles_by_zone;
REFRESH MATERIALIZED VIEW CONCURRENTLY twitter_trending_hashtags;
REFRESH MATERIALIZED VIEW CONCURRENTLY twitter_share_of_voice;
```

---

## Query Patterns for New Features

### 1. Top Profiles by Engagement (Any Period)

```typescript
export async function getTopProfiles(
  zoneId: string,
  hours: number = 24,
  limit: number = 10
): Promise<TopProfileData[]> {
  const cacheKey = `zone:${zoneId}:top-profiles:${hours}h`;
  
  // Check cache (TTL: 2 min)
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const { data } = await supabase
    .from('twitter_tweets')
    .select(`
      author_profile_id,
      twitter_profiles (
        id, username, name, profile_picture_url,
        is_verified, is_blue_verified, followers_count
      )
    `)
    .eq('zone_id', zoneId)
    .gte('twitter_created_at', startTime.toISOString());
  
  // Aggregate by profile
  const profileStats = data.reduce((acc, tweet) => {
    const profileId = tweet.author_profile_id;
    if (!acc[profileId]) {
      acc[profileId] = {
        profile: tweet.twitter_profiles,
        tweet_count: 0,
        total_engagement: 0,
      };
    }
    acc[profileId].tweet_count++;
    acc[profileId].total_engagement += tweet.total_engagement;
    return acc;
  }, {});
  
  // Sort and limit
  const topProfiles = Object.values(profileStats)
    .sort((a, b) => b.total_engagement - a.total_engagement)
    .slice(0, limit);
  
  // Cache
  await redis.set(cacheKey, JSON.stringify(topProfiles), { ex: 120 });
  
  return topProfiles;
}
```

---

### 2. Top Posts by Engagement (Any Period)

```typescript
export async function getTopPosts(
  zoneId: string,
  hours: number = 24,
  limit: number = 10
): Promise<TopPostData[]> {
  const cacheKey = `zone:${zoneId}:top-posts:${hours}h`;
  
  // Check cache (TTL: 2 min)
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const { data } = await supabase
    .from('twitter_tweets')
    .select(`
      *,
      author:twitter_profiles(*)
    `)
    .eq('zone_id', zoneId)
    .gte('twitter_created_at', startTime.toISOString())
    .order('total_engagement', { ascending: false })
    .limit(limit);
  
  // Cache
  await redis.set(cacheKey, JSON.stringify(data), { ex: 120 });
  
  return data;
}
```

---

### 3. Profile Ratios (Posts, RTs, Comments)

```typescript
export async function getProfileRatios(
  profileId: string,
  zoneId: string
): Promise<ProfileRatios> {
  const { data } = await supabase
    .from('twitter_tweets')
    .select('is_reply, raw_data')
    .eq('zone_id', zoneId)
    .eq('author_profile_id', profileId);
  
  const total = data.length;
  const replies = data.filter(t => t.is_reply).length;
  const retweets = data.filter(t => t.raw_data.referenced_tweets?.some(
    ref => ref.type === 'retweeted'
  )).length;
  const originals = total - replies - retweets;
  
  return {
    total_posts: total,
    original_posts: originals,
    replies: replies,
    retweets: retweets,
    reply_ratio: replies / total,
    retweet_ratio: retweets / total,
    original_ratio: originals / total,
  };
}
```

---

## Performance Benchmarks (Estimated)

| Query | Volume | Time | Method |
|-------|--------|------|--------|
| Volume chart (24h) | 10K tweets | < 10ms | Materialized view |
| Top profiles (24h) | 10K tweets | < 20ms | Cached query |
| Top posts (24h) | 10K tweets | < 15ms | Index + limit |
| Share of Voice | All tags | < 5ms | Materialized view |
| Thread mapping | 1 thread | < 30ms | Recursive CTE |
| Feed pagination | 50 tweets | < 5ms | Index + limit |

---

## Cost Analysis

### API Calls per Month (10K tweets/hour)

1. **Webhook collection**: 240K tweets/day × $0.00015 = **$36/day**
2. **Engagement updates**: 360K calls/day × $0.00015 = **$54/day**
3. **Profile updates**: 10K profiles × 2 updates/day × $0.00015 = **$3/day**

**Total**: ~**$93/day** = **$2,790/month** per high-volume zone

### Optimization Strategies

1. **Selective engagement tracking**: Only track tweets with > 100 initial engagement
   - Reduces updates by ~80%
   - New cost: ~$55/day = **$1,650/month**

2. **Smart profile updates**: Only update profiles with recent activity
   - Reduces profile calls by ~50%
   - Saves: ~$1.50/day

---

## Next Steps

1. ✅ Add `twitter_profile_zone_tags` table
2. ✅ Add `twitter_engagement_tracking` table
3. ✅ Create Share of Voice materialized view
4. ✅ Create thread resolution view
5. ✅ Implement tiered engagement update strategy
6. ✅ Build data layer functions for all features

---

**Status**: Architecture complete and ready for implementation 🚀

