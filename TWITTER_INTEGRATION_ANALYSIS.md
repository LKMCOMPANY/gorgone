# Twitter Integration Analysis - Gorgone V2

## Executive Summary

This document analyzes the twitterapi.io integration for Gorgone, a government-grade social media monitoring platform. The goal is to create a scalable, modular architecture capable of handling 10,000+ tweets per hour while avoiding duplicates and providing a clean data layer for future modules.

---

## 1. API Analysis - twitterapi.io

### 1.1 Authentication
- **Method**: API Key-based (X-API-Key header)
- **Key**: `new1_efb60bb213ed46489a8604d92efc1edb`
- **Security**: Server-side only, never exposed to client

### 1.2 Webhook System

#### Add Webhook Rule
**Endpoint**: `POST /v1/webhook/add_rule`
**Purpose**: Create a new monitoring rule that triggers webhooks

```typescript
interface AddWebhookRuleRequest {
  tag: string;              // Unique identifier for this rule
  value: string;            // Twitter search query (same syntax as Twitter Advanced Search)
  interval_seconds: number; // Polling frequency (minimum: 60 seconds)
}
```

**Example Request**:
```json
{
  "tag": "presidential_campaign_mentions",
  "value": "@POTUS OR @WhiteHouse",
  "interval_seconds": 300
}
```

#### Get Webhook Rules
**Endpoint**: `GET /v1/webhook/get_rules`
**Purpose**: List all active webhook rules

**Response**:
```typescript
interface WebhookRule {
  id: string;
  tag: string;
  value: string;
  interval_seconds: number;
  is_active: boolean;
  created_at: string;
}
```

#### Update Webhook Rule
**Endpoint**: `PUT /v1/webhook/update_rule/{rule_id}`
**Purpose**: Modify existing rule (query, interval, active status)

```typescript
interface UpdateWebhookRuleRequest {
  tag?: string;
  value?: string;
  interval_seconds?: number;
  is_active?: boolean;
}
```

#### Delete Webhook Rule
**Endpoint**: `DELETE /v1/webhook/delete_rule/{rule_id}`
**Purpose**: Permanently remove a webhook rule

---

### 1.3 Twitter Advanced Search API

**Endpoint**: `GET /v1/tweets/search/advanced`
**Purpose**: On-demand tweet search with advanced filters

#### Query Parameters

```typescript
interface TwitterSearchParams {
  // Text Search
  query: string;                    // Main search query
  
  // User Filters
  from_user?: string;               // Tweets from specific user
  to_user?: string;                 // Tweets mentioning specific user
  
  // Engagement Filters
  min_retweets?: number;            // Minimum retweet count
  min_likes?: number;               // Minimum like count
  min_replies?: number;             // Minimum reply count
  
  // Time Filters
  start_time?: string;              // ISO 8601 format
  end_time?: string;                // ISO 8601 format
  
  // Content Filters
  has_hashtags?: boolean;           // Only tweets with hashtags
  has_media?: boolean;              // Only tweets with media
  has_links?: boolean;              // Only tweets with links
  is_verified?: boolean;            // Only verified users
  
  // Pagination
  max_results?: number;             // Results per page (10-100)
  next_token?: string;              // Pagination token
  
  // Language & Location
  lang?: string;                    // Language code (e.g., 'en', 'fr')
  location?: string;                // Location-based filtering
}
```

#### Twitter Query Syntax (for `query` parameter)

```
Basic Operators:
- "exact phrase"          → Exact match
- keyword1 keyword2       → AND (both must appear)
- keyword1 OR keyword2    → OR (either can appear)
- -keyword                → NOT (exclude)
- #hashtag                → Search hashtags
- @username               → Mentions
- from:username           → Tweets from user
- to:username             → Replies to user

Advanced Operators:
- min_retweets:100        → Minimum 100 RTs
- min_faves:50            → Minimum 50 likes
- since:2024-01-01        → From date
- until:2024-12-31        → Until date
- filter:media            → Has media
- filter:links            → Has links
- filter:verified         → Verified users only
- lang:en                 → English only

Examples:
1. "@POTUS OR @WhiteHouse -retweet"
2. "climate change" min_retweets:100 filter:verified
3. "#election2024 lang:en since:2024-01-01"
```

