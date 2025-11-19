# Media Integration Analysis - Event Registry API

**Date**: 2025-11-19  
**Status**: Pending Validation  
**API Key**: e24c638f-5455-4a33-b2db-14822dab498b

---

## 🎯 Executive Summary

We need to choose between two approaches for media monitoring integration:
1. **Polling approach** with `getArticles` (tested ✅)
2. **Stream approach** with real-time webhooks (if available ❓)

---

## 📊 API Capabilities (Tested)

### ✅ What Works - `getArticles` Endpoint

Based on our successful test (`scripts/test-event-registry-api.ts`):

```typescript
// Test results:
✅ Article search by keyword - 95,299 results
✅ Article search by source - 28,320 results  
✅ Complex query (keyword + date + lang) - 17,381 results
❌ Source info endpoint - API error
❌ Source search endpoint - No results
```

### 📦 Data Structure Received

From our test, each article contains:

```json
{
  "uri": "8963311042",              // ✅ Unique identifier
  "lang": "eng",                    // ✅ Language
  "isDuplicate": false,             // ✅ Deduplication flag
  "date": "2025-11-19",            // ✅ Publication date
  "time": "14:10:44",              // ✅ Publication time
  "dateTime": "2025-11-19T14:10:44Z", // ✅ ISO timestamp
  "url": "https://...",            // ✅ Article URL
  "title": "...",                  // ✅ Article title
  "body": "...",                   // ✅ Full content
  "source": {
    "uri": "finanznachrichten.de", // ✅ Source identifier
    "title": "FinanzNachrichten.de" // ✅ Source name
  },
  "authors": [],                   // ✅ Author list
  "image": "https://...",          // ✅ Main image
  "eventUri": null,                // ✅ Related event
  "sentiment": 0.7176,             // ✅ Sentiment score (-1 to 1)
  "wgt": 501257444,                // ✅ Weight/importance
  "relevance": 9,                  // ✅ Relevance score (0-100)
  "categories": [...],             // 🔍 Need to test
  "concepts": [...],               // 🔍 Need to test
  "shares": {                      // 🔍 Need to test
    "facebook": 0,
    "twitter": 0
  }
}
```

**Key Observations**:
- ✅ Rich data structure with sentiment analysis
- ✅ Deduplication handled by Event Registry
- ✅ Source normalization included
- ✅ Full article content available
- ⚠️ Some fields may be null/missing depending on the article

---

## 🔄 Approach Comparison

### Option A: Polling with `getArticles` (Like current Twitter approach)

**How it works:**
1. User creates monitoring rules in Settings (keyword, source, date range, etc.)
2. QStash cron job fetches articles every X minutes/hours
3. Articles are deduplicated and stored in Supabase
4. Feed displays articles in real-time from database

**Pros:**
- ✅ **Tested and working** - we know the API responds correctly
- ✅ **Similar to Twitter integration** - proven pattern in Gorgone
- ✅ **Simple to implement** - no webhook complexity
- ✅ **Reliable** - we control the polling frequency
- ✅ **No missed articles** - we can query historical data anytime
- ✅ **Better for government use** - more control, auditable

**Cons:**
- ⚠️ Not truly "real-time" (delay = polling interval)
- ⚠️ API quota usage depends on polling frequency
- ⚠️ Need to manage polling scheduling with QStash

**Recommended Polling Frequency:**
- **High priority rules**: Every 15-30 minutes
- **Normal rules**: Every 1-2 hours
- **Low priority rules**: Every 6-12 hours

---

### Option B: Stream/Webhook Approach (If Event Registry supports it)

**How it works:**
1. Subscribe to Event Registry stream/webhook
2. Receive articles pushed in real-time
3. Store directly in database
4. Display in feed

**Pros:**
- ✅ True real-time updates
- ✅ Lower API quota usage (push vs pull)
- ✅ No polling overhead

**Cons:**
- ❌ **Unknown if Event Registry supports webhooks** - need to verify
- ❌ More complex infrastructure (webhook endpoint, queue management)
- ❌ Need to handle webhook failures, retries
- ❌ Less control over data flow
- ❌ Harder to test and debug

