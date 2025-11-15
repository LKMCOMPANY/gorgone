# Gorgone V2 - Database Schema

**Database**: PostgreSQL (Supabase)  
**Last Updated**: 2025-11-15  
**Status**: Production

---

## Overview

Gorgone uses a PostgreSQL database hosted on Supabase with Row Level Security (RLS) enabled on all tables. The schema is designed for:
- Multi-tenant isolation (clients)
- Role-based access control
- High-volume data monitoring (10K+ tweets/hour)
- Performance optimization (58+ indexes)
- Scalability (partitioning-ready)

---

## Core Tables

### 1. `auth.users` (Supabase Auth)

Managed by Supabase Auth. Contains authentication data.

---

### 2. `public.profiles`

User profiles extending Supabase Auth users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, FK to auth.users | User ID |
| `email` | TEXT | UNIQUE, NOT NULL | User email |
| `role` | TEXT | NOT NULL | super_admin \| admin \| operator \| manager |
| `organization` | TEXT | NULLABLE | Company/organization name |
| `client_id` | UUID | FK to clients, NULLABLE | NULL for super_admin |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `created_by` | UUID | FK to auth.users | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**:
- Primary key on `id`
- Unique on `email`
- Index on `client_id`
- Index on `role`

**RLS**: Enabled

---

### 3. `public.clients`

Client organizations (tenants).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Client ID |
| `name` | TEXT | NOT NULL | Client name |
| `description` | TEXT | NULLABLE | Client description |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active status |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `created_by` | UUID | FK to auth.users | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**:
- Primary key on `id`
- Index on `is_active`

**RLS**: Enabled

---

### 4. `public.zones`

Monitoring zones within clients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Zone ID |
| `name` | TEXT | NOT NULL | Zone name |
| `client_id` | UUID | FK to clients, NOT NULL | Parent client |
| `operational_context` | TEXT | NULLABLE | Zone description/context |
| `data_sources` | JSONB | DEFAULT '{"twitter":false,"tiktok":false,"media":false}' | Enabled sources |
| `settings` | JSONB | DEFAULT '{}' | Zone-specific settings |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active status |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `created_by` | UUID | FK to auth.users | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**:
- Primary key on `id`
- Index on `client_id`
- Index on `is_active`

**RLS**: Enabled

---

## Twitter Tables

### 5. `public.twitter_profiles`