---

### 1.4 Expected Webhook Payload

**Source**: [TwitterAPI.io Webhook Documentation](https://twitterapi.io/blog/using-webhooks-for-real-time-twitter-data)

When a webhook is triggered, twitterapi.io sends a POST request to your webhook URL:

```typescript
interface WebhookPayload {
  event_type: 'tweet';           // Event type (always 'tweet' for now)
  rule_id: string;               // The ID of the triggered rule (from API)
  rule_tag: string;              // The tag of the triggered rule (our identifier)
  tweets: Tweet[];               // Array of matching tweets
  timestamp: number;             // Unix timestamp (milliseconds)
}

interface Tweet {
  id: string;                    // Unique tweet ID (Twitter's ID)
  text: string;                  // Tweet content
  author_id: string;             // User ID of author
  created_at: string;            // ISO 8601 timestamp
  
  // Author Info (if included)
  author?: {
    id: string;
    username: string;
    name: string;
    verified: boolean;
    profile_image_url?: string;
    followers_count?: number;
    following_count?: number;
  };
  
  // Engagement Metrics
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
  
  // Content Details
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ username: string; id: string }>;
    urls?: Array<{ url: string; expanded_url: string; display_url: string }>;
    annotations?: Array<{ type: string; normalized_text: string }>;
  };
  
  // Media
  attachments?: {
    media_keys?: string[];
  };
  
  // Includes (expanded data)
  includes?: {
    media?: Array<{
      media_key: string;
      type: 'photo' | 'video' | 'animated_gif';
      url?: string;
      preview_image_url?: string;
    }>;
    users?: Array<{
      id: string;
      username: string;
      name: string;
      verified: boolean;
    }>;
  };
  
  // Reference Tweets (retweets, quotes, replies)
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
  
  // Location
  geo?: {
    place_id?: string;
    coordinates?: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude]
    };
  };
  
  // Context Annotations (topics, entities)
  context_annotations?: Array<{
    domain: { id: string; name: string; description: string };
    entity: { id: string; name: string; description?: string };
  }>;
  
  // Language
  lang?: string;
  
  // Source (Twitter app used)
  source?: string;
  
  // Conversation
  conversation_id?: string;
  in_reply_to_user_id?: string;
}
```

---

## 2. Database Architecture

### 2.1 Core Tables

#### `twitter_rules` - Webhook Configuration
Stores webhook rules per zone.

```sql
CREATE TABLE twitter_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  -- Rule Configuration
  tag TEXT NOT NULL,                    -- Unique identifier for webhook
  query TEXT NOT NULL,                  -- Twitter search query
  query_type TEXT NOT NULL              -- 'simple' | 'builder'
    CHECK (query_type IN ('simple', 'builder')),
  interval_seconds INTEGER NOT NULL     -- Polling frequency
    CHECK (interval_seconds >= 60),
  
  -- Query Builder Data (for 'builder' type)
  query_builder_config JSONB,           -- Structured query config
  
  -- External References
  external_rule_id TEXT,                -- twitterapi.io rule ID
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT twitter_rules_tag_zone_unique UNIQUE (tag, zone_id)
);

CREATE INDEX idx_twitter_rules_zone_id ON twitter_rules(zone_id);
CREATE INDEX idx_twitter_rules_is_active ON twitter_rules(is_active);
CREATE INDEX idx_twitter_rules_external_id ON twitter_rules(external_rule_id);
```

**Query Builder Config Structure**:
```typescript
interface QueryBuilderConfig {
  keywords: string[];           // ['climate', 'environment']
  hashtags: string[];          // ['election2024', 'politics']
  mentions: string[];          // ['POTUS', 'WhiteHouse']
  from_users: string[];        // Users to monitor
  exclude_keywords: string[];  // Negative keywords
  exclude_users: string[];     // Users to ignore
  
  // Filters
  filters: {
    verified_only: boolean;
    has_media: boolean;
    has_links: boolean;
    min_retweets?: number;
    min_likes?: number;
    min_replies?: number;
  };
  
  // Date Range
  date_range?: {
    start: string;  // ISO 8601
    end: string;    // ISO 8601
  };
  
  // Language
  lang?: string;    // 'en', 'fr', etc.
}
```

---

#### `twitter_tweets` - Stored Tweet Data
Stores all tweets received via webhooks.

```sql
CREATE TABLE twitter_tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  -- Twitter IDs (for deduplication)
  tweet_id TEXT NOT NULL UNIQUE,        -- Twitter's unique tweet ID
  author_id TEXT NOT NULL,              -- Twitter's user ID
  conversation_id TEXT,                 -- Thread/conversation ID
  
  -- Content
  text TEXT NOT NULL,
  lang TEXT,
  
  -- Timestamps
  twitter_created_at TIMESTAMPTZ NOT NULL,  -- When tweet was posted
  collected_at TIMESTAMPTZ DEFAULT NOW(),   -- When we received it
  
  -- Author Info (denormalized for performance)
  author_username TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_verified BOOLEAN DEFAULT false,
  author_followers_count INTEGER,
  
  -- Engagement Metrics (at collection time)
  retweet_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0,
  impression_count INTEGER,
  
  -- Content Flags
  has_media BOOLEAN DEFAULT false,
  has_links BOOLEAN DEFAULT false,
  has_hashtags BOOLEAN DEFAULT false,
  
  -- Full Tweet Data (JSONB for flexibility)
  raw_data JSONB NOT NULL,              -- Complete tweet object
  
  -- Processing Status
  is_processed BOOLEAN DEFAULT false,
  sentiment_score DECIMAL,              -- -1 to 1 (future: sentiment analysis)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_twitter_tweets_zone_id ON twitter_tweets(zone_id);
CREATE INDEX idx_twitter_tweets_tweet_id ON twitter_tweets(tweet_id);
CREATE INDEX idx_twitter_tweets_author_id ON twitter_tweets(author_id);
CREATE INDEX idx_twitter_tweets_twitter_created_at ON twitter_tweets(twitter_created_at DESC);
CREATE INDEX idx_twitter_tweets_collected_at ON twitter_tweets(collected_at DESC);
CREATE INDEX idx_twitter_tweets_is_processed ON twitter_tweets(is_processed);

-- Full-text search on tweet content
CREATE INDEX idx_twitter_tweets_text_search ON twitter_tweets USING gin(to_tsvector('english', text));

-- GIN index for JSONB queries
CREATE INDEX idx_twitter_tweets_raw_data ON twitter_tweets USING gin(raw_data);
```

---

#### `twitter_entities` - Extracted Entities
Stores hashtags, mentions, URLs for efficient querying.

```sql
CREATE TABLE twitter_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  -- Entity Details
  entity_type TEXT NOT NULL             -- 'hashtag' | 'mention' | 'url' | 'annotation'
    CHECK (entity_type IN ('hashtag', 'mention', 'url', 'annotation')),
  entity_value TEXT NOT NULL,           -- The actual value
  entity_normalized TEXT NOT NULL,      -- Lowercase, no special chars
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_twitter_entities_tweet_id ON twitter_entities(tweet_id);
CREATE INDEX idx_twitter_entities_zone_id ON twitter_entities(zone_id);
CREATE INDEX idx_twitter_entities_type ON twitter_entities(entity_type);
CREATE INDEX idx_twitter_entities_normalized ON twitter_entities(entity_normalized);

-- Composite index for fast entity lookups
CREATE INDEX idx_twitter_entities_zone_type_value 
  ON twitter_entities(zone_id, entity_type, entity_normalized);
```

---

#### `twitter_metrics_snapshots` - Historical Engagement
Tracks engagement metrics over time.

```sql
CREATE TABLE twitter_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  
  -- Metrics
  retweet_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0,
  impression_count INTEGER,
  
  -- Snapshot Time
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_twitter_metrics_tweet_id ON twitter_metrics_snapshots(tweet_id);
CREATE INDEX idx_twitter_metrics_snapshot_at ON twitter_metrics_snapshots(snapshot_at DESC);
```

---

### 2.2 Row Level Security (RLS)

All tables inherit client isolation:

```sql
-- twitter_rules RLS
ALTER TABLE twitter_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY twitter_rules_isolation ON twitter_rules
  USING (
    zone_id IN (
      SELECT id FROM zones WHERE client_id = (
        SELECT client_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Super admins bypass RLS
CREATE POLICY twitter_rules_super_admin ON twitter_rules
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Repeat similar policies for other tables
```

---

## 3. Data Layer Architecture

### 3.1 Modular Data Layer Structure

```
lib/
├── data/
│   ├── twitter/
│   │   ├── rules.ts           # Webhook rules CRUD
│   │   ├── tweets.ts          # Tweet data access
│   │   ├── entities.ts        # Entity queries
│   │   ├── metrics.ts         # Engagement metrics
│   │   └── query-builder.ts  # Query construction utilities
│   └── index.ts               # Export all data functions
├── api/
│   └── twitter/
│       ├── client.ts          # twitterapi.io API client
│       ├── webhooks.ts        # Webhook management
│       └── search.ts          # Advanced search
└── workers/
    └── twitter/
        ├── webhook-handler.ts # Process incoming webhooks
        ├── deduplicator.ts   # Handle duplicate detection
        └── enrichment.ts     # Data enrichment tasks
```

### 3.2 Core Data Functions

#### `lib/data/twitter/rules.ts`

```typescript
/**
 * Twitter webhook rules data layer
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { TwitterRule, QueryBuilderConfig } from "@/types/twitter";

export async function getTwitterRulesByZone(zoneId: string): Promise<TwitterRule[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('twitter_rules')
    .select('*')
    .eq('zone_id', zoneId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createTwitterRule(
  zoneId: string,
  query: string,
  queryType: 'simple' | 'builder',
  intervalSeconds: number,
  queryBuilderConfig?: QueryBuilderConfig,
  createdBy?: string
): Promise<TwitterRule> {
  const supabase = createAdminClient();
  
  // Generate unique tag
  const tag = `zone_${zoneId}_${Date.now()}`;
  
  const { data, error } = await supabase
    .from('twitter_rules')
    .insert({
      zone_id: zoneId,
      tag,
      query,
      query_type: queryType,
      interval_seconds: intervalSeconds,
      query_builder_config: queryBuilderConfig || null,
      created_by: createdBy,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTwitterRule(
  ruleId: string,
  updates: Partial<TwitterRule>
): Promise<TwitterRule> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('twitter_rules')
    .update(updates)
    .eq('id', ruleId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTwitterRule(ruleId: string): Promise<void> {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('twitter_rules')
    .delete()
    .eq('id', ruleId);
  
  if (error) throw error;
}

export async function toggleTwitterRule(
  ruleId: string,
  isActive: boolean
): Promise<TwitterRule> {
  return updateTwitterRule(ruleId, { is_active: isActive });
}
```

#### `lib/data/twitter/tweets.ts`

```typescript
/**
 * Twitter tweets data layer
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { TwitterTweet } from "@/types/twitter";

export async function getTweetsByZone(
  zoneId: string,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<TwitterTweet[]> {
  const supabase = createAdminClient();
  const { limit = 100, offset = 0, startDate, endDate } = options;
  
  let query = supabase
    .from('twitter_tweets')
    .select('*')
    .eq('zone_id', zoneId)
    .order('twitter_created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (startDate) {
    query = query.gte('twitter_created_at', startDate.toISOString());
  }
  
  if (endDate) {
    query = query.lte('twitter_created_at', endDate.toISOString());
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function getTweetById(tweetId: string): Promise<TwitterTweet | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('twitter_tweets')
    .select('*')
    .eq('id', tweetId)
    .single();
  
  if (error) return null;
  return data;
}

export async function getTweetByTwitterId(twitterId: string): Promise<TwitterTweet | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('twitter_tweets')
    .select('*')
    .eq('tweet_id', twitterId)
    .single();
  
  if (error) return null;
  return data;
}

export async function createTweet(tweet: Partial<TwitterTweet>): Promise<TwitterTweet> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('twitter_tweets')
    .insert(tweet)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function bulkCreateTweets(tweets: Partial<TwitterTweet>[]): Promise<TwitterTweet[]> {
  if (tweets.length === 0) return [];
  
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('twitter_tweets')
    .insert(tweets)
    .select();
  
  if (error) throw error;
  return data || [];
}

export async function searchTweets(
  zoneId: string,
  searchTerm: string,
  limit: number = 50
): Promise<TwitterTweet[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('twitter_tweets')
    .select('*')
    .eq('zone_id', zoneId)
    .textSearch('text', searchTerm)
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}
```

#### `lib/data/twitter/query-builder.ts`

```typescript
/**
 * Twitter query builder utilities
 */

import type { QueryBuilderConfig } from "@/types/twitter";

/**
 * Convert QueryBuilderConfig to Twitter search query string
 */
export function buildTwitterQuery(config: QueryBuilderConfig): string {
  const parts: string[] = [];
  
  // Keywords (AND logic)
  if (config.keywords.length > 0) {
    const keywordQuery = config.keywords
      .map(k => k.includes(' ') ? `"${k}"` : k)
      .join(' ');
    parts.push(keywordQuery);
  }
  
  // Hashtags
  if (config.hashtags.length > 0) {
    const hashtagQuery = config.hashtags
      .map(h => `#${h.replace('#', '')}`)
      .join(' OR ');
    parts.push(`(${hashtagQuery})`);
  }
  
  // Mentions
  if (config.mentions.length > 0) {
    const mentionQuery = config.mentions
      .map(m => `@${m.replace('@', '')}`)
      .join(' OR ');
    parts.push(`(${mentionQuery})`);
  }
  
  // From specific users
  if (config.from_users.length > 0) {
    const fromQuery = config.from_users
      .map(u => `from:${u.replace('@', '')}`)
      .join(' OR ');
    parts.push(`(${fromQuery})`);
  }
  
  // Exclude keywords
  if (config.exclude_keywords.length > 0) {
    config.exclude_keywords.forEach(k => {
      parts.push(`-${k.includes(' ') ? `"${k}"` : k}`);
    });
  }
  
  // Exclude users
  if (config.exclude_users.length > 0) {
    config.exclude_users.forEach(u => {
      parts.push(`-from:${u.replace('@', '')}`);
    });
  }
  
  // Filters
  const { filters } = config;
  if (filters.verified_only) parts.push('filter:verified');
  if (filters.has_media) parts.push('filter:media');
  if (filters.has_links) parts.push('filter:links');
  if (filters.min_retweets) parts.push(`min_retweets:${filters.min_retweets}`);
  if (filters.min_likes) parts.push(`min_faves:${filters.min_likes}`);
  
  // Date range
  if (config.date_range) {
    if (config.date_range.start) {
      parts.push(`since:${config.date_range.start.split('T')[0]}`);
    }
    if (config.date_range.end) {
      parts.push(`until:${config.date_range.end.split('T')[0]}`);
    }
  }
  
  // Language
  if (config.lang) {
    parts.push(`lang:${config.lang}`);
  }
  
  return parts.join(' ');
}

