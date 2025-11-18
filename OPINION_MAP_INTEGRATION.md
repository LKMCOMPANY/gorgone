# Opinion Map V2 - Integration Guide

**Date**: November 18, 2025  
**Status**: Ready for Implementation  
**Compliance**: Gorgone V2 Standards

---

## Integration with Existing Architecture

This guide ensures the Opinion Map feature integrates seamlessly with Gorgone V2's existing architecture, following all established patterns and conventions.

---

## Directory Structure (Following V2 Conventions)

```
/lib/data/twitter/opinion-map/
├── sampling.ts              # NEW - Stratified sampling
├── vectorization.ts         # NEW - Embedding management
├── dimensionality.ts        # NEW - PCA + UMAP
├── clustering.ts            # NEW - K-means
├── labeling.ts              # NEW - AI cluster naming
├── projections.ts           # NEW - Projection CRUD
├── clusters.ts              # NEW - Cluster CRUD
├── sessions.ts              # NEW - Session management
├── time-series.ts           # NEW - Evolution graph data
└── index.ts                 # NEW - Exports all functions

/app/api/twitter/opinion-map/
├── generate/
│   └── route.ts             # NEW - POST: Start clustering
├── status/
│   └── route.ts             # NEW - GET: Session status
└── cancel/
    └── route.ts             # NEW - POST: Cancel job

/app/api/webhooks/qstash/
└── opinion-map-worker/
    └── route.ts             # NEW - QStash worker

/components/dashboard/zones/twitter/
├── opinion-map/             # NEW FOLDER
│   ├── twitter-opinion-map-view.tsx           # Main container
│   ├── twitter-opinion-map-controls.tsx       # Config panel
│   ├── twitter-opinion-map-3d.tsx             # 3D visualization
│   ├── twitter-opinion-evolution-chart.tsx    # Time series
│   ├── twitter-opinion-cluster-list.tsx       # Clusters sidebar
│   ├── twitter-opinion-tweet-slider.tsx       # Tweet slider
│   └── twitter-opinion-map-skeleton.tsx       # Loading state
└── (existing files remain unchanged)

/types/
└── index.ts                 # EXTEND - Add opinion map types
```

**Key Principles** :
- ✅ Follow existing `/lib/data/twitter/` pattern
- ✅ Use established naming conventions (`twitter-*-*.tsx`)
- ✅ Reuse TweetCard from `twitter-feed-card.tsx`
- ✅ Follow skeleton pattern from existing components

---

## Type Definitions (Add to `/types/index.ts`)

```typescript
// ============================================================================
// OPINION MAP TYPES
// ============================================================================

/**
 * Tweet projection in 3D space after dimensionality reduction
 */
export interface TwitterTweetProjection {
  id: string
  tweet_db_id: string
  zone_id: string
  session_id: string
  x: number
  y: number
  z: number
  cluster_id: number
  cluster_confidence: number
  created_at: string
}

/**
 * Opinion cluster metadata
 */
export interface TwitterOpinionCluster {
  id: string
  zone_id: string
  session_id: string
  cluster_id: number
  label: string
  keywords: string[]
  tweet_count: number
  centroid_x: number
  centroid_y: number
  centroid_z: number
  avg_sentiment: number | null
  coherence_score: number | null
  reasoning: string | null
  created_at: string
}

/**
 * Opinion map session (clustering job)
 */
export interface TwitterOpinionSession {
  id: string
  zone_id: string
  session_id: string
  status: 'pending' | 'vectorizing' | 'reducing' | 'clustering' | 'labeling' | 'completed' | 'failed' | 'cancelled'
  progress: number
  current_phase: string | null
  phase_message: string | null
  config: {
    start_date: string
    end_date: string
    sample_size: number
    sampled_tweet_ids: string[]
    actual_sample_size: number
  }
  total_tweets: number | null
  vectorized_tweets: number
  total_clusters: number | null
  outlier_count: number | null
  execution_time_ms: number | null
  error_message: string | null
  error_stack: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  created_by: string | null
}

/**
 * Enriched projection with tweet data (for UI display)
 */
export interface EnrichedTwitterProjection extends TwitterTweetProjection {
  // Tweet data
  tweet_id: string
  text: string
  twitter_created_at: string
  author_profile_id: string
  
  // Engagement
  retweet_count: number
  reply_count: number
  like_count: number
  quote_count: number
  view_count: number
  total_engagement: number
  
  // Media
  has_media: boolean
  has_links: boolean
  has_hashtags: boolean
  
  // Author info (joined from twitter_profiles)
  author_name: string
  author_username: string
  author_verified: boolean
  author_followers_count: number
  
  // Raw data
  raw_data: Record<string, unknown>
}

/**
 * Time series data point for evolution chart
 */
export interface OpinionTimeSeriesData {
  date: string // ISO 8601 date
  [clusterId: string]: number | string // cluster_0: 123, cluster_1: 456, etc.
}
```