Normalized Twitter user profiles (no duplication).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Internal profile ID |
| `twitter_user_id` | TEXT | UNIQUE, NOT NULL | Twitter's user ID |
| `username` | TEXT | NOT NULL | Twitter username (lowercase) |
| `name` | TEXT | NOT NULL | Display name |
| `profile_picture_url` | TEXT | NULLABLE | Profile picture URL |
| `cover_picture_url` | TEXT | NULLABLE | Cover/banner picture URL |
| `description` | TEXT | NULLABLE | Bio |
| `location` | TEXT | NULLABLE | Location |
| `is_verified` | BOOLEAN | DEFAULT FALSE | Legacy verified badge |
| `is_blue_verified` | BOOLEAN | DEFAULT FALSE | Blue checkmark |
| `verified_type` | TEXT | NULLABLE | Verification type |
| `followers_count` | INTEGER | DEFAULT 0 | Follower count |
| `following_count` | INTEGER | DEFAULT 0 | Following count |
| `tweets_count` | INTEGER | DEFAULT 0 | Total tweets |
| `media_count` | INTEGER | DEFAULT 0 | Media count |
| `favourites_count` | INTEGER | DEFAULT 0 | Likes count |
| `twitter_created_at` | TIMESTAMPTZ | NULLABLE | Account creation date |
| `is_automated` | BOOLEAN | DEFAULT FALSE | Bot account |
| `automated_by` | TEXT | NULLABLE | Bot owner |
| `can_dm` | BOOLEAN | DEFAULT FALSE | DM enabled |
| `possibly_sensitive` | BOOLEAN | DEFAULT FALSE | Sensitive content |
| `profile_url` | TEXT | NULLABLE | twitter.com URL |
| `twitter_url` | TEXT | NULLABLE | x.com URL |
| `raw_data` | JSONB | NULLABLE | Full API response |
| `first_seen_at` | TIMESTAMPTZ | DEFAULT NOW() | First captured |
| `last_seen_at` | TIMESTAMPTZ | DEFAULT NOW() | Last activity |
| `last_updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last data refresh |
| `total_tweets_collected` | INTEGER | DEFAULT 0 | Tweets from this user |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**:
- Primary key on `id`
- Unique on `twitter_user_id`
- Index on `username`
- Index on `followers_count DESC`
- Index on `last_seen_at DESC`
- Index on `total_tweets_collected DESC`
- GIN index on full-text search (`name || username || description`)

**RLS**: Enabled

---

### 6. `public.twitter_tweets`

Tweets with FK to normalized profiles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Internal tweet ID |
| `zone_id` | UUID | FK to zones, NOT NULL | Parent zone |
| `tweet_id` | TEXT | UNIQUE, NOT NULL | Twitter's tweet ID |
| `author_profile_id` | UUID | FK to twitter_profiles | Author reference |
| `conversation_id` | TEXT | NULLABLE | Thread/conversation ID |
| `text` | TEXT | NOT NULL | Tweet content |
| `lang` | TEXT | NULLABLE | Language code |
| `source` | TEXT | NULLABLE | Tweet source (client) |
| `twitter_created_at` | TIMESTAMPTZ | NOT NULL | Tweet creation time |
| `collected_at` | TIMESTAMPTZ | DEFAULT NOW() | Collection timestamp |
| `retweet_count` | INTEGER | DEFAULT 0 | Retweets |
| `reply_count` | INTEGER | DEFAULT 0 | Replies |
| `like_count` | INTEGER | DEFAULT 0 | Likes |
| `quote_count` | INTEGER | DEFAULT 0 | Quotes |
| `view_count` | INTEGER | DEFAULT 0 | Views |
| `bookmark_count` | INTEGER | DEFAULT 0 | Bookmarks |
| `total_engagement` | INTEGER | GENERATED ALWAYS AS (retweet_count+reply_count+like_count+quote_count) | Auto-calculated |
| `has_media` | BOOLEAN | DEFAULT FALSE | Contains media |
| `has_links` | BOOLEAN | DEFAULT FALSE | Contains URLs |
| `has_hashtags` | BOOLEAN | DEFAULT FALSE | Contains hashtags |
| `has_mentions` | BOOLEAN | DEFAULT FALSE | Contains mentions |
| `is_reply` | BOOLEAN | DEFAULT FALSE | Is a reply |
| `in_reply_to_tweet_id` | TEXT | NULLABLE | Parent tweet ID |
| `in_reply_to_user_id` | TEXT | NULLABLE | Parent user ID |
| `in_reply_to_username` | TEXT | NULLABLE | Parent username |
| `tweet_url` | TEXT | NULLABLE | twitter.com URL |
| `twitter_url` | TEXT | NULLABLE | x.com URL |
| `raw_data` | JSONB | NOT NULL | Full API response |
| `is_processed` | BOOLEAN | DEFAULT FALSE | Processing status |
| `sentiment_score` | NUMERIC | NULLABLE | Sentiment analysis |
| `embedding` | VECTOR(1536) | NULLABLE | OpenAI embedding (future) |
| `embedding_model` | TEXT | NULLABLE | Model used |
| `embedding_created_at` | TIMESTAMPTZ | NULLABLE | Embedding timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes** (14):
- Primary key on `id`
- Unique on `tweet_id`
- Index on `zone_id`
- Index on `author_profile_id`
- Index on `conversation_id`
- Composite on `(zone_id, twitter_created_at DESC)` - Feed queries
- Composite on `(zone_id, total_engagement DESC)` - Top tweets
- Index on `twitter_created_at DESC`
- Index on `collected_at DESC`
- Index on `total_engagement DESC`
- Partial on `(zone_id, twitter_created_at DESC) WHERE has_media = TRUE`
- Partial on `(zone_id, twitter_created_at DESC) WHERE is_reply = TRUE`
- GIN on full-text search (`to_tsvector('english', text)`)
- GIN on `raw_data` JSONB
- IVFFLAT on `embedding` (vector similarity search)

**RLS**: Enabled

---

### 7. `public.twitter_engagement_history`

Time-series snapshots of tweet engagement.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Snapshot ID |
| `tweet_id` | UUID | FK to twitter_tweets | Tweet reference |
| `retweet_count` | INTEGER | DEFAULT 0 | |
| `reply_count` | INTEGER | DEFAULT 0 | |
| `like_count` | INTEGER | DEFAULT 0 | |
| `quote_count` | INTEGER | DEFAULT 0 | |
| `view_count` | INTEGER | DEFAULT 0 | |
| `bookmark_count` | INTEGER | DEFAULT 0 | |
| `total_engagement` | INTEGER | GENERATED | Auto-calculated |
| `delta_retweets` | INTEGER | DEFAULT 0 | Change since last |
| `delta_replies` | INTEGER | DEFAULT 0 | |
| `delta_likes` | INTEGER | DEFAULT 0 | |
| `delta_quotes` | INTEGER | DEFAULT 0 | |
| `delta_views` | INTEGER | DEFAULT 0 | |
| `engagement_velocity` | NUMERIC | NULLABLE | Change rate (per hour) |
| `snapshot_at` | TIMESTAMPTZ | DEFAULT NOW() | Snapshot timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes** (5):
- Primary key on `id`
- Index on `tweet_id`
- Composite on `(tweet_id, snapshot_at DESC)`
- Index on `snapshot_at DESC`
- Index on `engagement_velocity DESC`

**RLS**: Enabled

---

### 8. `public.twitter_profile_snapshots`

Profile stats evolution over time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Snapshot ID |
| `profile_id` | UUID | FK to twitter_profiles | Profile reference |
| `followers_count` | INTEGER | DEFAULT 0 | |
| `following_count` | INTEGER | DEFAULT 0 | |
| `tweets_count` | INTEGER | DEFAULT 0 | |
| `favourites_count` | INTEGER | DEFAULT 0 | |
| `delta_followers` | INTEGER | DEFAULT 0 | Change since last |
| `delta_following` | INTEGER | DEFAULT 0 | |
| `delta_tweets` | INTEGER | DEFAULT 0 | |
| `followers_growth_rate` | NUMERIC | NULLABLE | % growth |
| `snapshot_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes** (5):
- Primary key on `id`
- Index on `profile_id`
- Composite on `(profile_id, snapshot_at DESC)`
- Index on `snapshot_at DESC`
- Index on `followers_growth_rate DESC`

