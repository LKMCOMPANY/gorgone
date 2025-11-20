# TikTok Data Mapping - Complete Structure

## 📹 VIDEO DATA (from API response)

### Basic Video Info
| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `id` | string | Video unique ID | ✅ PRIMARY |
| `desc` | string | Video description/caption | ✅ |
| `createTime` | number | Unix timestamp | ✅ |
| `video.duration` | number | Duration in seconds | ✅ |
| `video.height` | number | Video height (px) | ✅ |
| `video.width` | number | Video width (px) | ✅ |
| `video.ratio` | string | Aspect ratio | ✅ |
| `video.cover` | string | Thumbnail URL | ✅ |
| `video.dynamicCover` | string | Animated cover URL | ✅ |
| `video.playAddr` | string | Video playback URL | ❌ (temp) |
| `video.downloadAddr` | string | Download URL | ❌ (temp) |
| `video.format` | string | Video format | ✅ |

### Engagement Stats (TRACKABLE!) ⭐
| Field API | Type | Description | Track Evolution? |
|-----------|------|-------------|------------------|
| `stats.playCount` | number | Views | ✅ YES |
| `stats.diggCount` | number | Likes | ✅ YES |
| `stats.commentCount` | number | Comments | ✅ YES |
| `stats.shareCount` | number | Shares | ✅ YES |
| `stats.collectCount` | number | Saves/Favorites | ✅ YES |

**💡 Total Engagement = playCount + diggCount + commentCount + shareCount + collectCount**

### Author Info (Reference to profile)
| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `author.id` | string | Author TikTok ID | ✅ FK to profiles |
| `author.uniqueId` | string | Username | ✅ Normalized |
| `author.nickname` | string | Display name | ✅ |
| `author.avatarThumb` | string | Small avatar | ✅ |
| `author.avatarMedium` | string | Medium avatar | ✅ |
| `author.avatarLarger` | string | Large avatar | ✅ |
| `author.signature` | string | Bio | ✅ |
| `author.verified` | boolean | Verified badge | ✅ |
| `author.secUid` | string | Secure ID for API | ✅ |
| `author.privateAccount` | boolean | Private account? | ✅ |

### Hashtags/Challenges (Extract to separate table)
| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `challenges[]` | array | Hashtags used | ✅ entities table |
| `challenges[].id` | string | Hashtag ID | ✅ |
| `challenges[].title` | string | Hashtag name | ✅ |
| `challenges[].desc` | string | Hashtag description | ✅ |
| `challenges[].isCommerce` | boolean | Is commerce hashtag | ✅ |

### Music Info
| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `music.id` | string | Music ID | ✅ |
| `music.title` | string | Song title | ✅ |
| `music.authorName` | string | Artist name | ✅ |
| `music.duration` | number | Music duration | ✅ |
| `music.playUrl` | string | Music URL | ❌ (temp) |

### Video Flags/Metadata
| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `isAd` | boolean | Is advertisement | ✅ |
| `secret` | boolean | Private video | ✅ |
| `forFriend` | boolean | Friends only | ✅ |
| `originalItem` | boolean | Original content | ✅ |
| `officalItem` | boolean | Official content | ✅ |
| `diversificationId` | string | Content category | ✅ |
| `shareUrl` | string | Web share URL | ✅ |
| `locationCreated` | string | Location | ✅ |

### Text Extras (Mentions in description)
| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `textExtra[]` | array | Mentions/hashtags in text | ✅ entities |
| `textExtra[].hashtagName` | string | Hashtag from text | ✅ |
| `textExtra[].userId` | string | Mentioned user ID | ✅ |

---

## 👤 PROFILE DATA (from /public/check)

### Basic Profile Info
| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `user.id` | string | TikTok user ID | ✅ PRIMARY |
| `user.uniqueId` | string | Username (lowercase) | ✅ UNIQUE |
| `user.nickname` | string | Display name | ✅ |
| `user.signature` | string | Bio | ✅ |
| `user.avatarThumb` | string | Small avatar | ✅ |
| `user.avatarMedium` | string | Medium avatar | ✅ |
| `user.avatarLarger` | string | Large avatar | ✅ |
| `user.secUid` | string | Secure ID for API | ✅ UNIQUE |
| `user.verified` | boolean | Verified badge | ✅ |
| `user.privateAccount` | boolean | Private account | ✅ |
| `user.region` | string | Country/Region | ✅ |
| `user.language` | string | Language | ✅ |