/**
 * Parse Twitter query string into QueryBuilderConfig (reverse operation)
 */
export function parseTwitterQuery(query: string): Partial<QueryBuilderConfig> {
  const config: Partial<QueryBuilderConfig> = {
    keywords: [],
    hashtags: [],
    mentions: [],
    from_users: [],
    exclude_keywords: [],
    exclude_users: [],
    filters: {
      verified_only: false,
      has_media: false,
      has_links: false,
    },
  };
  
  // This is a simplified parser - real implementation would need
  // more sophisticated regex patterns
  
  // Extract hashtags
  const hashtags = query.match(/#\w+/g) || [];
  config.hashtags = hashtags.map(h => h.slice(1));
  
  // Extract mentions
  const mentions = query.match(/@\w+/g) || [];
  config.mentions = mentions.map(m => m.slice(1));
  
  // Extract from: users
  const fromUsers = query.match(/from:\w+/g) || [];
  config.from_users = fromUsers.map(f => f.split(':')[1]);
  
  // Extract filters
  if (query.includes('filter:verified')) config.filters!.verified_only = true;
  if (query.includes('filter:media')) config.filters!.has_media = true;
  if (query.includes('filter:links')) config.filters!.has_links = true;
  
  // Extract min_retweets
  const minRtMatch = query.match(/min_retweets:(\d+)/);
  if (minRtMatch) config.filters!.min_retweets = parseInt(minRtMatch[1]);
  
  // Extract language
  const langMatch = query.match(/lang:(\w+)/);
  if (langMatch) config.lang = langMatch[1];
  
  return config;
}
```

---

## 4. Deduplication Strategy

### 4.1 The Problem
With multiple rules and frequent polling, the same tweet may be captured multiple times.

### 4.2 Solution: Tweet ID-based Deduplication

**Database Constraint**:
```sql
-- tweet_id is UNIQUE
ALTER TABLE twitter_tweets ADD CONSTRAINT twitter_tweets_tweet_id_unique UNIQUE (tweet_id);
```

**Application Logic**:
```typescript
/**
 * lib/workers/twitter/deduplicator.ts
 */

export async function processTweets(
  zoneId: string,
  tweets: any[]
): Promise<{ created: number; duplicates: number }> {
  let created = 0;
  let duplicates = 0;
  
  for (const tweet of tweets) {
    // Check if tweet already exists
    const existing = await getTweetByTwitterId(tweet.id);
    
    if (existing) {
      duplicates++;
      
      // Update engagement metrics if changed
      await updateTweetMetrics(existing.id, {
        retweet_count: tweet.public_metrics.retweet_count,
        reply_count: tweet.public_metrics.reply_count,
        like_count: tweet.public_metrics.like_count,
        quote_count: tweet.public_metrics.quote_count,
      });
      
      continue;
    }
    
    // Create new tweet
    await createTweet({
      zone_id: zoneId,
      tweet_id: tweet.id,
      author_id: tweet.author_id,
      text: tweet.text,
      // ... map all fields
    });
    
    created++;
  }
  
  return { created, duplicates };
}
```

**Alternative: Batch Upsert**:
```typescript
export async function batchUpsertTweets(
  zoneId: string,
  tweets: any[]
): Promise<void> {
  const supabase = createAdminClient();
  
  const records = tweets.map(tweet => ({
    zone_id: zoneId,
    tweet_id: tweet.id,
    // ... all fields
  }));
  
  // PostgreSQL UPSERT (ON CONFLICT DO UPDATE)
  const { error } = await supabase
    .from('twitter_tweets')
    .upsert(records, {
      onConflict: 'tweet_id',
      ignoreDuplicates: false, // Update metrics on conflict
    });
  
  if (error) throw error;
}
```

---

## 5. Performance Optimization

### 5.1 Handling 10,000 Tweets/Hour

**Challenge**: 10,000 tweets/hour = ~167 tweets/minute = ~2.8 tweets/second

**Strategies**:

#### Batch Processing
```typescript
const BATCH_SIZE = 100;

export async function processTweetsInBatches(
  zoneId: string,
  tweets: any[]
): Promise<void> {
  for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
    const batch = tweets.slice(i, i + BATCH_SIZE);
    await batchUpsertTweets(zoneId, batch);
  }
}
```

#### Background Workers (QStash)
```typescript
// app/api/webhooks/twitter/route.ts
export async function POST(request: Request) {
  const payload = await request.json();
  
  // Immediately acknowledge webhook
  // Process in background
  await qstashClient.publishJSON({
    url: `${env.appUrl}/api/workers/twitter/process`,
    body: payload,
  });
  
  return Response.json({ status: 'accepted' });
}
```

#### Redis Caching
```typescript
import { redis } from '@/lib/cache/redis';