**RLS**: Enabled

---

### 9. `public.twitter_entities`

Extracted hashtags, mentions, URLs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Entity ID |
| `tweet_id` | UUID | FK to twitter_tweets | Parent tweet |
| `zone_id` | UUID | FK to zones | Parent zone |
| `entity_type` | TEXT | CHECK (hashtag \| mention \| url) | Entity type |
| `entity_value` | TEXT | NOT NULL | Original value |
| `entity_normalized` | TEXT | NOT NULL | Lowercase normalized |
| `start_index` | INTEGER | NULLABLE | Position in text |
| `end_index` | INTEGER | NULLABLE | End position |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes** (7):
- Primary key on `id`
- Index on `tweet_id`
- Index on `zone_id`
- Index on `entity_type`
- Index on `entity_normalized`
- Composite on `(zone_id, entity_type, entity_normalized)` - Trending queries

**RLS**: Enabled

---

### 10. `public.twitter_rules`

Webhook rule configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Rule ID |
| `zone_id` | UUID | FK to zones | Parent zone |
| `tag` | TEXT | NOT NULL | Rule name/identifier |
| `query` | TEXT | NOT NULL | Twitter search query |
| `query_type` | TEXT | CHECK (simple \| builder) | Query mode |
| `interval_seconds` | INTEGER | CHECK >= 60 | Check interval |
| `query_builder_config` | JSONB | NULLABLE | Builder config |
| `external_rule_id` | TEXT | NULLABLE | TwitterAPI.io rule ID |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active status |
| `last_triggered_at` | TIMESTAMPTZ | NULLABLE | Last check time |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `created_by` | UUID | FK to auth.users | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes** (4):
- Primary key on `id`
- Index on `zone_id`
- Index on `external_rule_id`
- Index on `is_active`
- Unique on `(tag, zone_id)`