**Status:** 🔍 Need to verify if Event Registry has webhook/stream capability

---

## 🎯 Recommended Approach

### **OPTION A: Polling with `getArticles`**

**Rationale:**
1. **Proven to work** - our tests confirm API functionality
2. **Aligned with Twitter pattern** - consistency across Gorgone
3. **Government-grade reliability** - full control and auditability
4. **Simpler maintenance** - fewer moving parts
5. **Better error handling** - retry logic is straightforward

### Architecture:

```
┌─────────────────┐
│  Settings Page  │ → User creates rules
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  media_rules    │ → Stores query config
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  QStash Cron    │ → Runs every 30min-2h
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Event Registry  │ → Fetch articles
│  getArticles    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Deduplicator  │ → Check article_uri
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ media_articles  │ → Store in database
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Feed Page     │ → Display to users
└─────────────────┘
```

---

## 📋 Rule Creation - What Data to Collect?

Based on Event Registry API parameters, here's what users should configure:

### **Rule Configuration Fields:**

#### 1. **Basic Info** (Required)
```typescript
{
  name: string           // Rule name (e.g., "Climate News Monitoring")
  description?: string   // Optional description
}
```

#### 2. **Query Type** (Choose one)
```typescript
queryType: 'keyword' | 'source' | 'advanced'
```

#### 3. **Query Parameters** (Based on type)

**Keyword Query:**
```typescript
{
  keyword: string        // e.g., "artificial intelligence"
  lang?: string[]        // e.g., ["eng", "fra"]
  dateStart?: Date       // From date
  dateEnd?: Date         // To date (for historical)
}
```

**Source Query:**
```typescript
{
  sourceUri: string      // e.g., "bbc.com"
  lang?: string[]        // Optional language filter
}
```

**Advanced Query:**
```typescript
{
  keyword?: string       // Combine multiple filters
  sourceUri?: string
  categoryUri?: string   // Event Registry category
  conceptUri?: string    // Event Registry concept
  lang?: string[]
  dateStart?: Date
  dateEnd?: Date
  sortBy?: 'date' | 'socialScore' | 'relevance'
}
```

#### 4. **Fetch Configuration**
```typescript
{
  fetchIntervalHours: number     // How often to poll (1-24h)
  maxArticlesPerFetch: number    // Max articles per request (1-100)
  isActive: boolean              // Enable/disable rule
}
```

#### 5. **Filters** (Optional post-processing)
```typescript
{
  languageFilter?: string[]      // Filter by language
  countryFilter?: string[]       // Filter by source country
  sentimentFilter?: 'positive' | 'negative' | 'neutral' | 'all'
  minSentiment?: number         // e.g., 0.5 for positive only
  maxSentiment?: number         // e.g., -0.5 for negative only
}
```

---

## 📊 Data to Store in Database

### **media_articles** table

**Essential fields:**
```typescript
{
  // Identity
  id: UUID                    // Internal ID
  article_uri: string         // Event Registry unique ID
  zone_id: UUID              // Parent zone
  
  // Content
  title: string
  body: string               // Full text
  url: string                // Original article URL
  lang: string               // Language code
  
  // Publishing
  published_at: timestamp    // From Event Registry
  collected_at: timestamp    // When we fetched it
  
  // Source (normalized)
  source_uri: string         // e.g., "bbc.com"
  source_title: string       // e.g., "BBC News"
  source_country?: string    // If available
  
  // Authors
  authors: jsonb             // Array of {name, uri}
  
  // Media
  image_url?: string
  video_url?: string         // If available
  
  // Analysis
  sentiment?: number         // -1 to 1
  relevance?: number         // 0-100
  
  // Categorization
  categories: jsonb          // Array of categories
  concepts: jsonb            // Array of concepts
  
  // Social metrics
  shares_facebook: number
  shares_twitter: number
  shares_total: computed     // Sum of above
  
  // Flags
  is_duplicate: boolean
  is_processed: boolean
  
  // Raw data
  raw_data: jsonb           // Full API response
}
```