### Profile Stats (TRACKABLE!) ⭐
| Field API | Type | Description | Track Evolution? |
|-----------|------|-------------|------------------|
| `stats.followerCount` | number | Followers | ✅ YES |
| `stats.followingCount` | number | Following | ✅ YES |
| `stats.heart` | number | Total likes received | ✅ YES |
| `stats.heartCount` | number | Total likes (duplicate) | ✅ YES |
| `stats.videoCount` | number | Total videos | ✅ YES |
| `stats.diggCount` | number | Liked by user | ✅ YES |

### Profile Links
| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `user.bioLink.link` | string | Bio link URL | ✅ |
| `user.bioLink.risk` | number | Link risk level | ✅ |

---

## 💬 COMMENT DATA (from /public/comment/list)

| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `cid` | string | Comment ID | ✅ PRIMARY |
| `text` | string | Comment text | ✅ |
| `create_time` | number | Unix timestamp | ✅ |
| `digg_count` | number | Likes on comment | ✅ |
| `reply_comment_total` | number | Reply count | ✅ |
| `user.uid` | string | Commenter ID | ✅ FK |
| `user.unique_id` | string | Commenter username | ✅ |
| `user.nickname` | string | Commenter name | ✅ |

---

## 🎵 MUSIC DATA (from /public/music/info)

| Field API | Type | Description | Store? |
|-----------|------|-------------|--------|
| `music.id` | string | Music ID | ✅ PRIMARY |
| `music.title` | string | Song title | ✅ |
| `music.authorName` | string | Artist | ✅ |
| `music.original` | boolean | Original sound | ✅ |
| `music.duration` | number | Duration | ✅ |
| `stats.videoCount` | number | Videos using it | ✅ |

---

## 📊 ENGAGEMENT TRACKING STRATEGY

### ✅ **YES, we can track engagement evolution like Twitter!**

**Same 5 metrics** (like Twitter has retweet/reply/like/quote):
1. **Views** (`playCount`)
2. **Likes** (`diggCount`)
3. **Comments** (`commentCount`)
4. **Shares** (`shareCount`)
5. **Saves** (`collectCount`)

**Plus 1 bonus:**
6. **Total Engagement** = sum of all above

### Tracking Tiers (same as Twitter)
```
ULTRA_HOT (0-1h)    → Check every 10 min
HOT (1-4h)          → Check every 30 min
WARM (4-12h)        → Check every 1h
COLD (12h+)         → Stop tracking
```

**Threshold**: P25 of zone (videos with engagement > zone median)

---

## 🗄️ PROPOSED DATABASE SCHEMA

### Table 1: `tiktok_profiles`
```sql
CREATE TABLE tiktok_profiles (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_user_id TEXT UNIQUE NOT NULL,
  sec_uid TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  nickname TEXT NOT NULL,
  
  -- Profile Info
  signature TEXT,
  avatar_thumb TEXT,
  avatar_medium TEXT,
  avatar_larger TEXT,
  region TEXT,
  language TEXT,
  
  -- Flags
  is_verified BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  
  -- Stats (current snapshot)
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  heart_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  
  -- Bio link
  bio_link_url TEXT,
  
  -- Metadata
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_videos_collected INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tiktok_profiles_tiktok_user_id ON tiktok_profiles(tiktok_user_id);
CREATE INDEX idx_tiktok_profiles_username ON tiktok_profiles(username);
CREATE INDEX idx_tiktok_profiles_sec_uid ON tiktok_profiles(sec_uid);
CREATE INDEX idx_tiktok_profiles_follower_count ON tiktok_profiles(follower_count DESC);
```

