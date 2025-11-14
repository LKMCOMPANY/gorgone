# TwitterAPI.io - Real API Response Structure

**Date**: November 13, 2025  
**Status**: Validated with real API calls  
**Source**: Test script execution against live API

---

## Search API Response Format

### Top-Level Structure

```typescript
interface SearchResponse {
  tweets: Tweet[];           // Array of tweet objects
  has_next_page: boolean;    // Pagination flag
  next_cursor: string;       // Cursor for next page (if has_next_page is true)
}
```

### Tweet Object (Complete Structure)

```typescript
interface Tweet {
  // Basic Info
  type: 'tweet';
  id: string;                              // Twitter's unique tweet ID
  url: string;                             // x.com URL
  twitterUrl: string;                      // twitter.com URL
  text: string;                            // Tweet content
  source: string;                          // App used (e.g., "Twitter for iPhone")
  
  // Timestamps
  createdAt: string;                       // Format: "Thu Nov 13 23:04:47 +0000 2025"
  
  // Engagement Metrics
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  bookmarkCount: number;
  
  // Language & Display
  lang: string;                            // Language code (e.g., 'fr', 'en')
  displayTextRange: [number, number];     // Text display range
  
  // Conversation Context
  isReply: boolean;
  inReplyToId?: string;                    // Tweet ID this is replying to
  conversationId: string;                  // Thread/conversation ID
  inReplyToUserId?: string;                // User ID being replied to
  inReplyToUsername?: string;              // Username being replied to
  
  // Author Info (Full User Object)
  author: TwitterUser;
  
  // Entities (Mentions, Hashtags, URLs, etc.)
  entities: {
    user_mentions?: Array<{
      id_str: string;
      indices: [number, number];           // Position in text
      name: string;
      screen_name: string;
    }>;
    hashtags?: Array<{
      indices: [number, number];
      text: string;
    }>;
    urls?: Array<{
      display_url: string;
      expanded_url: string;
      url: string;
      indices: [number, number];
    }>;
    symbols?: Array<{
      indices: [number, number];
      text: string;                        // e.g., "$AAPL"
    }>;
  };
  
  // Media & Cards
  extendedEntities?: {
    media?: Array<{
      type: 'photo' | 'video' | 'animated_gif';
      id_str: string;
      indices: [number, number];
      media_url_https: string;
      url: string;
      display_url: string;
      expanded_url: string;
      sizes?: {
        large: { w: number; h: number; resize: string };
        medium: { w: number; h: number; resize: string };
        small: { w: number; h: number; resize: string };
        thumb: { w: number; h: number; resize: string };
      };
      video_info?: {
        aspect_ratio: [number, number];
        duration_millis?: number;
        variants: Array<{
          bitrate?: number;
          content_type: string;
          url: string;
        }>;
      };
    }>;
  };
  
  card?: {
    name: string;
    url: string;
    title?: string;
    description?: string;
    thumbnail_url?: string;
    // ... more card fields
  } | null;
  
  // Geolocation
  place?: {
    id?: string;
    place_type?: string;
    name?: string;
    full_name?: string;
    country_code?: string;
    country?: string;
    bounding_box?: {
      coordinates: number[][][];
      type: string;
    };
  };
}
```

### Twitter User Object (Author)

```typescript
interface TwitterUser {
  // Basic Info
  type: 'user';
  id: string;                              // User ID
  userName: string;                        // Handle (without @)
  name: string;                            // Display name
  url: string;                             // x.com profile URL
  twitterUrl: string;                      // twitter.com profile URL
  
  // Verification
  isVerified: boolean;                     // Legacy verified (blue checkmark)
  isBlueVerified: boolean;                 // Twitter Blue subscriber
  verifiedType: string | null;             // Verification type
  
  // Profile Media
  profilePicture: string;                  // Profile image URL
  coverPicture?: string;                   // Banner image URL
  
  // Bio & Location
  description: string;                     // Bio text
  location: string;                        // User-defined location
  
  // Stats
  followers: number;                       // Follower count
  following: number;                       // Following count
  favouritesCount: number;                 // Total likes given
  statusesCount: number;                   // Total tweets
  mediaCount: number;                      // Total media posted
  
  // Account Info
  createdAt: string;                       // Account creation date
  status: string;                          // Status message
  
  // Features
  canDm: boolean;                          // Can receive DMs
  canMediaTag: boolean;                    // Can be tagged in media
  hasCustomTimelines: boolean;             // Has custom timeline lists
  isTranslator: boolean;                   // Is a translator account
  isAutomated: boolean;                    // Is a bot/automated account
  automatedBy: string | null;              // If automated, by whom
  
  // Privacy & Restrictions
  withheldInCountries: string[];           // Countries where profile is withheld
  possiblySensitive: boolean;              // Content warning flag
  
  // Additional
  pinnedTweetIds: string[];                // Pinned tweets
  fastFollowersCount: number;              // Fast followers count
  affiliatesHighlightedLabel: object;      // Affiliate labels
  
  // Entities (Bio links, etc.)
  entities: {
    description: {
      urls: Array<{
        display_url: string;
        expanded_url: string;
        url: string;
        indices: [number, number];
      }>;
    };
    url?: {
      urls?: Array<{
        display_url: string;
        expanded_url: string;
        url: string;
      }>;
    };
  };
  
  profile_bio?: {
    description: string;
    entities: {
      description: object;
    };
  };
}
```

