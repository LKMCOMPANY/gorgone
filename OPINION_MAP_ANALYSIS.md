# Opinion Map Analysis - V1 to V2 Migration

**Date**: November 18, 2025  
**Status**: Analysis & Architecture Phase  
**Author**: AI Assistant

---

## Executive Summary

This document analyzes the V1 opinion map implementation and proposes an optimized architecture for V2 that addresses scalability, performance, and timeout constraints while maintaining the core functionality of 2D/3D opinion clustering visualization.

---

## V1 Architecture Analysis

### Core Components

#### 1. Vectorization Pipeline

**Location**: `lib/vectorization/`

**Components**:
- `embeddings.ts` - OpenAI embedding generation using Vercel AI SDK
- `queue.ts` - QStash job scheduling
- `storage.ts` - Database CRUD for embeddings
- `content.ts` - Tweet content enrichment

**Key Features**:
- Uses OpenAI `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens)
- Batch embedding generation via `embedMany()` for efficiency
- Content enrichment: combines tweet text + author info + hashtags
- QStash queue with retry logic (3 retries, configurable delay)
- Deduplication check before vectorization

**Strengths**:
✅ Well-structured modular code  
✅ Batch processing for cost optimization  
✅ Proper error handling and retry logic  
✅ Content enrichment for semantic relevance

**Weaknesses**:
❌ No timeout handling for long-running jobs  
❌ No progressive vectorization (all-or-nothing)  
❌ No fallback for OpenAI rate limits beyond retries  
❌ No streaming/chunking for large datasets

#### 2. Clustering Pipeline

**Location**: `lib/clustering/`

**Components**:
- `clustering-pipeline.ts` - Main orchestrator
- `pca-reducer.ts` - PCA dimensionality reduction (1536D → 20D)
- `umap-reducer.ts` - UMAP projection (20D → 2D/3D) using `umap-js`
- `kmeans-clusterer.ts` - K-means clustering algorithm
- `density-clusterer.ts` - DBSCAN density clustering
- `cluster-labeler.ts` - AI-powered cluster naming (GPT-4o-mini)

**Pipeline Flow**:
```
1. Fetch embeddings from DB (max 5000 tweets)
   ↓
2a. High-dimensional PCA (1536D → 20D) for clustering
   ↓
2b. UMAP (20D → 2D or 3D) for visualization
   ↓
3. K-means clustering on 20D space (auto-detect 5-12 clusters)
   ↓
4. Save projections to tweet_projections table
   ↓
5. Generate cluster metadata (label, keywords, sentiment) using AI
   ↓
6. Save cluster metadata to opinion_clusters table
```

**Key Features**:
- Two-stage dimensionality reduction (PCA → UMAP)
- Support for both 2D and 3D visualization
- Auto-detection of optimal cluster count
- AI-generated cluster labels with retry logic
- Progress tracking via `clustering_jobs` table
- Batch insertion of projections (1000 per batch)

**Strengths**:
✅ Solid mathematical foundation (PCA + UMAP + K-means)  
✅ Progress tracking for long operations  
✅ Cancellable jobs  
✅ AI-powered cluster naming  
✅ Both 2D and 3D support

**Weaknesses**:
❌ 5000 tweet limit (hardcoded max)  
❌ No timeout protection (entire pipeline runs in single execution)  
❌ Vercel serverless timeout risk (10-15 min max)  
❌ Memory-intensive for large datasets  
❌ No incremental processing  
❌ Rate limit issues with cluster labeling (exponential backoff only)

#### 3. UI Components

**Location**: `components/dashboard/opinion-map/`

**Components**:
- `opinion-map-view.tsx` - Main container with time period selector
- `opinion-map-canvas.tsx` - 2D Canvas rendering with D3.js
- `opinion-map-3d-canvas.tsx` - 3D WebGL rendering (Three.js implied)
- `opinion-map-side-panel.tsx` - Cluster/tweet details panel
- `cluster-panel.tsx` - Cluster list and filters
- `tweet-detail-panel.tsx` - Selected tweet details
- `opinion-map-skeleton.tsx` - Loading states

**Key Features**:
- D3.js for 2D visualization (zoom, pan, hover, selection)
- QuadTree spatial indexing for performance
- Real-time job progress polling (10s intervals)
- Time period filtering (1h, 3h, 6h, 12h, 24h, 7d, custom)
- Cluster color coding (12 distinct colors)
- Interactive legend with cluster stats
- Fullscreen mode
- Export functionality

**Rendering Strategy**:
```typescript
// 2D: Canvas + D3.js
- QuadTree for spatial queries
- Zoom/pan with d3-zoom
- Custom point rendering
- Hover/click interactions

// 3D: WebGL (Three.js implied)
- 3D scene with camera controls
- Particle/point cloud rendering
- Interactive selection
```

**Strengths**:
✅ High-performance Canvas rendering  
✅ QuadTree optimization for hover detection  
✅ Rich interactivity (zoom, pan, select, hover)  
✅ Real-time progress updates  
✅ Time-based filtering

**Weaknesses**:
❌ 2D canvas doesn't scale well beyond 10K points  
❌ 3D implementation details unclear  
❌ No virtualization for large datasets  
❌ No data streaming (all-or-nothing load)  
❌ No progressive rendering

---

## V1 Database Schema

### Tables Created in V1

#### 1. `tweet_embeddings`
```typescript
{
  id: UUID
  operation_name: string  // Client identifier
  zone_id: UUID
  tweet_id: string        // FK to tweets
  text_content: string    // Enriched content
  embedding: vector(1536) // OpenAI embedding
  embedding_model: string // Model used
  created_at: timestamp
  updated_at: timestamp
}