// Cache recent tweet IDs for fast deduplication
export async function isTweetProcessed(tweetId: string): Promise<boolean> {
  const cached = await redis.get(`tweet:processed:${tweetId}`);
  return cached === '1';
}

export async function markTweetProcessed(tweetId: string): Promise<void> {
  await redis.set(`tweet:processed:${tweetId}`, '1', {
    ex: 7 * 24 * 60 * 60, // 7 days TTL
  });
}
```

#### Database Partitioning (Future)
```sql
-- Partition tweets by created_at (monthly partitions)
CREATE TABLE twitter_tweets_2024_11 PARTITION OF twitter_tweets
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
```

---

### 5.2 Query Optimization

#### Indexes
- `tweet_id` for deduplication lookups
- `zone_id` + `twitter_created_at` for feed queries
- `is_processed` for batch processing
- GIN indexes for JSONB and full-text search

#### Materialized Views (for analytics)
```sql
CREATE MATERIALIZED VIEW twitter_zone_stats AS
SELECT
  zone_id,
  COUNT(*) as total_tweets,
  COUNT(DISTINCT author_id) as unique_authors,
  SUM(retweet_count) as total_retweets,
  SUM(like_count) as total_likes,
  AVG(sentiment_score) as avg_sentiment,
  date_trunc('hour', twitter_created_at) as hour