---

## Data Layer Modules

### 1. Sampling (`/lib/data/twitter/opinion-map/sampling.ts`)

```typescript
/**
 * Stratified sampling for opinion map
 * Ensures temporal balance across time periods
 */

import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { differenceInDays, addDays } from 'date-fns'

export interface SamplingConfig {
  zoneId: string
  startDate: Date
  endDate: Date
  targetSize: number
}

export interface SamplingResult {
  samples: Array<{ id: string; tweet_id: string }>
  totalAvailable: number
  actualSampled: number
  buckets: number
  strategy: 'stratified' | 'all'
}

/**
 * Sample tweets using stratified bucketing
 * Ensures each time bucket is represented equally
 */
export async function sampleTweetsStratified(
  config: SamplingConfig
): Promise<SamplingResult> {
  const supabase = await createServerClient()
  const { zoneId, startDate, endDate, targetSize } = config

  logger.info('[Opinion Map] Starting stratified sampling', {
    zone_id: zoneId,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    target_size: targetSize
  })

  // Count total available tweets
  const { count: totalAvailable } = await supabase
    .from('twitter_tweets')
    .select('*', { count: 'exact', head: true })
    .eq('zone_id', zoneId)
    .gte('twitter_created_at', startDate.toISOString())
    .lte('twitter_created_at', endDate.toISOString())

  if (!totalAvailable || totalAvailable === 0) {
    logger.warn('[Opinion Map] No tweets found in period', { zone_id: zoneId })
    return {
      samples: [],
      totalAvailable: 0,
      actualSampled: 0,
      buckets: 0,
      strategy: 'all'
    }
  }

  // If fewer tweets than target, return all
  if (totalAvailable <= targetSize) {
    logger.info('[Opinion Map] Returning all tweets (below target)', {
      available: totalAvailable,
      target: targetSize
    })

    const { data: allTweets } = await supabase
      .from('twitter_tweets')
      .select('id, tweet_id')
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', startDate.toISOString())
      .lte('twitter_created_at', endDate.toISOString())
      .order('twitter_created_at', { ascending: true })

    return {
      samples: allTweets || [],
      totalAvailable,
      actualSampled: allTweets?.length || 0,
      buckets: 1,
      strategy: 'all'
    }
  }

  // Calculate buckets (one per day)
  const days = differenceInDays(endDate, startDate) + 1
  const bucketsCount = Math.max(1, days)
  const tweetsPerBucket = Math.ceil(targetSize / bucketsCount)

  logger.info('[Opinion Map] Sampling with buckets', {
    days,
    buckets: bucketsCount,
    tweets_per_bucket: tweetsPerBucket
  })

  // Sample from each bucket
  const samples: Array<{ id: string; tweet_id: string }> = []

  for (let i = 0; i < bucketsCount; i++) {
    const bucketStart = addDays(startDate, i)
    const bucketEnd = addDays(bucketStart, 1)

    const { data: bucketSamples } = await supabase
      .from('twitter_tweets')
      .select('id, tweet_id')
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', bucketStart.toISOString())
      .lt('twitter_created_at', bucketEnd.toISOString())
      .order('random()')
      .limit(tweetsPerBucket)

    if (bucketSamples && bucketSamples.length > 0) {
      samples.push(...bucketSamples)
      logger.debug('[Opinion Map] Bucket sampled', {
        bucket: i + 1,
        date: bucketStart.toISOString().split('T')[0],
        sampled: bucketSamples.length
      })
    }
  }

  // Trim to exact target size
  const finalSamples = samples.slice(0, targetSize)

  logger.info('[Opinion Map] Sampling complete', {
    total_available: totalAvailable,
    target: targetSize,
    actual: finalSamples.length,
    buckets: bucketsCount
  })

  return {
    samples: finalSamples,
    totalAvailable,
    actualSampled: finalSamples.length,
    buckets: bucketsCount,
    strategy: 'stratified'
  }
}
```