---

## Key Differences from Expected Structure

### ✅ What We Got (Better than expected!)

1. **Richer Author Data**
   - Full user profile embedded in each tweet
   - Verification status (legacy + Twitter Blue)
   - Profile pictures, banners, bios
   - Detailed stats (followers, tweets, media count)

2. **Better Engagement Metrics**
   - View count (viewCount) - NEW!
   - Bookmark count (bookmarkCount) - NEW!
   - All standard metrics (retweets, likes, replies, quotes)

3. **Detailed Entities**
   - Mentions with positions (indices)
   - Hashtags with positions
   - URLs with expanded versions
   - Symbols (cashtags like $AAPL)

4. **Conversation Context**
   - Reply chain information
   - Conversation ID for threading
   - In-reply-to user details

5. **Media & Cards**
   - Full media objects with sizes
   - Video info with variants
   - Twitter cards (link previews)

### ⚠️ Adjustments Needed

1. **Date Format**
   - Expected: ISO 8601 (`2024-11-13T23:04:47Z`)
   - Actual: Twitter format (`Thu Nov 13 23:04:47 +0000 2025`)
   - **Action**: Need date parser utility

2. **Field Naming**
   - Expected: `tweet_id`, `author_id`, `created_at`
   - Actual: `id`, `author.id`, `createdAt`
   - **Action**: Map to our database schema

3. **Nested Author**
   - Expected: Separate `author_id` + optional `includes.users`
   - Actual: Full `author` object embedded
   - **Action**: Extract and denormalize for DB storage

---

## Database Schema Updates Needed

### twitter_tweets Table Adjustments

**Add these fields**:
```sql
-- Additional metrics
view_count INTEGER DEFAULT 0,
bookmark_count INTEGER DEFAULT 0,

-- Conversation context
is_reply BOOLEAN DEFAULT false,
in_reply_to_tweet_id TEXT,
in_reply_to_user_id TEXT,
in_reply_to_username TEXT,
conversation_id TEXT,

-- Source & language
source TEXT,  -- e.g., "Twitter for iPhone"
lang TEXT,    -- e.g., "fr", "en"

-- URLs
tweet_url TEXT,  -- x.com URL
twitter_url TEXT,  -- twitter.com URL

-- Author profile snapshot (at collection time)
author_profile_picture TEXT,
author_cover_picture TEXT,
author_description TEXT,
author_is_blue_verified BOOLEAN DEFAULT false,
```

**Update indexes**:
```sql
CREATE INDEX idx_twitter_tweets_conversation_id ON twitter_tweets(conversation_id);
CREATE INDEX idx_twitter_tweets_in_reply_to ON twitter_tweets(in_reply_to_tweet_id);
```

---

## Data Mapping Strategy

### Step 1: Parse Tweet from API Response

```typescript
function parseTwitterAPITweet(apiTweet: any): ParsedTweet {
  return {
    // IDs
    tweet_id: apiTweet.id,
    author_id: apiTweet.author.id,
    conversation_id: apiTweet.conversationId,
    
    // Content
    text: apiTweet.text,
    lang: apiTweet.lang,
    source: apiTweet.source,
    
    // Timestamps (convert Twitter format to ISO 8601)
    twitter_created_at: parseTwitterDate(apiTweet.createdAt),
    
    // Metrics
    retweet_count: apiTweet.retweetCount,
    reply_count: apiTweet.replyCount,
    like_count: apiTweet.likeCount,
    quote_count: apiTweet.quoteCount,
    view_count: apiTweet.viewCount,
    bookmark_count: apiTweet.bookmarkCount,
    
    // Author info (denormalized)
    author_username: apiTweet.author.userName,
    author_name: apiTweet.author.name,
    author_verified: apiTweet.author.isVerified,
    author_blue_verified: apiTweet.author.isBlueVerified,
    author_followers_count: apiTweet.author.followers,
    author_profile_picture: apiTweet.author.profilePicture,
    author_cover_picture: apiTweet.author.coverPicture,
    author_description: apiTweet.author.description,
    
    // Flags
    has_media: !!apiTweet.extendedEntities?.media,
    has_links: !!apiTweet.entities?.urls?.length,
    has_hashtags: !!apiTweet.entities?.hashtags?.length,
    
    // Conversation
    is_reply: apiTweet.isReply,
    in_reply_to_tweet_id: apiTweet.inReplyToId,
    in_reply_to_user_id: apiTweet.inReplyToUserId,
    in_reply_to_username: apiTweet.inReplyToUsername,
    
    // URLs
    tweet_url: apiTweet.url,
    twitter_url: apiTweet.twitterUrl,
    
    // Full raw data for future reference
    raw_data: apiTweet,
  };
}
```

