# Opinion Map V2 - Final Architecture

**Date**: November 18, 2025  
**Status**: Ready for Implementation  
**Decisions**: Based on stakeholder feedback

---

## Executive Summary

This document finalizes the architecture for Opinion Map V2 based on user requirements:

✅ **Smart sampling**: 10K tweets intelligently sampled across time periods  
✅ **On-demand embedding**: Vectorize only when clustering (cost-efficient)  
✅ **3D priority**: Focus on 3D visualization first  
✅ **Manual trigger**: No auto-clustering (user-initiated only)  
✅ **Version history**: Keep last 5 versions with snapshot capability  
✅ **Modular architecture**: Production-ready, scalable, follows best practices

---

## Core Decisions

### 1. Sampling Strategy

**Choice**: **Stratified Random Sampling** (MVP) → **Hybrid Sampling** (Phase 2)

**How it works**:
```
User selects:
- Sample size: 10,000 tweets
- Time period: "Last 7 days"

System:
1. Divides 7 days into 28 buckets (6h each)
2. Samples ~357 tweets per bucket
3. Within each bucket: 70% high-engagement, 30% diverse
4. Returns exactly 10,000 representative tweets
```

**Benefits**:
- ✅ Captures temporal patterns (time buckets)
- ✅ Prioritizes important content (engagement weighting)
- ✅ Maintains diversity (includes low-engagement tweets)
- ✅ Consistent output size (always 10K)

**Cost**: Negligible (sampling query < 1s even for 100K+ tweets)

---

### 2. Embedding Strategy

**Choice**: **On-Demand Batch Vectorization**

**When vectorization happens**:
```
User clicks "Generate Opinion Map"
  ↓
System samples 10K tweets
  ↓
Check which tweets lack embeddings
  ↓
Batch vectorize missing ones (100 per API call)
  ↓
Proceed to clustering
```

**Why**:
- ✅ Only vectorize analyzed tweets (95% cost savings)
- ✅ Simple implementation (no webhook changes)
- ✅ Embeddings cached for future use
- ✅ Controlled rate limits (batch processing)

**Cost**: $0.05 per 10K-tweet clustering (vs $1.50/month for real-time)

**Performance**: +1 minute for first clustering, instant for subsequent

---

### 3. Visualization Priority

**Choice**: **3D First**, then 2D

**3D Implementation**:
- React Three Fiber (R3F) for WebGL rendering
- Point cloud or instanced spheres for tweets
- Orbit controls for camera navigation
- Color-coded by cluster
- Interactive hover/click selection

**2D Implementation** (later):
- Reuse V1's Canvas + D3.js approach
- QuadTree optimization
- Fallback for low-end devices

**Why 3D first**:
- More visually impressive
- Better cluster separation
- Unique selling point
- Government clients expect cutting-edge

---

### 4. Trigger Strategy

**Choice**: **Manual Only** (no auto-clustering)

**User Flow**:
```tsx
<Button onClick={handleGenerate}>
  <Sparkles className="mr-2 h-4 w-4" />
  Generate Opinion Map
</Button>

// User sees progress
<Progress value={job.progress} />
<p>{job.phase_message}</p>

// Map stays in memory until manual refresh
// No background updates
```

**Why**:
- ✅ Cost control (no wasteful auto-clustering)
- ✅ User control (clustering when needed)
- ✅ Simpler architecture (no cron jobs)
- ✅ Faster initial implementation

**Future**: Can add opt-in auto-trigger per zone if requested

---

### 5. Versioning Strategy

**Choice**: **Limited History (5 versions)** + **Named Snapshots**

**How it works**:
```
Regular versions (auto-managed):
V5 (current) ← shown by default
V4 (1 day ago)
V3 (3 days ago)
V2 (7 days ago)
V1 (14 days ago)
[older deleted automatically]

Snapshots (user-saved):
S1 "Pre-Election Baseline" (30 days ago)
S2 "Day 1 Results" (29 days ago)
[kept forever or until manually deleted]
```

**Benefits**:
- ✅ Recent comparison available (5 versions)
- ✅ Important milestones preserved (snapshots)
- ✅ Predictable storage (50 MB per zone)
- ✅ No manual cleanup needed

**UI Features**:
- Version selector dropdown
- "Save as Snapshot" button
- Snapshot management dialog
- Side-by-side comparison view (Phase 2)

---