**RLS**: Enabled

---

### 11. `public.twitter_profile_zone_tags`

Profile categorization for Share of Voice analysis.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Tag ID |
| `profile_id` | UUID | FK to twitter_profiles | Tagged profile |
| `zone_id` | UUID | FK to zones | Parent zone |
| `tag_type` | TEXT | CHECK (7 types) | attila \| adversary \| surveillance \| target \| ally \| asset \| local_team |
| `notes` | TEXT | NULLABLE | Additional notes |
| `confidence_score` | NUMERIC | NULLABLE | Tag confidence |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `created_by` | UUID | FK to auth.users | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes** (5):
- Primary key on `id`
- Index on `profile_id`
- Index on `zone_id`
- Index on `tag_type`
- Composite on `(zone_id, tag_type)` - Share of Voice
- Unique on `(profile_id, zone_id, tag_type)`

**RLS**: Enabled

---

### 12. `public.twitter_engagement_tracking`

Tiered engagement update scheduling.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Tracking ID |
| `tweet_db_id` | UUID | FK to twitter_tweets | Tweet reference |
| `tier` | TEXT | CHECK (4 tiers) | ultra_hot \| hot \| warm \| cold |
| `last_updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |
| `next_update_at` | TIMESTAMPTZ | NULLABLE | Next scheduled update |
| `update_count` | INTEGER | DEFAULT 0 | Total updates done |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Tier Strategy**:
- `ultra_hot` (0-1h): Update every 10 min
- `hot` (1-4h): Update every 30 min  
- `warm` (4-12h): Update every 1h
- `cold` (12h+): Stop tracking

**Indexes** (3):
- Primary key on `id`
- Index on `tier`
- Partial on `next_update_at WHERE tier != 'cold'`

**RLS**: Enabled

---

## Materialized Views

### 1. `twitter_zone_stats_hourly`

Hourly aggregated statistics per zone.

**Columns**: `zone_id`, `hour`, `total_tweets`, `unique_authors`, `total_retweets`, `total_replies`, `total_likes`, `total_quotes`, `total_views`, `total_engagement`

**Refresh**: Every 5 minutes (cron)

**Indexes**:
- `(zone_id, hour DESC)`
- `total_engagement DESC`

---

### 2. `twitter_zone_stats_daily`

Daily aggregated statistics per zone.

**Columns**: `zone_id`, `day`, `total_tweets`, `unique_authors`, `total_engagement`

**Refresh**: Once per day (cron)

**Indexes**:
- `(zone_id, day DESC)`

---

### 3. `twitter_top_profiles_by_zone`

Top profiles by engagement per zone.

**Columns**: `zone_id`, `profile_id`, `username`, `name`, `tweet_count`, `total_engagement`, `avg_engagement`, `followers_count`

**Refresh**: Every 5 minutes (cron)

**Indexes**:
- `(zone_id, total_engagement DESC)`
- `(zone_id, tweet_count DESC)`

---

### 4. `twitter_trending_hashtags`

Trending hashtags analysis.

**Columns**: `zone_id`, `hashtag`, `tweet_count_24h`, `tweet_count_7d`, `unique_authors_24h`

**Refresh**: Every 10 minutes (cron)

**Indexes**:
- `(zone_id, tweet_count_24h DESC)`

---

### 5. `twitter_share_of_voice`

Share of Voice by profile tag type.

**Columns**: `zone_id`, `tag_type`, `total_tweets`, `total_engagement`, `unique_profiles`, `volume_percentage`, `engagement_percentage`

**Refresh**: Every 10 minutes (cron)

**Indexes**:
- Index on `zone_id`
- Index on `tag_type`

---

## Regular Views

### 1. `twitter_threads_with_context`

Recursive thread reconstruction.

**Columns**: All tweet columns + `depth`, `path`, `root_tweet_id`

**Uses**: Recursive CTE to build thread hierarchy

---

### 2. `twitter_orphaned_replies`

Tweets where parent is not in database.

**Columns**: Tweet columns + `missing_parent_id`

**Uses**: Identify tweets needing parent fetching

---

## Index Strategy

### Critical Composite Indexes

```sql
-- Feed queries (zone + time)
idx_twitter_tweets_zone_created (zone_id, twitter_created_at DESC)