Indexes:
- PRIMARY KEY (id)
- UNIQUE (tweet_id) // Prevent duplicates
- INDEX (zone_id, created_at DESC) // Fetch recent embeddings
- IVFFLAT (embedding) // Vector similarity search
```

#### 2. `tweet_projections`
```typescript
{
  id: UUID
  tweet_id: string
  operation_name: string
  zone_id: UUID
  projection_version: string  // Version control for re-clustering
  x: number                   // 2D/3D coordinate
  y: number
  z?: number                  // Optional 3D
  cluster_id: number          // -1 for outliers
  cluster_confidence: number  // 0-1
  is_outlier: boolean
  created_at: timestamp
  updated_at: timestamp
}

Indexes:
- PRIMARY KEY (id)
- UNIQUE (tweet_id, projection_version) // One projection per version
- INDEX (zone_id, projection_version) // Fast filtering
- INDEX (cluster_id) // Cluster queries
```

#### 3. `opinion_clusters`
```typescript
{
  id: UUID
  zone_id: UUID
  projection_version: string
  cluster_id: number
  label: string             // AI-generated
  keywords: string[]
  tweet_count: number
  centroid_x: number        // 2D/3D centroid
  centroid_y: number
  centroid_z?: number
  avg_sentiment: number     // -1 to 1
  coherence_score: number   // Cluster quality metric
  reasoning: string         // AI explanation
  created_at: timestamp
  updated_at: timestamp
}

Indexes:
- PRIMARY KEY (id)
- UNIQUE (zone_id, projection_version, cluster_id)
- INDEX (zone_id, projection_version) // Fast filtering
```

#### 4. `clustering_jobs`
```typescript
{
  id: UUID
  zone_id: UUID
  projection_version: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number          // 0-100
  total_tweets: number
  total_clusters: number
  outlier_count: number
  execution_time_ms: number
  error_message: string
  error_stack: string
  started_at: timestamp
  completed_at: timestamp
  created_at: timestamp
}

