# TikTok Integration - Complete Documentation

**Status**: Production Ready  
**Last Updated**: 2025-11-20  
**Version**: 1.0

---

## Overview

Complete TikTok monitoring integration for Gorgone V2. Enables government-grade surveillance of TikTok videos, profiles, hashtags, and viral trends with real-time engagement tracking.

**Key Difference from Twitter**: Polling-based (no webhooks) instead of push-based.

---

## Architecture

### Data Flow

```
Create Rule → Auto-trigger polling → Collect videos → Normalize profiles → Track engagement
     ↓              ↓                      ↓                 ↓                   ↓
  Settings    QStash Cron 1h/3h/6h    Deduplicator    tiktok_profiles    Tiered updates
```

### Database Schema (8 Tables)

1. **`tiktok_profiles`** - Normalized user profiles (no duplication)
2. **`tiktok_rules`** - Monitoring rules configuration
3. **`tiktok_videos`** - Collected videos with engagement metrics
4. **`tiktok_entities`** - Extracted hashtags and mentions
5. **`tiktok_profile_zone_tags`** - Profile categorization (7 labels)
6. **`tiktok_engagement_history`** - Time-series engagement snapshots
7. **`tiktok_engagement_tracking`** - Tiered update scheduling
8. **`tiktok_profile_snapshots`** - Profile stats evolution

---

## Features

### 1. Settings & Configuration

**Location**: `/dashboard/zones/[zoneId]/settings` → TikTok tab

**Data Source Tab**:
- Create/Edit/Delete monitoring rules
- 4 rule types: Keywords, Hashtag, User Profile, Combined
- Polling intervals: 1h, 3h, or 6h
- Country filter (optional)
- Auto-trigger polling on rule creation
- Manual "Collect Now" button
- Active rules count display

**Tracked Profiles Tab**:
- 7 label types (same as Twitter):
  - Attila (high-priority)
  - Adversary (opposition)
  - Surveillance (monitoring)
  - Target (strategic interest)
  - Ally (supportive)
  - Asset (resources)
  - Local Team (internal)
- Add/remove profiles manually
- Bulk upload support
- Share of Voice analysis ready

### 2. Feed Display

**Location**: `/dashboard/zones/[zoneId]/feed?source=tiktok`

**Video Cards**:
- Grid layout: Content (left) | Chart (right)
- Author info with verified badge (TikTok blue)
- Video thumbnail with play button overlay
- Description with hashtag extraction
- Music info (like quoted tweet style)
- Profile tags display
- External link to TikTok

**Engagement Charts**:
- 2 tabs: Engagement (4 metrics) | Reach (views)
- Initial point (collection baseline)
- Snapshots (updates over time)
- Predictions (3h forecast in dashed line)
- Colored stats grid below chart
- Manual refresh button
- Tracking status badge (Active/Paused)

**Filters**:
- Search with autocomplete (users + hashtags)
- Sort by: Recent, Most Views, Most Likes, Most Engagement
- Advanced filters:
  - Date range (1h to 30d)
  - Profile labels
  - Min views/likes/comments
  - Verified only
  - Active tracking only

**Performance**:
- Infinite scroll (Intersection Observer)
- Limit 20 per page
- Smooth skeleton transitions
- No full page reloads

### 3. Engagement Tracking

**5 Metrics** (vs 4 for Twitter):
1. Views (`play_count`)
2. Likes (`digg_count`)
3. Comments (`comment_count`)
4. Shares (`share_count`)
5. Saves (`collect_count`) ⭐ Bonus metric

**Tiered Strategy**:
```
ultra_hot (0-1h)    → Update every 10 min
hot (1-4h)          → Update every 30 min
warm (4-12h)        → Update every 1h
cold (12h+)         → Stop tracking
```

**Predictions**:
- Velocity-based linear extrapolation
- 3-hour forecast (+1h, +2h, +3h)
- Confidence score (max 90% at 6 snapshots)
- Auto-calculated on updates

---

## API Endpoints