### 2. Sessions (`/lib/data/twitter/opinion-map/sessions.ts`)

```typescript
/**
 * Opinion map session management
 */

import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { TwitterOpinionSession } from '@/types'

export async function createSession(
  zoneId: string,
  config: TwitterOpinionSession['config'],
  userId: string
): Promise<TwitterOpinionSession> {
  const supabase = await createServerClient()

  const sessionId = `zone_${zoneId}_${new Date().toISOString()}`

  const { data, error } = await supabase
    .from('twitter_opinion_sessions')
    .insert({
      zone_id: zoneId,
      session_id: sessionId,
      status: 'pending',
      progress: 0,
      config,
      total_tweets: config.actual_sample_size,
      created_by: userId
    })
    .select()
    .single()

  if (error) {
    logger.error('[Opinion Map] Failed to create session', { error, zone_id: zoneId })
    throw new Error(`Failed to create session: ${error.message}`)
  }

  logger.info('[Opinion Map] Session created', {
    session_id: sessionId,
    zone_id: zoneId,
    total_tweets: config.actual_sample_size
  })

  return data as TwitterOpinionSession
}

export async function getActiveSession(
  zoneId: string
): Promise<TwitterOpinionSession | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('twitter_opinion_sessions')
    .select('*')
    .eq('zone_id', zoneId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('[Opinion Map] Failed to get active session', { error })
    return null
  }

  return data as TwitterOpinionSession | null
}

export async function updateSessionProgress(
  sessionId: string,
  status: TwitterOpinionSession['status'],
  progress: number,
  phaseMessage?: string
): Promise<void> {
  const supabase = await createServerClient()

  await supabase
    .from('twitter_opinion_sessions')
    .update({
      status,
      progress,
      phase_message: phaseMessage || null,
      ...(status === 'completed' && { completed_at: new Date().toISOString() })
    })
    .eq('session_id', sessionId)

  logger.debug('[Opinion Map] Session progress updated', {
    session_id: sessionId,
    status,
    progress
  })
}
```

### 3. Index Export (`/lib/data/twitter/opinion-map/index.ts`)

```typescript
/**
 * Opinion Map Data Layer
 * Centralized exports for all opinion map data operations
 */

// Sampling
export { sampleTweetsStratified } from './sampling'
export type { SamplingConfig, SamplingResult } from './sampling'

// Sessions
export { createSession, getActiveSession, updateSessionProgress } from './sessions'

// Vectorization
export { ensureEmbeddings, batchVectorize } from './vectorization'

// Dimensionality
export { reducePCA, reduceUMAP3D } from './dimensionality'

// Clustering
export { clusterKMeans, autoDetectK } from './clustering'

// Labeling
export { generateClusterLabel } from './labeling'

// Projections
export { 
  getProjections, 
  getEnrichedProjections, 
  saveProjections 
} from './projections'

// Clusters
export { getClusters, saveClusters } from './clusters'

// Time series
export { generateTimeSeriesData } from './time-series'
```