Indexes:
- PRIMARY KEY (id)
- INDEX (zone_id, created_at DESC) // Latest job lookup
- INDEX (status) // Active job queries
```

---

## V2 Architecture Constraints

### Vercel Platform Limits

**Serverless Functions**:
- Hobby: 10 seconds max execution
- Pro: 60 seconds max execution
- Enterprise: 900 seconds (15 minutes)

**Memory**:
- Hobby: 1024 MB
- Pro: 3008 MB

**Implications**:
❌ Cannot run entire clustering pipeline in single API call  
❌ Cannot process large datasets synchronously  
✅ Must use background jobs (QStash)  
✅ Must chunk operations into smaller units  
✅ Must implement progressive processing

### Next.js Best Practices

**Server Actions**:
- Fast response (< 5s ideal)
- Offload long tasks to workers
- Stream results when possible
- Use database for state management

**API Routes**:
- Stateless handlers
- Quick acknowledgment + background processing
- Webhook patterns for async operations

### Supabase Constraints

**PostgreSQL**:
- pgvector extension available ✅
- Vector operations can be slow on large datasets
- Need proper indexes for performance
- Connection pooling limits

**Real-time**:
- Can use for progress updates
- Reduces polling overhead

---

## Identified Issues & Risks

### 1. Timeout Risks

**Problem**: V1 clustering pipeline can take 5+ minutes for 5000 tweets

**V1 Code**:
```typescript
// clustering-pipeline.ts - runs everything synchronously
export async function runClusteringPipeline(config) {
  // Step 1: Fetch 5000 embeddings
  const embeddings = await supabase.from('tweet_embeddings').select()
  
  // Step 2: PCA (CPU-intensive)
  const pcaResult = await reduceWithPCAHighDim(embeddings, 20)
  
  // Step 3: UMAP (very slow for large datasets)
  const umapResult = await reduceWithUMAP(embeddings)
  
  // Step 4: K-means (iterative, can be slow)
  const clusters = await clusterWithKMeans(pcaResult.projections)
  
  // Step 5: Save projections (5000 inserts)
  for (let i = 0; i < projections.length; i += 1000) {
    await supabase.from('tweet_projections').insert(batch)
  }
  
  // Step 6: Label clusters (multiple AI calls)
  for (const cluster of clusters) {
    await generateClusterLabel(cluster.tweets) // OpenAI API call
  }
}
```

**Risk Level**: 🔴 **CRITICAL**

**Impact**:
- Vercel timeout kills function mid-execution
- Partial data corruption
- User frustration
- Wasted API credits

### 2. Scalability Issues

**Problem**: 5000 tweet hardcoded limit

**V1 Code**:
```typescript
const maxTweets = config.maxTweets || 5000 // Hardcoded limit
query = query.limit(maxTweets)
```

**Risk Level**: 🟠 **HIGH**

**Impact**:
- Cannot analyze larger zones
- Data sampling bias (most recent only)
- Not suitable for high-volume monitoring

### 3. Memory Consumption

**Problem**: Loading all embeddings + projections into memory

**Estimates**:
```
5000 tweets × 1536 dimensions × 4 bytes = 30 MB (embeddings)
5000 tweets × 20D × 4 bytes = 400 KB (PCA)
5000 tweets × metadata = 5-10 MB
Total: ~40-50 MB per job
```

**Risk Level**: 🟡 **MEDIUM**

**Impact**:
- Acceptable for 5K tweets
- Problem at 20K+ tweets (200+ MB)
- Vercel function memory limits

### 4. Rate Limiting

**Problem**: Multiple sequential OpenAI API calls

**V1 Code**:
```typescript
// Cluster labeling - sequential calls
for (const cluster of clusters) {
  const label = await generateClusterLabel(cluster.tweets) // OpenAI call
  // Exponential backoff on 429, but blocks entire pipeline
}
```

**Risk Level**: 🟡 **MEDIUM**

**Impact**:
- Pipeline stalls on rate limits
- Unpredictable execution time
- User experience degradation

### 5. Database Schema Compatibility

**Problem**: V1 uses different table structure than V2

**V2 Schema** (twitter_tweets):
```sql
CREATE TABLE twitter_tweets (
  id UUID PRIMARY KEY,
  tweet_id TEXT UNIQUE,
  zone_id UUID,
  embedding VECTOR(1536),
  embedding_model TEXT,
  embedding_created_at TIMESTAMPTZ,
  -- Many other fields
)
```

**V1 Schema** (tweet_embeddings - separate table):
```sql
CREATE TABLE tweet_embeddings (
  id UUID PRIMARY KEY,
  tweet_id TEXT UNIQUE,
  zone_id UUID,
  text_content TEXT,
  embedding VECTOR(1536),
  embedding_model TEXT
)
```

**Risk Level**: 🟢 **LOW**

**Impact**:
- V2 already has embedding column in twitter_tweets ✅
- Can reuse V1 projection tables with minor changes
- Migration path is clear

---

## Proposed V2 Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  (Analysis Page with 2D/3D Opinion Map + Cluster Details)      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ 1. Trigger Clustering
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Route                            │
│     /api/twitter/clustering/trigger                             │
│  - Validate request                                             │
│  - Create clustering_job record (status: pending)              │
│  - Schedule QStash worker                                       │
│  - Return immediately (< 1s)                                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ 2. QStash Schedule
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                QStash Background Worker                         │
│     /api/webhooks/qstash/clustering-worker                      │
│                                                                 │
│  Phase 1: Vectorization (if needed)                            │
│  ├─ Fetch non-vectorized tweets (batch: 100)                   │
│  ├─ Generate embeddings via OpenAI embedMany()                 │
│  ├─ Update twitter_tweets.embedding column                     │
│  ├─ Re-schedule self if more tweets to process                 │
│  └─ Continue to Phase 2 when done                              │
│                                                                 │
│  Phase 2: Dimensionality Reduction                             │
│  ├─ Fetch all embeddings for zone (stream in chunks)           │
│  ├─ Run PCA (1536D → 20D) - chunk if needed                    │
│  ├─ Run UMAP (20D → 2D/3D) - chunk if needed                   │
│  ├─ Save to tweet_projections (batch: 1000)                    │
│  └─ Continue to Phase 3                                        │
│                                                                 │
│  Phase 3: Clustering                                            │
│  ├─ Load 20D PCA projections                                   │
│  ├─ Run K-means (detect optimal k)                             │
│  ├─ Update tweet_projections with cluster_id                   │
│  └─ Continue to Phase 4                                        │
│                                                                 │
│  Phase 4: Cluster Labeling                                     │
│  ├─ For each cluster (parallel where possible)                 │
│  │   ├─ Sample representative tweets (max 50)                  │
│  │   ├─ Call OpenAI for label generation                       │
│  │   └─ Handle rate limits gracefully                          │
│  ├─ Save to opinion_clusters table                             │
│  └─ Mark job as completed                                      │
│                                                                 │
│  Error Handling:                                                │
│  ├─ Checkpoint progress at each phase                          │
│  ├─ Retry on transient failures                                │
│  ├─ Mark job as failed on unrecoverable errors                 │
│  └─ Store error details for debugging                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ 3. Progress Updates (Supabase Realtime)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    UI Progress Tracking                         │
│  - Subscribe to clustering_jobs changes                         │
│  - Display progress bar + current phase                         │
│  - Show estimated time remaining                                │
│  - Allow cancellation                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema Changes

#### 1. Reuse V2's `twitter_tweets` table (no new table needed)

**Columns to use**:
```sql
-- Already exists in V2:
embedding VECTOR(1536)
embedding_model TEXT
embedding_created_at TIMESTAMPTZ
```

**Migration**:
- ✅ No table creation needed
- ✅ Just populate existing columns

#### 2. Create `twitter_tweet_projections` (NEW)

```sql
CREATE TABLE twitter_tweet_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_db_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  projection_version TEXT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  z NUMERIC, -- Optional for 3D
  cluster_id INTEGER, -- NULL for outliers
  cluster_confidence NUMERIC CHECK (cluster_confidence >= 0 AND cluster_confidence <= 1),
  is_outlier BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (tweet_db_id, projection_version) -- One projection per version
);