### Production Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/tiktok/rules` | Create monitoring rule |
| `GET` | `/api/tiktok/rules?zone_id=xxx` | List rules |
| `PATCH` | `/api/tiktok/rules/[id]` | Update rule |
| `DELETE` | `/api/tiktok/rules/[id]` | Delete rule |
| `POST` | `/api/tiktok/rules/[id]/toggle` | Toggle active status |
| `GET/POST/DELETE` | `/api/tiktok/profiles/tags` | Manage profile tags |
| `GET` | `/api/tiktok/feed?zone_id=xxx&...` | Get videos with filters |
| `GET` | `/api/tiktok/engagement/[videoId]` | Get engagement history |
| `POST` | `/api/tiktok/engagement/snapshot` | Create manual snapshot |
| `POST` | `/api/tiktok/polling` | QStash cron - poll for videos |
| `POST` | `/api/tiktok/engagement/update` | QStash cron - batch updates |
| `GET` | `/api/tiktok/autocomplete?q=xxx` | Search autocomplete |

### Development/Test Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/tiktok/test-polling` | Manual polling trigger |
| `/api/tiktok/test-batch-update` | Manual batch update |

---

## Workers & Automation

### 1. Polling Worker

**Endpoint**: `/api/tiktok/polling`  
**Trigger**: QStash cron (based on `next_poll_at`)  
**Function**: Collect new videos matching active rules

**Process**:
1. Get rules due for polling
2. For each rule:
   - Fetch videos from TikAPI based on type
   - Process through deduplicator
   - Normalize profiles
   - Extract entities
   - Start engagement tracking
3. Update rule stats

### 2. Engagement Update Worker

**Endpoint**: `/api/tiktok/engagement/update`  
**Trigger**: QStash cron (every 10-30 min)  
**Function**: Batch update engagement stats

**Process**:
1. Get videos due for update (limit 20)
2. For each video:
   - Fetch latest stats from TikAPI
   - Calculate deltas
   - Create engagement snapshot
   - Update tracking tier
   - Calculate predictions
3. Smart stopping (cold tier)

### 3. Deduplicator

**Module**: `lib/workers/tiktok/deduplicator.ts`  
**Function**: Normalize and deduplicate incoming videos

**Process**:
- Check if video exists (by `video_id`)
- Process author profile (upsert)
- Save video with engagement snapshot
- Extract entities (hashtags, mentions)
- Initialize tracking record

---

## Data Layer Modules

**Location**: `lib/data/tiktok/`

| Module | Purpose |
|--------|---------|
| `rules.ts` | CRUD for monitoring rules |
| `rules-admin.ts` | Admin functions (bypass RLS for workers) |
| `profiles.ts` | Profile tagging and management |
| `videos.ts` | Video CRUD and queries |
| `engagement.ts` | Engagement tracking and snapshots |
| `entities.ts` | Hashtag/mention extraction |
| `predictions.ts` | Velocity-based predictions |

---

## Performance

### Benchmarks

| Operation | Target | Method |
|-----------|--------|--------|
| Feed query | < 100ms | Index scan on `(zone_id, tiktok_created_at DESC)` |
| Search (keyword) | < 200ms | ILIKE on description |
| Search (user) | < 50ms | Index on username |
| Engagement history | < 100ms | Index on `(video_id, snapshot_at DESC)` |
| Autocomplete | < 200ms | Batch queries with caching |

### Indexes (20+)

**Videos**:
- `idx_tiktok_videos_zone_created` - Feed queries
- `idx_tiktok_videos_zone_engagement` - Top videos
- `idx_tiktok_videos_author_profile_id` - Profile videos

**Entities**:
- `idx_tiktok_entities_zone_type_normalized` - Trending hashtags

**Tracking**:
- `idx_tiktok_engagement_tracking_next_update` - Due for update queries

---

## UI Components

**Location**: `components/dashboard/zones/tiktok/`