---

## Design System Integration

### Typography (Use Existing Classes)

```tsx
// ✅ CORRECT - Uses design system
<h1 className="text-heading-1">Opinion Map</h1>
<h2 className="text-heading-2">Evolution Over Time</h2>
<p className="text-body-sm text-muted-foreground">
  10,000 tweets analyzed
</p>
<span className="text-caption">Generated 2 minutes ago</span>

// ❌ WRONG - Hardcoded sizes
<h1 className="text-3xl font-bold">Opinion Map</h1>
<p className="text-sm text-gray-500">10,000 tweets analyzed</p>
```

### Colors (Use CSS Variables)

```tsx
// ✅ CORRECT - Uses theme variables
<div className="bg-background text-foreground border-border">
<Badge className="bg-primary text-primary-foreground">
<div style={{ backgroundColor: 'var(--muted)' }}>

// ❌ WRONG - Hardcoded colors
<div className="bg-white text-black border-gray-200">
<Badge className="bg-purple-500 text-white">
<div style={{ backgroundColor: '#f5f5f5' }}>
```

### Spacing (Use Design System)

```tsx
// ✅ CORRECT - Uses spacing system
<div className="space-y-6">           {/* 24px - card spacing */}
<div className="gap-4">               {/* 16px - element spacing */}
<Card className="card-padding">       {/* var(--spacing-card) */}
<div className="mb-8">                {/* 32px - 4px increments */}

// ❌ WRONG - Random values
<div className="space-y-5">           {/* Not in system */}
<div className="gap-[13px]">          {/* Random value */}
<Card className="p-[22px]">           {/* Not harmonious */}
```

### Animations (Use Design System)

```tsx
// ✅ CORRECT - Uses design system
<button className="transition-colors duration-[150ms] hover:text-primary">
<Card className="card-interactive">  {/* Built-in hover */}
<div className="animate-in">          {/* Fade in animation */}

// ❌ WRONG - Custom animations
<button className="transition-all duration-300 hover:text-purple-500">
<Card className="hover:scale-105">   {/* Too aggressive */}
```

### Skeleton Pattern (Reuse Existing)

```tsx
// ✅ CORRECT - Uses skeleton-shimmer class
export function OpinionMapSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-10 w-48 skeleton-shimmer rounded-md" />
            <div className="h-[600px] skeleton-shimmer rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ❌ WRONG - Custom skeleton
<div className="bg-gray-200 animate-pulse" />
```

---

## Component Patterns (Follow Existing)

### Server Component Pattern

```typescript
// page.tsx - Server Component
export default async function AnalysisPage({
  params,
  searchParams
}: {
  params: Promise<{ zoneId: string }>
  searchParams: Promise<{ source?: string }>
}) {
  const { zoneId } = await params
  const { source = 'twitter' } = await searchParams

  // Fetch data server-side
  const zone = await getZoneById(zoneId)
  if (!zone) notFound()

  return (
    <div className="animate-in">
      <ZonePageHeader zone={zone} title="Analysis" />
      
      {/* Client component for interactivity */}
      <TwitterOpinionMapView zoneId={zoneId} />
    </div>
  )
}
```

### Client Component Pattern

```typescript
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function TwitterOpinionMapView({ zoneId }: { zoneId: string }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    loadData()
  }, [zoneId])

  const loadData = async () => {
    try {
      setLoading(true)
      // Fetch data...
    } catch (error) {
      toast.error('Failed to load opinion map')
      logger.error('Load error', { error })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <OpinionMapSkeleton />

  return (
    // Component JSX
  )
}
```

### Auto-Save Pattern (No Submit Buttons)