-- Indexes
CREATE INDEX idx_projections_zone_version ON twitter_tweet_projections (zone_id, projection_version);
CREATE INDEX idx_projections_cluster ON twitter_tweet_projections (cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_projections_version ON twitter_tweet_projections (projection_version);
```

#### 3. Create `twitter_opinion_clusters` (NEW)

```sql
CREATE TABLE twitter_opinion_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  projection_version TEXT NOT NULL,
  cluster_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  tweet_count INTEGER DEFAULT 0,
  centroid_x NUMERIC NOT NULL,
  centroid_y NUMERIC NOT NULL,
  centroid_z NUMERIC, -- Optional for 3D
  avg_sentiment NUMERIC CHECK (avg_sentiment >= -1 AND avg_sentiment <= 1),
  coherence_score NUMERIC CHECK (coherence_score >= 0 AND coherence_score <= 1),
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (zone_id, projection_version, cluster_id)
);

-- Indexes
CREATE INDEX idx_clusters_zone_version ON twitter_opinion_clusters (zone_id, projection_version);
CREATE INDEX idx_clusters_version ON twitter_opinion_clusters (projection_version);
```

#### 4. Create `twitter_clustering_jobs` (NEW)

```sql
CREATE TABLE twitter_clustering_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  projection_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'vectorizing', 'reducing', 'clustering', 'labeling', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_phase TEXT,
  phase_message TEXT,
  config JSONB DEFAULT '{}',
  total_tweets INTEGER,
  vectorized_tweets INTEGER DEFAULT 0,
  total_clusters INTEGER,
  outlier_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE (zone_id, projection_version)
);