| Component | Purpose |
|-----------|---------|
| `tiktok-settings-tab.tsx` | Settings container |
| `tiktok-data-source-tab.tsx` | Rules management |
| `tiktok-rule-dialog.tsx` | Create/edit rule dialog |
| `tiktok-rules-list.tsx` | Active rules display |
| `tiktok-tracked-profiles-tab.tsx` | Profile tagging (7 labels) |
| `tiktok-feed-content.tsx` | Feed container with infinite scroll |
| `tiktok-feed-filters.tsx` | Search + advanced filters |
| `tiktok-video-card.tsx` | Video display card |
| `tiktok-engagement-chart.tsx` | Engagement evolution chart |
| `tiktok-*-skeleton.tsx` | Loading states |

---

## Design System Compliance

✅ **Variables CSS uniquement** (no hardcoded colors)  
✅ **Typography system** (`.text-body`, `.text-caption`, etc.)  
✅ **Spacing harmonisé** (`.card-padding`, Tailwind scale)  
✅ **Transitions** (`duration-[150ms]`, `duration-[250ms]`)  
✅ **Dark mode** support (automatic via CSS vars)  
✅ **Mobile responsive** (grid → stack, hidden sm, etc.)  
✅ **Accessible** (ARIA labels, keyboard navigation)  
✅ **English text** (100%)

---

## QStash Configuration (Production)

### Polling Cron

**Schedule**: Every hour (checks `next_poll_at`)

```typescript
// In Vercel/production
await qstash.publishJSON({
  url: `${APP_URL}/api/tiktok/polling`,
  method: "POST",
  body: {},
  schedule: "*/60 * * * *", // Every hour
});
```

### Engagement Update Cron

**Schedule**: Every 30 minutes

```typescript
await qstash.publishJSON({
  url: `${APP_URL}/api/tiktok/engagement/update`,
  method: "POST",
  body: {},
  schedule: "*/30 * * * *", // Every 30 min
});
```

---

## Environment Variables

```bash
# TikTok API (tikapi.io)
TIKTOK_API_KEY=your_api_key_here
```

---

## Comparison: Twitter vs TikTok

| Feature | Twitter | TikTok |
|---------|---------|--------|
| **Data Collection** | Webhooks (PUSH) | Polling (PULL) |
| **Real-time** | ✅ Instant | ⚠️ Every 1-6h |
| **Engagement Metrics** | 4 | 5 (+Saves) |
| **Engagement Tracking** | ✅ Tiered | ✅ Same |
| **Predictions** | ✅ Velocity | ✅ Same |
| **Profile Tags** | ✅ 7 types | ✅ Same |
| **Autocomplete** | ✅ | ✅ |
| **Infinite Scroll** | ✅ | ✅ |
| **Design** | ✅ | ✅ Identical |

---

## Known Limitations

1. **No Webhooks**: TikAPI doesn't support real-time webhooks
   - **Solution**: Polling with configurable intervals (1h, 3h, 6h)

2. **No Advanced Query Operators**: Unlike Twitter's `from:`, `to:`, etc.
   - **Solution**: Client-side filtering after collection

3. **No Thread Mapping**: Videos don't have conversation trees
   - **N/A**: Not applicable for video content

4. **API Rate Limits**: TikAPI has bandwidth limits
   - **Solution**: Batch requests, smart caching, tiered tracking

---

## Production Deployment Checklist

- [x] All TypeScript errors fixed
- [x] No linter errors
- [x] Database migrations applied
- [x] RLS policies tested
- [x] Environment variables configured
- [x] Workers QStash-ready
- [x] Mobile responsive verified
- [x] Design system compliant
- [x] Test files cleaned up
- [x] Documentation complete

**Status**: ✅ Ready for production deployment

---

## Statistics

- **Total Tables**: 8
- **Total Indexes**: 20+
- **Total Code Lines**: ~7,000
- **API Routes**: 13 (10 prod + 3 test)
- **UI Components**: 14
- **Data Layer Modules**: 7
- **Workers**: 2 (polling + engagement)

---

**Last Reviewed**: 2025-11-20  
**Deployed**: Ready  
**Tested**: ✅ Formula 1 + Patrick Muyaya zones