## Complete Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. USER INITIATES                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Configures & clicks "Generate"
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│              2. API ROUTE (/api/twitter/clustering/trigger)     │
│  - Validate user permissions                                    │
│  - Sample tweets (stratified + engagement-weighted)             │
│  - Create clustering_job record (status: 'pending')            │
│  - Schedule QStash worker                                       │
│  - Return job_id immediately (< 2s)                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ QStash triggers worker
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│     3. WORKER (/api/webhooks/qstash/clustering-worker)          │
│                                                                 │
│  Phase 0: Vectorization (if needed) [0-20% progress]           │
│  ├─ Check which sampled tweets lack embeddings                 │
│  ├─ Batch vectorize (100 tweets per OpenAI call)               │
│  ├─ Update twitter_tweets.embedding column                     │
│  └─ Progress: "Vectorized 500/1,200 tweets"                    │
│                                                                 │
│  Phase 1: PCA Reduction [20-40% progress]                      │
│  ├─ Fetch all embeddings for sampled tweets                    │
│  ├─ Run PCA (1536D → 20D) for clustering                       │
│  └─ Store 20D vectors in memory                                │
│                                                                 │
│  Phase 2: UMAP Projection [40-60% progress]                    │
│  ├─ Run UMAP on 1536D embeddings → 3D                          │
│  ├─ Normalize coordinates (0-100 range)                        │
│  └─ Batch insert to twitter_tweet_projections                  │
│                                                                 │
│  Phase 3: K-means Clustering [60-75% progress]                 │
│  ├─ Run K-means on 20D space (auto-detect k)                   │
│  ├─ Assign cluster_id to each projection                       │
│  └─ Update twitter_tweet_projections                           │
│                                                                 │
│  Phase 4: Cluster Labeling [75-100% progress]                  │
│  ├─ For each cluster, sample 50 representative tweets          │
│  ├─ Call GPT-4o-mini for label generation                      │
│  ├─ Calculate cluster centroids                                │
│  ├─ Save to twitter_opinion_clusters                           │
│  └─ Mark job as 'completed'                                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Supabase Realtime broadcasts updates
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                  4. UI UPDATES (Real-time)                      │
│  - Subscribe to clustering_jobs table changes                   │
│  - Display progress bar + current phase                         │
│  - Show estimated time remaining                                │
│  - Enable "View Results" when complete                          │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

#### Core Tables

**1. `twitter_tweets` (existing, reuse)**
```sql
-- Already has embedding columns:
embedding VECTOR(1536)
embedding_model TEXT
embedding_created_at TIMESTAMPTZ
```

**2. `twitter_tweet_projections` (NEW)**
```sql
CREATE TABLE twitter_tweet_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_db_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  projection_version TEXT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  z NUMERIC NOT NULL, -- 3D priority
  cluster_id INTEGER,
  cluster_confidence NUMERIC,
  is_outlier BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (tweet_db_id, projection_version)
);

CREATE INDEX idx_projections_zone_version 
ON twitter_tweet_projections (zone_id, projection_version);

CREATE INDEX idx_projections_cluster 
ON twitter_tweet_projections (cluster_id) 
WHERE cluster_id IS NOT NULL;
```

**3. `twitter_opinion_clusters` (NEW)**
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
  centroid_z NUMERIC NOT NULL, -- 3D
  avg_sentiment NUMERIC,
  coherence_score NUMERIC,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (zone_id, projection_version, cluster_id)
);

CREATE INDEX idx_clusters_zone_version 
ON twitter_opinion_clusters (zone_id, projection_version);
```

**4. `twitter_clustering_jobs` (NEW)**
```sql
CREATE TABLE twitter_clustering_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  projection_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'vectorizing', 'reducing', 'clustering', 
    'labeling', 'completed', 'failed', 'cancelled'
  )),
  progress INTEGER DEFAULT 0,
  current_phase TEXT,
  phase_message TEXT,
  
  -- Configuration
  config JSONB DEFAULT '{}'::JSONB, -- Stores sampling params, etc.
  
  -- Snapshot support
  is_snapshot BOOLEAN DEFAULT FALSE,
  snapshot_name TEXT,
  snapshot_description TEXT,
  snapshot_saved_at TIMESTAMPTZ,
  snapshot_saved_by UUID REFERENCES auth.users(id),
  
  -- Statistics
  total_tweets INTEGER,
  vectorized_tweets INTEGER DEFAULT 0,
  total_clusters INTEGER,
  outlier_count INTEGER,
  execution_time_ms INTEGER,
  
  -- Error handling
  error_message TEXT,
  error_stack TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE (zone_id, projection_version)
);

CREATE INDEX idx_jobs_zone_recent 
ON twitter_clustering_jobs (zone_id, created_at DESC);