-- Indexes
CREATE INDEX idx_clustering_jobs_zone ON twitter_clustering_jobs (zone_id, created_at DESC);
CREATE INDEX idx_clustering_jobs_status ON twitter_clustering_jobs (status) WHERE status IN ('pending', 'vectorizing', 'reducing', 'clustering', 'labeling');
```

### Chunked Processing Strategy

#### Phase 1: Vectorization

```typescript
// /api/webhooks/qstash/clustering-worker
async function vectorizePhase(job: ClusteringJob) {
  const BATCH_SIZE = 100
  
  // Fetch non-vectorized tweets for this zone
  const tweets = await supabase
    .from('twitter_tweets')
    .select('id, tweet_id, text, author_profile_id')
    .eq('zone_id', job.zone_id)
    .is('embedding', null)
    .limit(BATCH_SIZE)
  
  if (tweets.length === 0) {
    // All tweets vectorized, move to next phase
    return { phase: 'reducing', progress: 25 }
  }
  
  // Enrich content for each tweet
  const contents = tweets.map(t => enrichTweetContent(t))
  
  // Batch generate embeddings
  const embeddings = await embedMany({
    model: 'openai/text-embedding-3-small',
    values: contents
  })
  
  // Update tweets with embeddings
  for (let i = 0; i < tweets.length; i++) {
    await supabase
      .from('twitter_tweets')
      .update({
        embedding: embeddings.embeddings[i],
        embedding_model: 'openai/text-embedding-3-small',
        embedding_created_at: new Date().toISOString()
      })
      .eq('id', tweets[i].id)
  }
  
  // Update job progress
  const totalVectorized = job.vectorized_tweets + tweets.length
  const progress = Math.floor((totalVectorized / job.total_tweets) * 25)
  
  await supabase
    .from('twitter_clustering_jobs')
    .update({
      status: 'vectorizing',
      vectorized_tweets: totalVectorized,
      progress,
      phase_message: `Vectorized ${totalVectorized}/${job.total_tweets} tweets`
    })
    .eq('id', job.id)
  
  // Re-schedule self to continue vectorization
  await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/qstash/clustering-worker`,
    body: { job_id: job.id },
    delay: 2 // Small delay to avoid rate limits
  })
  
  return { phase: 'vectorizing', reschedule: true }
}
```

#### Phase 2: Dimensionality Reduction

```typescript
async function reductionPhase(job: ClusteringJob) {
  const MAX_CHUNK_SIZE = 5000 // Process in chunks to avoid memory issues
  
  // Fetch all embeddings for zone
  const { data: tweets, count } = await supabase
    .from('twitter_tweets')
    .select('id, tweet_id, embedding', { count: 'exact' })
    .eq('zone_id', job.zone_id)
    .not('embedding', 'is', null)
    .order('twitter_created_at', { ascending: false })
    .limit(MAX_CHUNK_SIZE) // Start with most recent
  
  if (!tweets || tweets.length === 0) {
    throw new Error('No vectorized tweets found for reduction')
  }
  
  // Extract embeddings
  const embeddings = tweets.map(t => t.embedding)
  
  // Step 1: PCA (1536D → 20D)
  await updateJobProgress(job.id, 30, 'Running PCA dimensionality reduction...')
  const pcaResult = await reduceWithPCAHighDim(embeddings, 20)
  
  // Step 2: UMAP (20D → 2D or 3D)
  await updateJobProgress(job.id, 45, 'Running UMAP projection...')
  const enable3D = job.config?.enable3D || false
  const umapResult = enable3D 
    ? await reduceWithUMAP3D(embeddings)
    : await reduceWithUMAP(embeddings)
  
  // Normalize projections
  const normalizedProjections = enable3D
    ? normalizeUMAP3DProjections(umapResult.projections)
    : normalizeUMAPProjections(umapResult.projections)
  
  // Save projections to database
  await updateJobProgress(job.id, 50, 'Saving projections...')
  const projections = tweets.map((tweet, i) => ({
    tweet_db_id: tweet.id,
    zone_id: job.zone_id,
    projection_version: job.projection_version,
    x: normalizedProjections[i][0],
    y: normalizedProjections[i][1],
    z: enable3D ? normalizedProjections[i][2] : null,
    pca_projection: pcaResult.projections[i] // Store for clustering
  }))
  
  // Batch insert (1000 per batch)
  for (let i = 0; i < projections.length; i += 1000) {
    const batch = projections.slice(i, i + 1000)
    await supabase.from('twitter_tweet_projections').insert(batch)
  }
  
  return { phase: 'clustering', progress: 50 }
}
```

#### Phase 3: Clustering

```typescript
async function clusteringPhase(job: ClusteringJob) {
  // Fetch PCA projections (20D)
  const { data: projections } = await supabase
    .from('twitter_tweet_projections')
    .select('id, tweet_db_id, pca_projection')
    .eq('zone_id', job.zone_id)
    .eq('projection_version', job.projection_version)
  
  if (!projections || projections.length === 0) {
    throw new Error('No projections found for clustering')
  }
  
  // Extract 20D vectors
  const vectors = projections.map(p => p.pca_projection)
  
  // Run K-means
  await updateJobProgress(job.id, 60, 'Running K-means clustering...')
  const clusteringResult = await clusterWithKMeans(vectors, {
    k: job.config?.kmeans?.k, // undefined = auto-detect
    maxIterations: 100,
    tolerance: 1e-4
  })
  
  // Update projections with cluster assignments
  await updateJobProgress(job.id, 70, 'Assigning clusters...')
  for (let i = 0; i < projections.length; i++) {
    await supabase
      .from('twitter_tweet_projections')
      .update({
        cluster_id: clusteringResult.labels[i],
        cluster_confidence: clusteringResult.confidence[i],
        is_outlier: clusteringResult.labels[i] === -1
      })
      .eq('id', projections[i].id)
  }
  
  // Update job stats
  await supabase
    .from('twitter_clustering_jobs')
    .update({
      total_clusters: clusteringResult.clusterCount,
      outlier_count: clusteringResult.outlierCount
    })
    .eq('id', job.id)
  
  return { phase: 'labeling', progress: 75 }
}
```

#### Phase 4: Cluster Labeling

```typescript
async function labelingPhase(job: ClusteringJob) {
  // Get clusters with tweet samples
  const clusters = await getClusterSamples(job.zone_id, job.projection_version)
  
  const clusterMetadata = []
  let processed = 0
  
  for (const cluster of clusters) {
    const progress = 75 + Math.floor((processed / clusters.length) * 20)
    await updateJobProgress(
      job.id,
      progress,
      `Labeling cluster ${processed + 1}/${clusters.length}...`
    )
    
    // Generate label with retry logic
    let labelResult
    try {
      labelResult = await generateClusterLabel(cluster.tweets, cluster.cluster_id)
    } catch (error) {
      // Fallback to keyword-based label
      labelResult = {
        label: extractKeywords(cluster.tweets, 3).join(', '),
        keywords: extractKeywords(cluster.tweets, 10),
        sentiment: 0,
        confidence: 0.3,
        reasoning: 'AI labeling failed, using keyword fallback'
      }
    }
    
    // Calculate centroid
    const centroidX = cluster.projections.reduce((sum, p) => sum + p.x, 0) / cluster.projections.length
    const centroidY = cluster.projections.reduce((sum, p) => sum + p.y, 0) / cluster.projections.length
    const centroidZ = job.config?.enable3D
      ? cluster.projections.reduce((sum, p) => sum + p.z, 0) / cluster.projections.length
      : null
    
    clusterMetadata.push({
      zone_id: job.zone_id,
      projection_version: job.projection_version,
      cluster_id: cluster.cluster_id,
      label: labelResult.label,
      keywords: labelResult.keywords,
      tweet_count: cluster.tweets.length,
      centroid_x: centroidX,
      centroid_y: centroidY,
      centroid_z: centroidZ,
      avg_sentiment: labelResult.sentiment,
      coherence_score: labelResult.confidence,
      reasoning: labelResult.reasoning
    })
    
    processed++
  }
  
  // Save cluster metadata
  await supabase.from('twitter_opinion_clusters').insert(clusterMetadata)
  
  // Mark job as completed
  await supabase
    .from('twitter_clustering_jobs')
    .update({
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
      execution_time_ms: Date.now() - new Date(job.started_at).getTime()
    })
    .eq('id', job.id)
  
  return { phase: 'completed', progress: 100 }
}
```

### UI Components Architecture

#### 1. Main Analysis Page

**Location**: `/app/dashboard/zones/[zoneId]/analysis/page.tsx`

```tsx
export default async function AnalysisPage({ params, searchParams }) {
  const { zoneId } = await params
  const { source = 'twitter' } = await searchParams
  
  const zone = await getZoneById(zoneId)
  if (!zone) notFound()
  
  return (
    <div className="animate-in">
      <ZonePageHeader zone={zone} title="Analysis" />
      
      {zone.data_sources.twitter && (
        <TwitterOpinionMapView zoneId={zoneId} />
      )}
      
      {/* Other data sources... */}
    </div>
  )
}
```

#### 2. Opinion Map Container

**Location**: `/components/dashboard/zones/twitter/twitter-opinion-map-view.tsx`

```tsx
'use client'

export function TwitterOpinionMapView({ zoneId }: { zoneId: string }) {
  const [loading, setLoading] = useState(true)
  const [projections, setProjections] = useState<TweetProjection[]>([])
  const [clusters, setClusters] = useState<OpinionCluster[]>([])
  const [job, setJob] = useState<ClusteringJob | null>(null)
  const [view3D, setView3D] = useState(false)
  
  // Subscribe to job progress
  useEffect(() => {
    const channel = supabase
      .channel(`clustering_job_${zoneId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'twitter_clustering_jobs',
        filter: `zone_id=eq.${zoneId}`
      }, (payload) => {
        setJob(payload.new as ClusteringJob)
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [zoneId])
  
  // Load data
  useEffect(() => {
    loadOpinionMapData(zoneId).then(data => {
      setProjections(data.projections)
      setClusters(data.clusters)
      setLoading(false)
    })
  }, [zoneId])
  
  if (loading) return <OpinionMapSkeleton />
  
  if (projections.length === 0) {
    return <EmptyState onGenerate={() => triggerClustering(zoneId)} />
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Opinion Map</CardTitle>
              <CardDescription>
                {job?.status === 'completed' ? (
                  `${projections.length} tweets · ${clusters.length} clusters`
                ) : job ? (
                  <>
                    <Progress value={job.progress} />
                    {job.phase_message}
                  </>
                ) : null}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <ToggleGroup value={view3D ? '3d' : '2d'} onValueChange={(v) => setView3D(v === '3d')}>
                <ToggleGroupItem value="2d">2D</ToggleGroupItem>
                <ToggleGroupItem value="3d">3D</ToggleGroupItem>
              </ToggleGroup>
              
              <Button onClick={() => triggerClustering(zoneId)} disabled={job?.status !== 'completed'}>
                Regenerate
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {view3D ? (
            <OpinionMap3DCanvas projections={projections} clusters={clusters} />
          ) : (
            <OpinionMap2DCanvas projections={projections} clusters={clusters} />
          )}
        </div>
        
        <OpinionMapSidePanel clusters={clusters} />
      </div>
    </div>
  )
}
```

#### 3. 2D Canvas Component

**Location**: `/components/dashboard/zones/twitter/twitter-opinion-map-2d.tsx`

- Reuse V1's Canvas + D3.js implementation
- QuadTree for performance
- Zoom/pan controls
- Hover/click interactions

#### 4. 3D Canvas Component

**Location**: `/components/dashboard/zones/twitter/twitter-opinion-map-3d.tsx`

- Use Three.js or React Three Fiber
- WebGL rendering for performance
- Orbit controls for camera
- Point cloud or sphere instances for tweets
- Cluster highlighting

---

## Implementation Roadmap

### Phase 1: Database Schema (Week 1)

**Tasks**:
1. ✅ Review V2 twitter_tweets schema (already has embedding column)
2. Create migration for `twitter_tweet_projections` table
3. Create migration for `twitter_opinion_clusters` table
4. Create migration for `twitter_clustering_jobs` table
5. Test migrations on dev environment
6. Document schema in DATABASE_SCHEMA.md

**Deliverables**:
- SQL migration files
- Updated schema documentation
- Test data scripts

### Phase 2: Vectorization Module (Week 2)

**Tasks**:
1. Create `/lib/data/twitter/vectorization/` module
   - `embeddings.ts` - OpenAI embedding generation
   - `batch-processor.ts` - Chunked processing
   - `storage.ts` - Database operations
   - `content-enrichment.ts` - Tweet content preparation
2. Create API endpoint `/api/twitter/vectorization/trigger`
3. Create QStash worker `/api/webhooks/qstash/vectorize-batch`
4. Implement progress tracking
5. Add error handling and retries
6. Write unit tests

**Deliverables**:
- Vectorization module
- API endpoints
- QStash worker
- Test suite

### Phase 3: Clustering Module (Week 3)

**Tasks**:
1. Create `/lib/data/twitter/clustering/` module
   - `pca-reducer.ts` - PCA implementation
   - `umap-reducer.ts` - UMAP wrapper
   - `kmeans-clusterer.ts` - K-means algorithm
   - `cluster-labeler.ts` - AI labeling
2. Create API endpoint `/api/twitter/clustering/trigger`
3. Create QStash worker `/api/webhooks/qstash/clustering-worker`
4. Implement chunked processing for each phase
5. Add job cancellation support
6. Write unit tests

**Deliverables**:
- Clustering module
- Multi-phase worker
- Job management API
- Test suite

### Phase 4: UI Components (Week 4)

**Tasks**:
1. Create base components:
   - `twitter-opinion-map-view.tsx` - Main container
   - `twitter-opinion-map-skeleton.tsx` - Loading state
   - `twitter-opinion-map-empty-state.tsx` - No data state
2. Create 2D canvas component:
   - Port V1's Canvas + D3.js implementation
   - Implement QuadTree optimization
   - Add zoom/pan/hover interactions
3. Create 3D canvas component:
   - Set up Three.js/R3F
   - Implement point cloud rendering
   - Add orbit controls
4. Create side panel:
   - Cluster list
   - Cluster details
   - Tweet details
5. Integrate progress tracking (Supabase Realtime)
6. Add time period filters

**Deliverables**:
- Complete UI component set
- 2D and 3D visualizations
- Interactive controls
- Real-time progress updates

### Phase 5: Integration & Testing (Week 5)

**Tasks**:
1. Integrate all modules
2. End-to-end testing:
   - Small dataset (100 tweets)
   - Medium dataset (1000 tweets)
   - Large dataset (5000+ tweets)
3. Performance optimization:
   - Database query optimization
   - Canvas rendering optimization
   - Memory usage profiling
4. Error handling refinement
5. User acceptance testing

**Deliverables**:
- Fully integrated feature
- Test reports
- Performance benchmarks
- Bug fixes

---

## Cost Estimation

### OpenAI API Costs

**Embeddings** (text-embedding-3-small):
- $0.02 per 1M tokens
- ~250 tokens per tweet (enriched content)
- 1000 tweets = 250K tokens = $0.005
- 10K tweets = 2.5M tokens = $0.05

**Cluster Labeling** (GPT-4o-mini):
- $0.150 per 1M input tokens
- ~500 tokens per cluster (50 sample tweets)
- 10 clusters = 5K tokens = $0.00075
- Negligible cost

**Monthly Cost Example** (10K new tweets/day zone):
- Vectorization: 300K tweets × $0.05/10K = $1.50/month
- Labeling: 30 re-clusterings × $0.01 = $0.30/month
- **Total: ~$2/month per 10K-tweet zone**

### Infrastructure Costs

**Vercel**:
- Pro plan recommended: $20/month (includes 1000 GB-hours)
- Estimated usage: ~50 GB-hours for clustering jobs
- Well within Pro limits ✅

**Supabase**:
- Pro plan: $25/month (includes 8 GB database)
- Storage estimates:
  - Embeddings: 1M tweets × 1536D × 4B = 6 GB
  - Projections: 1M tweets × 200B = 200 MB
  - Clusters: Negligible
- Total: ~6.2 GB ✅

**QStash (Upstash)**:
- Pay-as-you-go: $1 per 100K requests
- Estimated: 500 requests/month = $0.005
- Negligible cost ✅

**Total Infrastructure**: ~$47/month (scales with usage)

---

## Performance Targets

### Vectorization Phase

| Dataset Size | Processing Time | API Calls | Cost |
|--------------|----------------|-----------|------|
| 100 tweets | 5-10 seconds | 1 batch | $0.0001 |
| 1,000 tweets | 30-60 seconds | 10 batches | $0.005 |
| 5,000 tweets | 2-5 minutes | 50 batches | $0.025 |
| 10,000 tweets | 5-10 minutes | 100 batches | $0.05 |

### Clustering Phase

| Dataset Size | PCA | UMAP | K-means | Labeling | Total |
|--------------|-----|------|---------|----------|-------|
| 100 tweets | 1s | 2s | 1s | 5s | ~10s |
| 1,000 tweets | 3s | 10s | 3s | 10s | ~30s |
| 5,000 tweets | 10s | 60s | 10s | 30s | ~2min |
| 10,000 tweets | 20s | 180s | 20s | 60s | ~5min |

### UI Rendering

| Dataset Size | Canvas Render | QuadTree Build | Hover Detection | Total |
|--------------|---------------|----------------|-----------------|-------|
| 100 tweets | < 10ms | < 5ms | < 1ms | < 20ms |
| 1,000 tweets | < 50ms | < 10ms | < 2ms | < 70ms |
| 5,000 tweets | < 200ms | < 30ms | < 5ms | < 250ms |
| 10,000 tweets | < 500ms | < 60ms | < 10ms | < 600ms |

**Target**: All operations complete within Vercel timeout limits ✅

---

## Risk Mitigation

### 1. Vercel Timeouts

**Mitigation**:
- ✅ Use QStash for all long-running operations
- ✅ Chunk processing into < 30s units
- ✅ Implement checkpointing at each phase
- ✅ Allow job resumption on failure

### 2. OpenAI Rate Limits

**Mitigation**:
- ✅ Use `embedMany()` for batch processing (reduces API calls)
- ✅ Implement exponential backoff with jitter
- ✅ Fallback to keyword-based labels if AI fails
- ✅ Queue management with delays between batches

### 3. Memory Limitations

**Mitigation**:
- ✅ Stream large datasets from database
- ✅ Process in chunks (never load all at once)
- ✅ Clear intermediate results after each phase
- ✅ Use efficient data structures (typed arrays for embeddings)

### 4. Database Performance

**Mitigation**:
- ✅ Proper indexes on all query patterns
- ✅ Batch inserts (1000 rows at a time)
- ✅ Connection pooling
- ✅ Use Supabase's PostgREST for optimized queries

### 5. UI Performance

**Mitigation**:
- ✅ Canvas rendering instead of DOM elements
- ✅ QuadTree spatial indexing
- ✅ Request animation frame for smooth rendering
- ✅ Virtual scrolling for cluster lists
- ✅ Lazy loading of tweet details

---

## Open Questions

### 1. Incremental Re-clustering

**Question**: How should we handle new tweets after initial clustering?

**Options**:
a) Full re-clustering (current approach)
b) Incremental assignment (assign new tweets to existing clusters)
c) Trigger re-clustering when volume changes significantly (e.g., +20%)

**Recommendation**: Start with (a), implement (c) in future

### 2. Historical Clustering Versions

**Question**: Should we keep old projection versions or only keep the latest?

**Options**:
a) Keep all versions (time-travel debugging)
b) Keep only latest (simplicity, less storage)
c) Keep latest + last 3 versions (reasonable history)

**Recommendation**: Start with (b), implement (c) if users request it

### 3. 3D vs 2D Default

**Question**: Which should be the default view?

**Options**:
a) 2D (faster, more familiar)
b) 3D (more impressive, better separation)
c) Auto-detect based on cluster count

**Recommendation**: (a) with easy toggle

### 4. Real-time Updates

**Question**: Should the map update in real-time as new tweets arrive?

**Options**:
a) No real-time (user manually triggers re-clustering)
b) Auto re-cluster daily
c) Auto re-cluster when significant changes detected

**Recommendation**: (a) for MVP, (c) for V2.1

---

## Success Criteria

### Technical

- ✅ All operations complete within timeout limits (< 900s for Enterprise tier)
- ✅ Handle 10K+ tweets without errors
- ✅ UI rendering < 1s for 10K points
- ✅ Database queries < 100ms (95th percentile)
- ✅ Cost < $5/month per 10K-tweet zone

### User Experience

- ✅ Clear progress indication (% + phase description)
- ✅ Ability to cancel long-running jobs
- ✅ Smooth zoom/pan interactions (60 FPS)
- ✅ Hover feedback < 16ms (immediate)
- ✅ Cluster details load instantly
- ✅ Mobile-responsive (though desktop-optimized)

### Code Quality

- ✅ Modular architecture (reusable components)
- ✅ Strong TypeScript typing
- ✅ Unit test coverage > 80%
- ✅ Comprehensive error handling
- ✅ Detailed logging for debugging
- ✅ Documentation for all public APIs

---

## Next Steps

1. **Review & Approval**: Discuss this analysis with stakeholders
2. **Architecture Validation**: Confirm QStash + chunked processing approach
3. **Environment Setup**: Ensure OpenAI API keys and QStash configured
4. **Database Migrations**: Create and test schema changes
5. **Begin Implementation**: Start with Phase 1 (Database Schema)

---

## Appendix A: Technology Stack

### Core Technologies

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS 4, Shadcn UI components
- **Visualization**: D3.js (2D), Three.js / React Three Fiber (3D)
- **Database**: Supabase (PostgreSQL + pgvector)
- **Caching**: Upstash Redis
- **Background Jobs**: QStash (Upstash)
- **AI**: OpenAI (embeddings + GPT-4o-mini)
- **Deployment**: Vercel

### Libraries

**Dimensionality Reduction**:
- `ml-pca` - PCA implementation
- `umap-js` - UMAP algorithm

**Clustering**:
- `ml-kmeans` - K-means clustering
- Custom DBSCAN implementation

**Math & Data**:
- `mathjs` - Matrix operations
- `d3-array` - Array utilities

**Visualization**:
- `d3-selection`, `d3-zoom`, `d3-ease` - D3 modules
- `@react-three/fiber` - React Three.js renderer (optional for 3D)
- `@react-three/drei` - Three.js helpers (optional for 3D)

---

## Appendix B: V1 to V2 Mapping

| V1 Concept | V2 Implementation | Changes |
|------------|-------------------|---------|
| `tweet_embeddings` table | Use `twitter_tweets.embedding` | Consolidate into main table |
| `tweet_projections` table | `twitter_tweet_projections` | Rename, add FK to `twitter_tweets.id` |
| `opinion_clusters` table | `twitter_opinion_clusters` | Rename with twitter_ prefix |
| `clustering_jobs` table | `twitter_clustering_jobs` | Add more status fields |
| Vectorization queue | QStash webhook | Same approach, adapt to V2 |
| Single clustering endpoint | Multi-phase worker | Break into chunks |
| Client-side polling | Supabase Realtime | More efficient |
| Embedding via `ai.embed()` | Same (Vercel AI SDK) | Keep as-is ✅ |
| PCA via `ml-pca` | Same | Keep as-is ✅ |
| UMAP via `umap-js` | Same | Keep as-is ✅ |
| K-means custom impl | Same | Keep as-is ✅ |
| GPT-4o-mini labeling | Same | Keep as-is ✅ |
| 2D Canvas + D3.js | Same | Keep as-is ✅ |
| 3D WebGL | Enhance with R3F | Improve UX |

---

**End of Analysis Document**

Last Updated: November 18, 2025