### Table 2: `tiktok_videos`
```sql
CREATE TABLE tiktok_videos (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  video_id TEXT UNIQUE NOT NULL,
  author_profile_id UUID REFERENCES tiktok_profiles(id),
  
  -- Content
  description TEXT,
  
  -- Video Info
  duration INTEGER, -- seconds
  height INTEGER,
  width INTEGER,
  cover_url TEXT,
  dynamic_cover_url TEXT,
  share_url TEXT,
  
  -- Timestamps
  tiktok_created_at TIMESTAMPTZ NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Engagement Stats (snapshot at collection)
  play_count BIGINT DEFAULT 0,      -- views
  digg_count INTEGER DEFAULT 0,     -- likes
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  collect_count INTEGER DEFAULT 0,  -- saves/favorites
  total_engagement BIGINT GENERATED ALWAYS AS (
    play_count + digg_count + comment_count + share_count + collect_count
  ) STORED,
  
  -- Music
  music_id TEXT,
  music_title TEXT,
  music_author TEXT,
  
  -- Location
  location_created TEXT,
  
  -- Flags
  is_ad BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  is_original BOOLEAN DEFAULT FALSE,
  
  -- Raw data
  raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (same pattern as Twitter)
CREATE INDEX idx_tiktok_videos_zone_id ON tiktok_videos(zone_id);
CREATE INDEX idx_tiktok_videos_video_id ON tiktok_videos(video_id);
CREATE INDEX idx_tiktok_videos_author_profile_id ON tiktok_videos(author_profile_id);
CREATE INDEX idx_tiktok_videos_zone_created ON tiktok_videos(zone_id, tiktok_created_at DESC);
CREATE INDEX idx_tiktok_videos_zone_engagement ON tiktok_videos(zone_id, total_engagement DESC);
CREATE INDEX idx_tiktok_videos_created_at ON tiktok_videos(tiktok_created_at DESC);
CREATE INDEX idx_tiktok_videos_total_engagement ON tiktok_videos(total_engagement DESC);
```

### Table 3: `tiktok_engagement_history`
```sql
CREATE TABLE tiktok_engagement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES tiktok_videos(id) ON DELETE CASCADE,
  
  -- Snapshot values
  play_count BIGINT DEFAULT 0,
  digg_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  collect_count INTEGER DEFAULT 0,
  total_engagement BIGINT GENERATED ALWAYS AS (
    play_count + digg_count + comment_count + share_count + collect_count
  ) STORED,
  
  -- Deltas (change since last snapshot)
  delta_play_count BIGINT DEFAULT 0,
  delta_digg_count INTEGER DEFAULT 0,
  delta_comment_count INTEGER DEFAULT 0,
  delta_share_count INTEGER DEFAULT 0,
  delta_collect_count INTEGER DEFAULT 0,
  
  -- Velocity (change per hour)
  engagement_velocity NUMERIC,
  
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tiktok_engagement_history_video_id ON tiktok_engagement_history(video_id);
CREATE INDEX idx_tiktok_engagement_history_video_snapshot ON tiktok_engagement_history(video_id, snapshot_at DESC);
CREATE INDEX idx_tiktok_engagement_history_snapshot_at ON tiktok_engagement_history(snapshot_at DESC);
```

### Table 4: `tiktok_engagement_tracking`
```sql
CREATE TABLE tiktok_engagement_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_db_id UUID NOT NULL REFERENCES tiktok_videos(id) ON DELETE CASCADE,
  
  -- Tiered tracking
  tier TEXT NOT NULL CHECK (tier IN ('ultra_hot', 'hot', 'warm', 'cold')),
  
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  next_update_at TIMESTAMPTZ,
  update_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tiktok_engagement_tracking_tier ON tiktok_engagement_tracking(tier);
CREATE INDEX idx_tiktok_engagement_tracking_next_update ON tiktok_engagement_tracking(next_update_at) 
  WHERE tier != 'cold';
```

### Table 5: `tiktok_profile_snapshots`
```sql
CREATE TABLE tiktok_profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES tiktok_profiles(id) ON DELETE CASCADE,
  
  -- Snapshot values
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  heart_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  
  -- Deltas
  delta_follower_count INTEGER DEFAULT 0,
  delta_following_count INTEGER DEFAULT 0,
  delta_heart_count BIGINT DEFAULT 0,
  delta_video_count INTEGER DEFAULT 0,
  
  -- Growth rate
  follower_growth_rate NUMERIC,
  
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tiktok_profile_snapshots_profile_id ON tiktok_profile_snapshots(profile_id);
CREATE INDEX idx_tiktok_profile_snapshots_profile_snapshot ON tiktok_profile_snapshots(profile_id, snapshot_at DESC);
```