CREATE INDEX idx_jobs_active 
ON twitter_clustering_jobs (status) 
WHERE status IN ('pending', 'vectorizing', 'reducing', 'clustering', 'labeling');

CREATE INDEX idx_jobs_snapshots 
ON twitter_clustering_jobs (zone_id, is_snapshot, created_at DESC) 
WHERE is_snapshot = TRUE;
```

### Module Structure

```
/lib/data/twitter/opinion-map/
  ├── sampling.ts          # Tweet sampling strategies
  ├── vectorization.ts     # Embedding generation
  ├── dimensionality.ts    # PCA + UMAP reduction
  ├── clustering.ts        # K-means clustering
  ├── labeling.ts          # AI cluster labeling
  ├── projections.ts       # CRUD for projections
  ├── clusters.ts          # CRUD for clusters
  ├── jobs.ts              # Job management
  └── index.ts             # Exports

/app/api/twitter/clustering/
  ├── trigger/route.ts     # POST - Start clustering
  ├── cancel/route.ts      # POST - Cancel job
  └── status/route.ts      # GET - Job status

/app/api/webhooks/qstash/
  └── clustering-worker/route.ts  # QStash worker endpoint

/components/dashboard/zones/twitter/
  ├── twitter-opinion-map-view.tsx         # Main container
  ├── twitter-opinion-map-3d.tsx           # 3D visualization (R3F)
  ├── twitter-opinion-map-controls.tsx     # Config panel
  ├── twitter-opinion-map-sidebar.tsx      # Cluster list + details
  ├── twitter-opinion-map-skeleton.tsx     # Loading state
  ├── twitter-opinion-map-empty-state.tsx  # No data state
  └── twitter-cluster-card.tsx             # Cluster detail card
```

---

## API Endpoints

### 1. Trigger Clustering

**Endpoint**: `POST /api/twitter/clustering/trigger`

**Request**:
```typescript
{
  zone_id: string
  config: {
    sample_size: number // 10000
    start_date: string // ISO 8601
    end_date: string   // ISO 8601
    enable_3d: boolean // true
    sampling_strategy: 'stratified' | 'hybrid'
  }
}
```

**Response**:
```typescript
{
  success: boolean
  job_id: string
  projection_version: string
  estimated_time_seconds: number
}
```

**Implementation**:
```typescript
export async function POST(request: Request) {
  const { zone_id, config } = await request.json()
  
  // 1. Validate permissions
  const user = await getCurrentUser()
  const hasAccess = await canAccessZone(user, zone_id)
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403
    })
  }
  
  // 2. Sample tweets
  const samples = await sampleTweetsStratified({
    zoneId: zone_id,
    startDate: new Date(config.start_date),
    endDate: new Date(config.end_date),
    targetSampleSize: config.sample_size,
    buckets: calculateBuckets(config.start_date, config.end_date)
  })
  
  if (samples.length === 0) {
    return new Response(JSON.stringify({ 
      error: 'No tweets found in selected period' 
    }), { status: 400 })
  }
  
  // 3. Create job
  const projectionVersion = generateVersion() // "2025-11-18_14:30:00"
  const { data: job } = await supabase
    .from('twitter_clustering_jobs')
    .insert({
      zone_id,
      projection_version: projectionVersion,
      status: 'pending',
      config: {
        ...config,
        sampled_tweet_ids: samples.map(t => t.id),
        actual_sample_size: samples.length
      },
      total_tweets: samples.length,
      created_by: user.id
    })
    .select()
    .single()
  
  // 4. Schedule worker
  await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/qstash/clustering-worker`,
    body: { job_id: job.id },
    retries: 3
  })
  
  // 5. Return immediately
  return new Response(JSON.stringify({
    success: true,
    job_id: job.id,
    projection_version: projectionVersion,
    estimated_time_seconds: estimateProcessingTime(samples.length)
  }))
}
```

### 2. Get Job Status

**Endpoint**: `GET /api/twitter/clustering/status?job_id={id}`

**Response**:
```typescript
{
  success: boolean
  job: {
    id: string
    status: string
    progress: number
    phase_message: string
    total_tweets: number
    total_clusters: number
    error_message: string | null
    started_at: string
    completed_at: string | null
    execution_time_ms: number | null
  }
}
```

### 3. Cancel Job

**Endpoint**: `POST /api/twitter/clustering/cancel`

**Request**:
```typescript
{
  job_id: string
}
```

**Response**:
```typescript
{
  success: boolean
  message: string
}
```

---

## UI Components

### Main Container