-- Top posts (zone + engagement)
idx_twitter_tweets_zone_engagement (zone_id, total_engagement DESC)

-- Profile tweets
idx_twitter_tweets_author (author_profile_id)

-- Conversation resolution
idx_twitter_tweets_conversation (conversation_id)

-- Trending hashtags
idx_twitter_entities_zone_type_value (zone_id, entity_type, entity_normalized)

-- Share of Voice
idx_profile_zone_tags_zone_type (zone_id, tag_type)
```

### Partial Indexes (Optimized Queries)

```sql
-- Tweets with media
idx_twitter_tweets_has_media (...) WHERE has_media = TRUE

-- Reply threads
idx_twitter_tweets_is_reply (...) WHERE is_reply = TRUE

-- Active tracking
idx_engagement_tracking_next_update (...) WHERE tier != 'cold'
```

### Full-Text Search (GIN)

```sql
-- Tweet content search
idx_twitter_tweets_text_search (to_tsvector('english', text))

-- Profile search
idx_twitter_profiles_search (name || username || description)
```

### Vector Search (IVFFLAT)

```sql
-- Future: 3D opinion mapping
idx_twitter_tweets_embedding (embedding vector_cosine_ops)
```

**Total Indexes**: 58+

---

## Performance Benchmarks

| Query Type | Target | Achieved | Method |
|------------|--------|----------|--------|
| Feed (recent tweets) | < 100ms | < 10ms | Index scan |
| Volume chart 24h | < 50ms | < 10ms | Materialized view |
| Top profiles | < 100ms | < 5ms | Materialized view |
| Share of Voice | < 100ms | < 5ms | Materialized view |
| Full-text search | < 200ms | < 50ms | GIN index |
| Thread mapping | < 150ms | < 30ms | Recursive CTE |

**All critical queries < 50ms**

---

## RLS Policies

All tables have RLS enabled with the following logic:

- **super_admin**: Full access to all data
- **admin**: Read-only access to all data
- **operator**: Read-only to zones from their client
- **manager**: Read-write to zones from their client

Policies are enforced at the database level for maximum security.

---

## Future Optimizations

### Partitioning (When > 1M tweets)

```sql
-- Partition twitter_tweets by month
CREATE TABLE twitter_tweets_2025_11 PARTITION OF twitter_tweets
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

### Read Replicas

For zones with very high volume, Supabase read replicas can be added for:
- Analytics queries
- Feed pagination
- Search operations

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-15  
**Status**: Production-Ready