### **media_rules** table

```typescript
{
  id: UUID
  zone_id: UUID
  name: string
  description?: string
  
  query_type: 'keyword' | 'source' | 'advanced'
  query_config: jsonb        // Flexible config based on type
  
  fetch_interval_hours: number
  max_articles_per_fetch: number
  
  language_filter?: string[]
  country_filter?: string[]
  sentiment_filter?: string
  
  is_active: boolean
  last_fetched_at?: timestamp
  last_fetch_status?: string
  articles_collected: number
  
  created_at: timestamp
  created_by: UUID
}
```

---

## 🎨 UI Components Needed

### **Settings Page - Media Tab**

**Similar to Twitter Settings:**
1. **Rules List** - Display active monitoring rules
2. **Create Rule Dialog** - Form to create new rule
3. **Rule Configuration**:
   - Simple mode: Keyword + language
   - Advanced mode: Full query builder
4. **Rule Status** - Active/inactive toggle
5. **Statistics** - Articles collected, last fetch time

**Components to create:**
```
components/dashboard/zones/media/
├── media-settings-tab.tsx          # Main container
├── media-rules-list.tsx            # List of rules
├── media-rule-dialog.tsx           # Create/edit rule
├── media-rule-form-simple.tsx      # Simple keyword form
├── media-rule-form-advanced.tsx    # Advanced query builder
└── media-rule-stats.tsx            # Rule statistics
```

### **Feed Page - Media Tab**

**Similar to Twitter Feed:**
1. **Search & Filters** - Search articles, filter by date/source/sentiment
2. **Article Cards** - Display article title, source, excerpt, sentiment
3. **Article Detail** - Click to see full article
4. **Source Tags** - Tag sources (Ally, Adversary, etc.)

**Components to create:**
```
components/dashboard/zones/media/
├── media-feed-content.tsx          # Main feed container
├── media-feed-filters.tsx          # Search and filters
├── media-article-card.tsx          # Individual article card
├── media-article-detail.tsx        # Full article view
├── media-source-tags.tsx           # Source tagging
└── media-feed-skeleton.tsx         # Loading state
```

---

## 🚀 Implementation Order

### Phase 1: Backend (2-3 hours)
1. ✅ Database schema (already created)
2. ✅ Apply migration to Supabase
3. Create API client (`lib/api/media/client.ts`)
4. Create data layer (`lib/data/media/*.ts`)
5. Create API routes (`app/api/media/*.ts`)

### Phase 2: Settings UI (2-3 hours)
1. Create Media Settings Tab
2. Create Rule List component
3. Create Rule Dialog (simple mode first)
4. Test rule creation and activation

### Phase 3: Feed UI (2-3 hours)
1. Create Media Feed Tab
2. Create Article Cards
3. Create Filters
4. Test article display

### Phase 4: Worker & Polish (1-2 hours)
1. Create QStash worker for article fetching
2. Test end-to-end flow
3. Add source tagging feature
4. Performance optimization

**Total Estimated Time: 8-10 hours**

---

## ❓ Questions to Validate

1. **API Approach**: ✅ Use polling with `getArticles` (recommended)
2. **Polling frequency**: 30min - 2 hours depending on priority?
3. **Article deduplication**: ✅ Use `article_uri` (unique per article)
4. **Source tagging**: ✅ Same 7 tags as Twitter (Ally, Adversary, etc.)
5. **Sentiment display**: Show as badge (positive/negative/neutral)?
6. **Article limit per rule**: Max 100 per fetch (API limit)?

---

## 🎯 Next Steps (Waiting for Validation)

Once approach is validated:
1. ✅ Apply database migration
2. Create Event Registry API client
3. Create data layer functions
4. Create Settings UI components
5. Create Feed UI components
6. Create API routes
7. Create QStash worker
8. Test end-to-end

---

**Ready to proceed? Please validate:**
- ✅ Polling approach with `getArticles`?
- ✅ Rule configuration fields?
- ✅ Data structure for storage?
- ✅ UI component structure?