### Step 2: Date Parser

```typescript
/**
 * Parse Twitter date format to ISO 8601
 * Input: "Thu Nov 13 23:04:47 +0000 2025"
 * Output: "2025-11-13T23:04:47.000Z"
 */
function parseTwitterDate(twitterDate: string): Date {
  return new Date(twitterDate);
}
```

### Step 3: Extract Entities

```typescript
function extractEntities(tweet: any, tweetDbId: string, zoneId: string) {
  const entities = [];
  
  // Hashtags
  if (tweet.entities?.hashtags) {
    for (const hashtag of tweet.entities.hashtags) {
      entities.push({
        tweet_id: tweetDbId,
        zone_id: zoneId,
        entity_type: 'hashtag',
        entity_value: hashtag.text,
        entity_normalized: hashtag.text.toLowerCase(),
      });
    }
  }
  
  // Mentions
  if (tweet.entities?.user_mentions) {
    for (const mention of tweet.entities.user_mentions) {
      entities.push({
        tweet_id: tweetDbId,
        zone_id: zoneId,
        entity_type: 'mention',
        entity_value: mention.screen_name,
        entity_normalized: mention.screen_name.toLowerCase(),
      });
    }
  }
  
  // URLs
  if (tweet.entities?.urls) {
    for (const url of tweet.entities.urls) {
      entities.push({
        tweet_id: tweetDbId,
        zone_id: zoneId,
        entity_type: 'url',
        entity_value: url.expanded_url,
        entity_normalized: url.expanded_url.toLowerCase(),
      });
    }
  }
  
  return entities;
}
```

---

## Webhook Configuration

### Important Discovery

The webhook endpoint `/v1/webhook/get_rules` returned **404 Not Found**.

**Possible reasons**:
1. No rules configured yet (empty state = 404)
2. Different API endpoint path
3. Need to check twitterapi.io dashboard documentation

**Action**: 
- Test webhook creation via twitterapi.io dashboard first
- Verify the correct API endpoints for webhook management
- Update integration based on actual webhook API behavior

---

## Next Steps

1. ✅ **Update Database Schema**
   - Add new fields discovered
   - Add conversation indexes
   - Update RLS policies

2. ✅ **Update TypeScript Types**
   - Create `TwitterAPITweet` interface (matches API)
   - Create `ParsedTweet` interface (our DB format)
   - Add mapping functions

3. ✅ **Create Data Transformation Layer**
   - Tweet parser/mapper
   - Date converter
   - Entity extractor

4. ⏳ **Test Webhook Creation**
   - Use twitterapi.io dashboard to create a test rule
   - Monitor with webhook.site
   - Validate webhook payload structure

5. ⏳ **Implement Data Layer**
   - Now that we know the real structure
   - With proper type safety
   - With transformation utilities

---

## Cost Analysis (Real Usage)

Based on actual test:
- **Search API call**: Returns ~100 tweets per call
- **Pagination**: Uses `next_cursor` for subsequent pages
- **Cost per call**: $0.00012 (no tweets) or $0.00015 per tweet

**Example**: Monitoring a moderately active account
- Check every 5 minutes = 288 checks/day
- Average 5 tweets per check = 1,440 tweets/day
- Daily cost: 1,440 × $0.00015 = $0.216/day
- **Monthly cost: ~$6.50/month**

For high-volume monitoring (10,000 tweets/hour):
- 10,000 tweets/hour × 24 hours = 240,000 tweets/day
- Daily cost: 240,000 × $0.00015 = $36/day
- **Monthly cost: ~$1,080/month**

**Optimization recommendation**: Use smart intervals based on account activity patterns.

---

**Document Status**: ✅ Complete  
**Next Update**: After webhook testing  
**Version**: 1.0