```tsx
// /app/dashboard/zones/[zoneId]/analysis/page.tsx

export default async function AnalysisPage({ params, searchParams }) {
  const { zoneId } = await params
  const zone = await getZoneById(zoneId)
  
  if (!zone) notFound()
  
  return (
    <div className="animate-in">
      <ZonePageHeader zone={zone} title="Analysis" />
      
      <Tabs defaultValue="opinion-map">
        <TabsList>
          <TabsTrigger value="opinion-map">Opinion Map</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="opinion-map">
          <TwitterOpinionMapView zoneId={zoneId} />
        </TabsContent>
        
        {/* Other tabs... */}
      </Tabs>
    </div>
  )
}
```

### Opinion Map View

```tsx
'use client'

export function TwitterOpinionMapView({ zoneId }: { zoneId: string }) {
  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<ClusteringJob | null>(null)
  const [projections, setProjections] = useState<Projection[]>([])
  const [clusters, setClusters] = useState<OpinionCluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null)
  
  // Config state
  const [sampleSize, setSampleSize] = useState(10000)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('24h')
  const [dateRange, setDateRange] = useState<DateRange>()
  
  // Subscribe to job updates via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`clustering_${zoneId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'twitter_clustering_jobs',
        filter: `zone_id=eq.${zoneId}`
      }, (payload) => {
        const updatedJob = payload.new as ClusteringJob
        setJob(updatedJob)
        
        if (updatedJob.status === 'completed') {
          loadResults(updatedJob.projection_version)
        }
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [zoneId])
  
  // Load existing results
  useEffect(() => {
    loadLatestResults()
  }, [zoneId])
  
  const handleGenerate = async () => {
    const { from, to } = calculateDateRange(timePeriod, dateRange)
    
    const result = await fetch('/api/twitter/clustering/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zone_id: zoneId,
        config: {
          sample_size: sampleSize,
          start_date: from.toISOString(),
          end_date: to.toISOString(),
          enable_3d: true,
          sampling_strategy: 'stratified'
        }
      })
    })
    
    const data = await result.json()
    
    if (data.success) {
      setJob({ 
        id: data.job_id, 
        status: 'pending', 
        progress: 0 
      } as ClusteringJob)
      
      toast.success('Clustering started! This will take a few minutes.')
    }
  }
  
  if (loading) return <OpinionMapSkeleton />
  
  if (!projections.length && !job) {
    return (
      <EmptyState 
        onGenerate={handleGenerate}
        sampleSize={sampleSize}
        onSampleSizeChange={setSampleSize}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
      />
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Opinion Map</CardTitle>
              <CardDescription>
                {job?.status === 'completed' ? (
                  `${projections.length} tweets · ${clusters.length} clusters`
                ) : job ? (
                  <div className="flex items-center gap-2">
                    <Progress value={job.progress} className="w-32" />
                    <span>{job.phase_message}</span>
                  </div>
                ) : null}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <VersionSelector zoneId={zoneId} />
              
              <Button 
                onClick={handleGenerate} 
                disabled={job?.status !== 'completed'}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <OpinionMap3D
            projections={projections}
            clusters={clusters}
            selectedCluster={selectedCluster}
            onSelectCluster={setSelectedCluster}
          />
        </div>
        
        <div>
          <OpinionMapSidebar
            clusters={clusters}
            selectedCluster={selectedCluster}
            onSelectCluster={setSelectedCluster}
          />
        </div>
      </div>
    </div>
  )
}
```

### 3D Visualization

```tsx
'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Points, PointMaterial } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

interface OpinionMap3DProps {
  projections: Projection[]
  clusters: OpinionCluster[]
  selectedCluster: number | null
  onSelectCluster: (clusterId: number | null) => void
}