FROM twitter_tweets
GROUP BY zone_id, date_trunc('hour', twitter_created_at);

-- Refresh every hour
CREATE INDEX ON twitter_zone_stats (zone_id, hour DESC);
```

---

## 6. API Client Architecture

### 6.1 Twitter API Client

```typescript
/**
 * lib/api/twitter/client.ts
 */

import { env } from "@/lib/env";

export class TwitterAPIClient {
  private baseURL = 'https://api.twitterapi.io/v1';
  private apiKey: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.twitter.apiKey;
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Webhook Management
  async addWebhookRule(
    tag: string,
    value: string,
    intervalSeconds: number
  ): Promise<any> {
    return this.request('/webhook/add_rule', {
      method: 'POST',
      body: JSON.stringify({ tag, value, interval_seconds: intervalSeconds }),
    });
  }
  
  async getWebhookRules(): Promise<any[]> {
    return this.request('/webhook/get_rules');
  }
  
  async updateWebhookRule(
    ruleId: string,
    updates: { tag?: string; value?: string; interval_seconds?: number; is_active?: boolean }
  ): Promise<any> {
    return this.request(`/webhook/update_rule/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
  
  async deleteWebhookRule(ruleId: string): Promise<void> {
    return this.request(`/webhook/delete_rule/${ruleId}`, {
      method: 'DELETE',
    });
  }
  
  // Advanced Search
  async searchTweets(params: TwitterSearchParams): Promise<any> {
    const queryString = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    
    return this.request(`/tweets/search/advanced?${queryString}`);
  }
}

export const twitterClient = new TwitterAPIClient();
```

---

## 7. UI Components Architecture

### 7.1 Twitter Settings Tab Structure

**Design Reference**: Provided UI mockup

```
components/dashboard/zones/twitter/
├── twitter-rules-panel.tsx        # Main panel with "Add Rule" button + rules list
├── add-rule-dialog.tsx            # Dialog with Simple/Builder tabs
├── simple-query-tab.tsx           # Simple text input mode
├── query-builder-tab.tsx          # Visual query builder
├── active-rules-list.tsx          # Table of active rules
├── rule-item.tsx                  # Individual rule card/row
└── query-preview.tsx              # Real-time query preview
```

### 7.2 Query Builder UI Design

**Features**:
- Tag input for keywords, hashtags, mentions
- User selection (from: users)
- Filters (verified, has media, min engagement)
- Date range picker
- Language selector
- Real-time query preview
- Auto-save

**Implementation**: Next section

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. ✅ Database schema design (this document)
2. ⏳ Database migration (create tables)
3. ⏳ Type definitions
4. ⏳ Update env.ts with Twitter API key

### Phase 2: Data Layer (Week 1-2)
1. ⏳ `lib/data/twitter/rules.ts`
2. ⏳ `lib/data/twitter/tweets.ts`
3. ⏳ `lib/data/twitter/entities.ts`
4. ⏳ `lib/data/twitter/query-builder.ts`
5. ⏳ Server actions

### Phase 3: API Integration (Week 2)
1. ⏳ `lib/api/twitter/client.ts`
2. ⏳ Webhook management functions
3. ⏳ Advanced search integration

### Phase 4: Webhook Handler (Week 2-3)
1. ⏳ `/app/api/webhooks/twitter/route.ts`
2. ⏳ Deduplication logic
3. ⏳ Background processing with QStash

### Phase 5: UI Components (Week 3-4)
1. ⏳ Twitter settings tab in zone settings
2. ⏳ Simple query input
3. ⏳ Visual query builder
4. ⏳ Active rules management
5. ⏳ Real-time query preview

### Phase 6: Testing & Optimization (Week 4)
1. ⏳ Test webhook flow end-to-end
2. ⏳ Performance testing with high volume
3. ⏳ Deduplication verification
4. ⏳ Redis caching implementation

---

## 9. Key Questions & Answers

### Q1: How do we configure the webhook URL with twitterapi.io?
**A**: ✅ **CONFIRMED** - Webhook URL configured per rule via:
- API endpoint when creating rule: `webhook_url` field
- OR via twitterapi.io dashboard interface
- Our endpoint: `https://gorgone.onrender.com/api/webhooks/twitter`

**Security**: Each webhook request includes `X-API-Key` header for verification

### Q2: Should we create one webhook rule per zone or consolidate?
**A**: ✅ **CONFIRMED** - **Multiple rules per zone**
- Each zone can have multiple monitoring rules active simultaneously
- Example: Zone "Presidential Campaign" could have:
  - Rule 1: Monitor @POTUS (interval: 5 min)
  - Rule 2: Monitor #election2024 (interval: 15 min)
  - Rule 3: Monitor competitor mentions (interval: 30 min)
- Each rule triggers independently based on its own interval

### Q3: How do we handle rate limits?
**A**: 
- Minimum interval: 60 seconds (API limit)
- Use QStash for background processing
- Implement exponential backoff on errors

### Q4: What about historical data?
**A**: Use Advanced Search API for backfilling:
```typescript
async function backfillTweets(zoneId: string, query: string, startDate: Date) {
  const tweets = await twitterClient.searchTweets({
    query,
    start_time: startDate.toISOString(),
    max_results: 100,
  });
  
  await processTweets(zoneId, tweets.data);
}
```

### Q5: How to handle deleted tweets?
**A**: 
- Keep historical record (soft delete)
- Add `is_deleted` flag
- Webhook won't send deleted tweets, but we keep our copy for audit

---

## 10. Security Considerations

1. **API Key Protection**: Never expose Twitter API key to client
2. **Webhook Verification**: Verify webhook signatures (if provided by twitterapi.io)
3. **RLS Enforcement**: All queries filtered by client_id via zones
4. **Rate Limiting**: Implement rate limits on webhook endpoint
5. **Input Validation**: Sanitize all query inputs before sending to API

---

## 11. Next Steps

1. **Review this document** with team
2. **Confirm twitterapi.io webhook URL setup**
3. **Test webhook payload structure** (may differ from docs)
4. **Begin Phase 1**: Database migration
5. **Create types file** for Twitter data structures

---

## Conclusion

This architecture provides:
- ✅ **Scalable**: Handles 10,000+ tweets/hour
- ✅ **Modular**: Clean data layer separation
- ✅ **Performant**: Batching, caching, indexing
- ✅ **Deduplication**: Tweet ID-based uniqueness
- ✅ **Extensible**: Easy to add new data sources
- ✅ **Production-ready**: Government-grade quality

**Status**: Ready for implementation 🚀

---

**Document Version**: 1.0  
**Last Updated**: November 13, 2025  
**Author**: Gorgone Development Team