### Table 6: `tiktok_entities`
```sql
CREATE TABLE tiktok_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES tiktok_videos(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  entity_type TEXT NOT NULL CHECK (entity_type IN ('hashtag', 'mention')),
  entity_value TEXT NOT NULL,
  entity_normalized TEXT NOT NULL, -- lowercase
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tiktok_entities_video_id ON tiktok_entities(video_id);
CREATE INDEX idx_tiktok_entities_zone_id ON tiktok_entities(zone_id);
CREATE INDEX idx_tiktok_entities_type ON tiktok_entities(entity_type);
CREATE INDEX idx_tiktok_entities_normalized ON tiktok_entities(entity_normalized);
CREATE INDEX idx_tiktok_entities_zone_type_normalized ON tiktok_entities(zone_id, entity_type, entity_normalized);
```

### Table 7: `tiktok_rules`
```sql
CREATE TABLE tiktok_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  -- Rule config
  rule_type TEXT NOT NULL CHECK (rule_type IN ('keyword', 'hashtag', 'user', 'combined')),
  rule_name TEXT NOT NULL,
  
  -- Query config
  query TEXT, -- for keyword/combined
  hashtag TEXT, -- for hashtag type
  username TEXT, -- for user type
  country TEXT, -- optional country filter
  
  -- Polling config
  interval_minutes INTEGER NOT NULL DEFAULT 30,
  
  is_active BOOLEAN DEFAULT TRUE,
  last_polled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(zone_id, rule_name)
);

CREATE INDEX idx_tiktok_rules_zone_id ON tiktok_rules(zone_id);
CREATE INDEX idx_tiktok_rules_is_active ON tiktok_rules(is_active);
CREATE INDEX idx_tiktok_rules_last_polled ON tiktok_rules(last_polled_at) WHERE is_active = TRUE;
```

### Table 8: `tiktok_profile_zone_tags`
```sql
CREATE TABLE tiktok_profile_zone_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES tiktok_profiles(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  tag_type TEXT NOT NULL CHECK (tag_type IN (
    'attila', 'adversary', 'surveillance', 'target', 'ally', 'asset', 'local_team'
  )),
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id, zone_id, tag_type)
);

CREATE INDEX idx_tiktok_profile_zone_tags_profile_id ON tiktok_profile_zone_tags(profile_id);
CREATE INDEX idx_tiktok_profile_zone_tags_zone_id ON tiktok_profile_zone_tags(zone_id);
CREATE INDEX idx_tiktok_profile_zone_tags_zone_type ON tiktok_profile_zone_tags(zone_id, tag_type);
```

---

## 📊 COMPARISON: Twitter vs TikTok

| Feature | Twitter | TikTok |
|---------|---------|--------|
| **Profiles** | ✅ | ✅ |
| **Posts/Videos** | ✅ Tweets | ✅ Videos |
| **Engagement Metrics** | 4 (RT/Reply/Like/Quote) | 5 (View/Like/Comment/Share/Save) |
| **Engagement Tracking** | ✅ Tiered | ✅ Same system |
| **Profile Tracking** | ✅ Snapshots | ✅ Same |
| **Entities** | ✅ Hashtags/Mentions/URLs | ✅ Hashtags/Mentions only |
| **Tags (Share of Voice)** | ✅ 7 types | ✅ Same 7 types |
| **Webhooks** | ✅ Real-time | ❌ Polling only |
| **Comments** | ✅ (as tweets) | ✅ Separate |
| **Threads** | ✅ Conversation trees | ❌ N/A |

---

## ✅ CONCLUSION

**YES, we can do everything like Twitter except:**
1. ❌ No webhooks (polling instead)
2. ❌ No thread mapping (no conversation trees)
3. ❌ No URL entities (videos don't have URLs in caption usually)

**But we CAN:**
1. ✅ Track engagement evolution (5 metrics!)
2. ✅ Profile snapshots & growth
3. ✅ Tag profiles (Attila, Ally, etc.)
4. ✅ Hashtag & mention extraction
5. ✅ Tiered tracking strategy
6. ✅ Same UI/UX as Twitter

**Total Tables: 8** (same as Twitter: 8 tables!)