export function OpinionMap3D({
  projections,
  clusters,
  selectedCluster,
  onSelectCluster
}: OpinionMap3DProps) {
  // Convert projections to point cloud
  const points = useMemo(() => {
    const positions = new Float32Array(projections.length * 3)
    const colors = new Float32Array(projections.length * 3)
    
    projections.forEach((proj, i) => {
      // Position
      positions[i * 3] = proj.x
      positions[i * 3 + 1] = proj.y
      positions[i * 3 + 2] = proj.z
      
      // Color based on cluster
      const cluster = clusters.find(c => c.cluster_id === proj.cluster_id)
      const color = cluster ? getClusterColor(cluster.cluster_id) : '#999999'
      const rgb = new THREE.Color(color)
      
      colors[i * 3] = rgb.r
      colors[i * 3 + 1] = rgb.g
      colors[i * 3 + 2] = rgb.b
    })
    
    return { positions, colors }
  }, [projections, clusters])
  
  return (
    <Card className="h-[600px] overflow-hidden">
      <Canvas>
        <PerspectiveCamera makeDefault position={[50, 50, 100]} />
        <OrbitControls enableDamping />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        
        {/* Point cloud */}
        <Points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={projections.length}
              array={points.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={projections.length}
              array={points.colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={2} vertexColors sizeAttenuation />
        </Points>
        
        {/* Cluster centroids */}
        {clusters.map(cluster => (
          <mesh
            key={cluster.cluster_id}
            position={[cluster.centroid_x, cluster.centroid_y, cluster.centroid_z]}
            onClick={() => onSelectCluster(cluster.cluster_id)}
          >
            <sphereGeometry args={[3, 16, 16]} />
            <meshStandardMaterial 
              color={getClusterColor(cluster.cluster_id)}
              opacity={selectedCluster === cluster.cluster_id ? 1 : 0.6}
              transparent
            />
          </mesh>
        ))}
        
        {/* Grid helper */}
        <gridHelper args={[100, 10]} />
      </Canvas>
    </Card>
  )
}
```

---

## Performance Targets

### Clustering Pipeline

| Phase | Time | Details |
|-------|------|---------|
| Phase 0: Vectorization | 0-60s | 0s if cached, 60s if 1000 new tweets |
| Phase 1: PCA | 10-20s | Reduce 1536D → 20D |
| Phase 2: UMAP 3D | 60-120s | Most intensive step |
| Phase 3: K-means | 5-10s | Cluster in 20D space |
| Phase 4: Labeling | 30-60s | GPT-4o-mini calls |
| **Total** | **2-4 min** | For 10K tweets |

### Storage

| Item | Size per Zone | 100 Zones Total |
|------|---------------|-----------------|
| Embeddings | Variable | ~6 GB |
| Projections (5 versions) | 6.5 MB | 650 MB |
| Clusters (5 versions) | 25 KB | 2.5 MB |
| Jobs | 10 KB | 1 MB |
| **Total** | ~6.5 MB | **~6.7 GB** |

**Well within Supabase Pro 8 GB limit** ✅

### Costs

**Per 10K-tweet clustering**:
- Vectorization: $0.05 (if not cached)
- Labeling: < $0.01
- **Total: ~$0.06 per clustering**

**Monthly estimate** (100 zones, 4 clusterings each):
- 400 clusterings × $0.06 = **$24/month**
- Infrastructure (Vercel + Supabase): $47/month
- **Total: ~$71/month**

---

## Implementation Roadmap

### Week 1: Database & Sampling
- [ ] Create SQL migrations for 3 new tables
- [ ] Implement stratified sampling function
- [ ] Write sampling tests
- [ ] Document schema in DATABASE_SCHEMA.md

### Week 2: Vectorization & Dimensionality
- [ ] Implement on-demand vectorization module
- [ ] Integrate PCA reduction
- [ ] Integrate UMAP 3D projection
- [ ] Write unit tests

### Week 3: Clustering & Labeling
- [ ] Implement K-means clustering
- [ ] Integrate AI labeling with retry logic
- [ ] Create QStash worker endpoint
- [ ] Test full pipeline

### Week 4: UI Components
- [ ] Create main container component
- [ ] Implement 3D visualization with R3F
- [ ] Build controls panel
- [ ] Create sidebar with cluster list
- [ ] Add version selector
- [ ] Implement Realtime progress tracking

### Week 5: Testing & Polish
- [ ] End-to-end testing (100, 1K, 10K tweets)
- [ ] Performance optimization
- [ ] Error handling refinement
- [ ] User acceptance testing
- [ ] Documentation

---

## Success Criteria

✅ **Performance**: Full pipeline < 5 min for 10K tweets  
✅ **Reliability**: 95%+ success rate  
✅ **Cost**: < $0.10 per clustering  
✅ **UX**: Smooth 3D visualization (60 FPS)  
✅ **Storage**: < 10 MB per zone per version  
✅ **Scalability**: Works with 100+ active zones

---

## Next Steps

1. **Review this document** with stakeholders
2. **Approve architecture** and proceed to implementation
3. **Set up development environment**:
   - OpenAI API key
   - QStash configuration
   - Supabase access
4. **Create GitHub issues** for each week's tasks
5. **Begin Week 1**: Database migrations

---

**Architecture Status**: ✅ **READY FOR IMPLEMENTATION**

**Estimated Timeline**: 5 weeks to MVP  
**Estimated Cost**: $71/month for 100 zones  
**Risk Level**: 🟢 LOW (proven technologies, clear requirements)