```typescript
// ✅ CORRECT - Auto-save on change
<Select 
  value={period}
  onValueChange={(value) => {
    setPeriod(value)
    // Auto-generate on change
    handleGenerate()
  }}
>
  <SelectItem value="7d">Last 7 days</SelectItem>
  <SelectItem value="30d">Last 30 days</SelectItem>
</Select>

// ❌ WRONG - Manual submit
<Select value={period} onValueChange={setPeriod}>
  ...
</Select>
<Button onClick={handleSubmit}>Apply</Button>
```

---

## Reusing Existing Components

### TweetCard Reuse

```typescript
// Import existing TweetCard
import { TwitterFeedCard } from '@/components/dashboard/zones/twitter/twitter-feed-card'

// Use in slider
<TwitterFeedCard
  tweet={currentTweet}
  zone_id={zoneId}
  onMediaClick={handleMediaClick}
  // Pass any existing props
/>
```

### Chart Reuse

```typescript
// Import existing chart setup
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

// Use consistent styling
<ChartContainer config={chartConfig} className="h-[300px]">
  <AreaChart data={timeSeriesData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <ChartTooltip />
    {/* ... */}
  </AreaChart>
</ChartContainer>
```

---

## Error Handling (Follow Existing Pattern)

```typescript
// Use centralized logger
import { logger } from '@/lib/logger'

try {
  // Operation
} catch (error) {
  logger.error('[Opinion Map] Operation failed', {
    zone_id: zoneId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  })

  // User feedback
  toast.error('Failed to generate opinion map', {
    description: error instanceof Error ? error.message : 'Unknown error'
  })
}
```

---

## API Route Pattern

```typescript
// /app/api/twitter/opinion-map/generate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { canAccessZone } from '@/lib/auth/permissions'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request
    const body = await request.json()
    const { zone_id, start_date, end_date, sample_size } = body

    // 2. Authenticate
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 3. Authorize
    const hasAccess = await canAccessZone(user, zone_id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // 4. Process...

    // 5. Success response
    return NextResponse.json({
      success: true,
      session_id: sessionId,
      estimated_time_seconds: estimatedTime
    })

  } catch (error) {
    logger.error('[Opinion Map] API error', { error })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

---

## Quality Checklist

Before submitting any code:

### Code Quality
- [ ] All text in English (UI, comments, logs, variables)
- [ ] TypeScript types defined in `/types/index.ts`
- [ ] Data functions in `/lib/data/twitter/opinion-map/`
- [ ] Follows existing naming conventions
- [ ] No code duplication (reuse existing functions)
- [ ] Centralized logger used
- [ ] Error handling implemented
- [ ] No `any` types (except where necessary)

### Design System
- [ ] Uses CSS variables (no hardcoded colors)
- [ ] Uses typography classes (text-heading-1, text-body-sm)
- [ ] Uses spacing system (space-y-6, gap-4, card-padding)
- [ ] Uses animations (transition-colors duration-[150ms])
- [ ] Uses skeleton-shimmer for loading states
- [ ] Mobile-responsive (tested on mobile viewport)

### Performance
- [ ] Server components where possible
- [ ] Client components only when needed
- [ ] Proper loading states (skeletons)
- [ ] No unnecessary re-renders
- [ ] Optimized database queries
- [ ] Proper caching strategy

### UX
- [ ] Auto-save (no manual submit buttons unless necessary)
- [ ] Clear feedback (toast notifications)
- [ ] Smooth transitions (150-250ms)
- [ ] Intuitive interactions
- [ ] Accessible (ARIA labels, keyboard navigation)

---

## Ready for Implementation

This integration guide ensures:
- ✅ Perfect alignment with Gorgone V2 architecture
- ✅ No breaking changes to existing code
- ✅ Professional, production-ready quality
- ✅ Government-grade security and UX standards
- ✅ Scalable, maintainable, modular code

**Next Step**: Implement Week 1 - Database migrations


