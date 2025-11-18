# Opinion Map Versioning & Evolution Tracking

**Date**: November 18, 2025  
**Context**: Tracking opinion evolution over time

---

## The Vision

**Operational Need**: Understand how public opinion shifts over time

**Use Cases**:
1. **Crisis monitoring**: Track opinion polarization during events
2. **Campaign effectiveness**: Measure narrative shifts after interventions
3. **Trend detection**: Identify emerging vs declining topics
4. **Historical analysis**: Compare current sentiment to past periods

---

## Versioning Strategies

### Strategy 1: Single Active Version (MVP - Simplest)

**Concept**: Keep only the most recent clustering

```typescript
interface ClusteringJob {
  projection_version: string // "2025-11-18_14:30:00"
  // When new clustering starts, old projections are deleted
}
```

**Lifecycle**:
```
User generates map → Version A created
  ↓
User generates new map → Version A DELETED, Version B created
  ↓
Only Version B exists
```

**Implementation**:
```typescript
async function generateNewClustering(zoneId: string) {
  // Delete old projections
  await supabase
    .from('twitter_tweet_projections')
    .delete()
    .eq('zone_id', zoneId)
  
  // Delete old clusters
  await supabase
    .from('twitter_opinion_clusters')
    .delete()
    .eq('zone_id', zoneId)
  
  // Create new version
  const version = generateVersion() // "2025-11-18_14:30:00"
  await createClustering(zoneId, version)
}
```

**Pros**:
✅ **Simplest** implementation  
✅ **Minimal storage** (only current state)  
✅ **No versioning complexity**  
✅ **Fast queries** (no version filtering)

**Cons**:
❌ **No history** - Can't compare to past  
❌ **Lost data** - Old analyses gone forever  
❌ **Can't undo** bad clustering  

**Storage**: ~10 MB per zone (10K projections + clusters)

---

### Strategy 2: Limited History (Recommended)

**Concept**: Keep last N versions (e.g., 5 most recent)

```typescript
interface ClusteringVersioning {
  keep_last: 5 // Configurable per zone
  auto_delete_old: true
}
```

**Lifecycle**:
```
V1 created (oldest)
V2 created
V3 created
V4 created
V5 created
V6 created → V1 DELETED (exceeded limit)
V7 created → V2 DELETED
```

**Implementation**:
```typescript
async function generateNewClustering(zoneId: string) {
  const MAX_VERSIONS = 5
  
  // Get existing versions
  const { data: existingVersions } = await supabase
    .from('twitter_clustering_jobs')
    .select('projection_version, created_at')
    .eq('zone_id', zoneId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
  
  // If we have max versions, delete oldest
  if (existingVersions && existingVersions.length >= MAX_VERSIONS) {
    const versionsToDelete = existingVersions
      .slice(MAX_VERSIONS - 1) // Keep newest MAX_VERSIONS - 1
      .map(v => v.projection_version)
    
    // Delete old projections
    await supabase
      .from('twitter_tweet_projections')
      .delete()
      .eq('zone_id', zoneId)
      .in('projection_version', versionsToDelete)
    
    // Delete old clusters
    await supabase
      .from('twitter_opinion_clusters')
      .delete()
      .eq('zone_id', zoneId)
      .in('projection_version', versionsToDelete)
    
    // Delete old jobs
    await supabase
      .from('twitter_clustering_jobs')
      .delete()
      .eq('zone_id', zoneId)
      .in('projection_version', versionsToDelete)
  }
  
  // Create new version
  const version = generateVersion()
  await createClustering(zoneId, version)
}
```

**Pros**:
✅ **Recent history** available (last 5 analyses)  
✅ **Reasonable storage** (5× baseline)  
✅ **Can compare** recent periods  
✅ **Can undo** to previous version  
✅ **Auto-cleanup** (no manual management)

**Cons**:
❌ **Limited timespan** (depends on clustering frequency)  
❌ **Arbitrary cutoff** (why 5 and not 10?)  
❌ **Can't see** long-term evolution

**Storage**: ~50 MB per zone (5 × 10 MB)

---

### Strategy 3: Time-Based Retention (Smart)

**Concept**: Keep versions based on age and importance

**Retention Rules**:
```typescript
interface RetentionPolicy {
  // Keep ALL versions < 7 days old
  recent_days: 7,
  
  // Keep 1 per week for 7-30 days old
  weekly_retention_days: 30,
  
  // Keep 1 per month for 30-90 days old
  monthly_retention_days: 90,
  
  // Delete > 90 days old
  max_age_days: 90,
}
```

**Example Timeline**:
```
Today: V10 (keep)
Yesterday: V9 (keep)
2 days ago: V8 (keep)
3 days ago: V7 (keep)
7 days ago: V6 (keep - weekly marker)
14 days ago: V5 (DELETED - not weekly marker)
21 days ago: V4 (keep - weekly marker)
30 days ago: V3 (keep - monthly marker)
60 days ago: V2 (keep - monthly marker)
90 days ago: V1 (DELETED - too old)
```

**Implementation**:
```typescript
async function applyRetentionPolicy(zoneId: string) {
  const now = new Date()
  const policy: RetentionPolicy = {
    recent_days: 7,
    weekly_retention_days: 30,
    monthly_retention_days: 90,
    max_age_days: 90,
  }
  
  // Get all versions
  const { data: versions } = await supabase
    .from('twitter_clustering_jobs')
    .select('id, projection_version, created_at')
    .eq('zone_id', zoneId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
  
  if (!versions) return
  
  const versionsToKeep = new Set<string>()
  const versionsByWeek = new Map<string, string>() // week -> version
  const versionsByMonth = new Map<string, string>() // month -> version
  
  for (const version of versions) {
    const age = differenceInDays(now, new Date(version.created_at))
    
    // Keep recent
    if (age <= policy.recent_days) {
      versionsToKeep.add(version.projection_version)
      continue
    }
    
    // Keep weekly markers
    if (age <= policy.weekly_retention_days) {
      const weekKey = startOfWeek(new Date(version.created_at)).toISOString()
      if (!versionsByWeek.has(weekKey)) {
        versionsByWeek.set(weekKey, version.projection_version)
        versionsToKeep.add(version.projection_version)
      }
      continue
    }
    
    // Keep monthly markers
    if (age <= policy.monthly_retention_days) {
      const monthKey = startOfMonth(new Date(version.created_at)).toISOString()
      if (!versionsByMonth.has(monthKey)) {
        versionsByMonth.set(monthKey, version.projection_version)
        versionsToKeep.add(version.projection_version)
      }
      continue
    }
    
    // Delete if too old
  }
  
  // Delete versions not in keep set
  const versionsToDelete = versions
    .filter(v => !versionsToKeep.has(v.projection_version))
    .map(v => v.projection_version)
  
  if (versionsToDelete.length > 0) {
    await deleteVersions(zoneId, versionsToDelete)
    
    console.log(`[Retention] Deleted ${versionsToDelete.length} old versions`, {
      zoneId,
      kept: versionsToKeep.size,
      deleted: versionsToDelete.length,
    })
  }
}
```

**Pros**:
✅ **Intelligent retention** (recent + milestones)  
✅ **Long-term view** (3 months)  
✅ **Predictable storage** (known max size)  
✅ **Flexible** (policy per zone)  
✅ **Best for time-series analysis**

**Cons**:
❌ **Complex logic** (weekly/monthly bucketing)  
❌ **Higher storage** (more versions kept)  
❌ **Requires cron** (cleanup job)

**Storage**: ~150 MB per zone (estimated 15 versions)

---

### Strategy 4: Named Snapshots (Manual Control)

**Concept**: Users explicitly save important versions

```typescript
interface ClusteringVersion {
  projection_version: string
  is_snapshot: boolean // User-saved
  snapshot_name?: string // "Pre-Election Analysis"
  auto_delete: boolean // false for snapshots
}
```

**UI**:
```tsx
<Button onClick={() => saveSnapshot('Important milestone')}>
  <Bookmark className="h-4 w-4 mr-2" />
  Save as Snapshot
</Button>

<Dialog>
  <DialogTitle>Save Snapshot</DialogTitle>
  <Input 
    placeholder="Pre-Election Baseline" 
    value={snapshotName}
    onChange={e => setSnapshotName(e.target.value)}
  />
  <Button onClick={handleSaveSnapshot}>Save</Button>
</Dialog>
```

**Lifecycle**:
```
V1 (regular) - auto-deleted after 7 days
V2 (SNAPSHOT: "Pre-Election") - KEPT FOREVER
V3 (regular) - auto-deleted
V4 (regular) - auto-deleted
V5 (SNAPSHOT: "Day 1 Results") - KEPT FOREVER
```

**Implementation**:
```typescript
async function saveSnapshot(
  zoneId: string,
  projectionVersion: string,
  snapshotName: string
) {
  await supabase
    .from('twitter_clustering_jobs')
    .update({
      is_snapshot: true,
      snapshot_name: snapshotName,
      snapshot_saved_at: new Date().toISOString(),
    })
    .eq('zone_id', zoneId)
    .eq('projection_version', projectionVersion)
  
  toast.success(`Snapshot "${snapshotName}" saved`)
}

// Modified retention policy
async function applyRetentionPolicy(zoneId: string) {
  // Get non-snapshot versions only
  const { data: versions } = await supabase
    .from('twitter_clustering_jobs')
    .select('*')
    .eq('zone_id', zoneId)
    .eq('is_snapshot', false) // EXCLUDE snapshots from cleanup
    .order('created_at', { ascending: false })
  
  // Apply retention rules...
}
```

**Pros**:
✅ **User control** (save what matters)  
✅ **Infinite retention** for important analyses  
✅ **Named/searchable** (meaningful labels)  
✅ **Best for event tracking**  
✅ **Clear intent** (manual vs automatic)

**Cons**:
❌ **Unpredictable storage** (depends on user behavior)  
❌ **Potential bloat** (forgotten snapshots)  
❌ **Needs UI** for snapshot management

**Storage**: Variable (depends on snapshot frequency)

---

## Opinion Evolution Tracking

### Feature: Cluster Evolution Over Time

**Concept**: Track how clusters change between versions

```typescript
interface ClusterEvolution {
  cluster_id_old: number
  cluster_id_new: number
  version_old: string
  version_new: string
  similarity_score: number // 0-1 (how similar)
  evolution_type: 'stable' | 'grew' | 'shrunk' | 'merged' | 'split' | 'new' | 'disappeared'
  tweet_count_delta: number
  keyword_overlap: string[]
  keyword_new: string[]
  keyword_lost: string[]
}
```

**Algorithm**:
```typescript
async function analyzeClusterEvolution(
  zoneId: string,
  oldVersion: string,
  newVersion: string
) {
  // Get clusters from both versions
  const oldClusters = await getClusters(zoneId, oldVersion)
  const newClusters = await getClusters(zoneId, newVersion)
  
  const evolutions: ClusterEvolution[] = []
  
  // Match clusters by similarity
  for (const newCluster of newClusters) {
    let bestMatch: OpinionCluster | null = null
    let bestSimilarity = 0
    
    for (const oldCluster of oldClusters) {
      // Calculate similarity based on:
      // 1. Keyword overlap
      // 2. Centroid distance
      // 3. Tweet overlap (if same period)
      
      const keywordSimilarity = calculateKeywordSimilarity(
        oldCluster.keywords,
        newCluster.keywords
      )
      
      const centroidDistance = euclideanDistance(
        [oldCluster.centroid_x, oldCluster.centroid_y],
        [newCluster.centroid_x, newCluster.centroid_y]
      )
      
      // Normalize to 0-1 (lower distance = higher similarity)
      const centroidSimilarity = 1 - (centroidDistance / 100)
      
      // Combined score (70% keywords, 30% position)
      const similarity = (keywordSimilarity * 0.7) + (centroidSimilarity * 0.3)
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity
        bestMatch = oldCluster
      }
    }
    
    // Determine evolution type
    let evolutionType: ClusterEvolution['evolution_type']
    
    if (!bestMatch || bestSimilarity < 0.3) {
      evolutionType = 'new' // New topic emerged
    } else {
      const sizeChange = newCluster.tweet_count - bestMatch.tweet_count
      const sizeChangePct = sizeChange / bestMatch.tweet_count
      
      if (Math.abs(sizeChangePct) < 0.2) {
        evolutionType = 'stable'
      } else if (sizeChangePct > 0) {
        evolutionType = 'grew'
      } else {
        evolutionType = 'shrunk'
      }
    }
    
    evolutions.push({
      cluster_id_old: bestMatch?.cluster_id ?? -1,
      cluster_id_new: newCluster.cluster_id,
      version_old: oldVersion,
      version_new: newVersion,
      similarity_score: bestSimilarity,
      evolution_type: evolutionType,
      tweet_count_delta: newCluster.tweet_count - (bestMatch?.tweet_count ?? 0),
      keyword_overlap: bestMatch 
        ? intersection(bestMatch.keywords, newCluster.keywords)
        : [],
      keyword_new: bestMatch
        ? difference(newCluster.keywords, bestMatch.keywords)
        : newCluster.keywords,
      keyword_lost: bestMatch
        ? difference(bestMatch.keywords, newCluster.keywords)
        : [],
    })
  }
  
  // Find disappeared clusters
  for (const oldCluster of oldClusters) {
    const stillExists = evolutions.some(
      e => e.cluster_id_old === oldCluster.cluster_id && e.similarity_score > 0.3
    )
    
    if (!stillExists) {
      evolutions.push({
        cluster_id_old: oldCluster.cluster_id,
        cluster_id_new: -1,
        version_old: oldVersion,
        version_new: newVersion,
        similarity_score: 0,
        evolution_type: 'disappeared',
        tweet_count_delta: -oldCluster.tweet_count,
        keyword_overlap: [],
        keyword_new: [],
        keyword_lost: oldCluster.keywords,
      })
    }
  }
  
  return evolutions
}
```

### UI: Evolution Timeline

```tsx
<Card>
  <CardHeader>
    <CardTitle>Opinion Evolution</CardTitle>
    <CardDescription>
      Compare clusters across time to track opinion shifts
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Version Selector */}
    <div className="flex items-center gap-2 mb-6">
      <Select value={versionA} onValueChange={setVersionA}>
        {versions.map(v => (
          <SelectItem key={v.projection_version} value={v.projection_version}>
            {formatDate(v.created_at)} - {v.config.sample_size} tweets
          </SelectItem>
        ))}
      </Select>
      
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
      
      <Select value={versionB} onValueChange={setVersionB}>
        {versions.map(v => (
          <SelectItem key={v.projection_version} value={v.projection_version}>
            {formatDate(v.created_at)} - {v.config.sample_size} tweets
          </SelectItem>
        ))}
      </Select>
      
      <Button onClick={handleCompare} disabled={isLoading}>
        Compare
      </Button>
    </div>
    
    {/* Evolution Summary */}
    {evolution && (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Stable"
          value={evolution.filter(e => e.evolution_type === 'stable').length}
          icon={Minus}
          color="blue"
        />
        <StatCard
          label="Grew"
          value={evolution.filter(e => e.evolution_type === 'grew').length}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Shrunk"
          value={evolution.filter(e => e.evolution_type === 'shrunk').length}
          icon={TrendingDown}
          color="orange"
        />
        <StatCard
          label="New"
          value={evolution.filter(e => e.evolution_type === 'new').length}
          icon={Plus}
          color="purple"
        />
        <StatCard
          label="Disappeared"
          value={evolution.filter(e => e.evolution_type === 'disappeared').length}
          icon={X}
          color="red"
        />
      </div>
    )}
    
    {/* Evolution Details */}
    <div className="space-y-3">
      {evolution?.map((evo, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getEvolutionBadgeVariant(evo.evolution_type)}>
                  {evo.evolution_type}
                </Badge>
                <span className="font-medium">
                  {evo.cluster_id_old !== -1 && `Cluster ${evo.cluster_id_old} → `}
                  {evo.cluster_id_new !== -1 ? `Cluster ${evo.cluster_id_new}` : 'Disappeared'}
                </span>
              </div>
              
              {/* Keywords */}
              <div className="space-y-1 text-sm">
                {evo.keyword_overlap.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Common:</span>
                    <div className="flex flex-wrap gap-1">
                      {evo.keyword_overlap.map(kw => (
                        <Badge key={kw} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {evo.keyword_new.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">New:</span>
                    <div className="flex flex-wrap gap-1">
                      {evo.keyword_new.map(kw => (
                        <Badge key={kw} variant="outline" className="text-xs border-green-600">
                          +{kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {evo.keyword_lost.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-red-600">Lost:</span>
                    <div className="flex flex-wrap gap-1">
                      {evo.keyword_lost.map(kw => (
                        <Badge key={kw} variant="outline" className="text-xs border-red-600">
                          -{kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Size Change */}
            <div className="text-right">
              <div className="text-2xl font-bold">
                {evo.tweet_count_delta > 0 && '+'}
                {evo.tweet_count_delta}
              </div>
              <div className="text-xs text-muted-foreground">tweets</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </CardContent>
</Card>
```

### Feature: Opinion Trend Chart

**Concept**: Track cluster size over time

```tsx
<Card>
  <CardHeader>
    <CardTitle>Opinion Trends</CardTitle>
    <CardDescription>
      Track cluster growth/decline over time
    </CardDescription>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={trendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        
        {clusters.map((cluster, i) => (
          <Line
            key={cluster.cluster_id}
            type="monotone"
            dataKey={`cluster_${cluster.cluster_id}`}
            stroke={CLUSTER_COLORS[i]}
            name={cluster.label}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

**Data Structure**:
```typescript
interface TrendData {
  date: string // "2025-11-15"
  cluster_0: number // Tweet count
  cluster_1: number
  cluster_2: number
  // ... for each cluster
}
```

---

## Recommended Strategy

### Phase 1 (MVP): **Strategy 2 - Limited History (5 versions)**

**Rationale**:
- Simple to implement
- Provides recent comparison capability
- Predictable storage (~50 MB per zone)
- No cron jobs needed (cleanup on new clustering)

**Implementation**:
```typescript
const RETENTION_POLICY = {
  max_versions: 5,
  cleanup_on_new: true,
}
```

### Phase 2 (Enhancement): **Add Named Snapshots**

**When**: After MVP stable (~4 weeks later)

**Why**: 
- Users can save important milestones
- Enables event-based analysis
- Still automatic cleanup for regular versions

**Implementation**:
```typescript
const RETENTION_POLICY = {
  max_versions: 5, // Regular versions
  snapshots: 'unlimited', // User-saved
  snapshot_max_age_days: 365, // Optional limit
}
```

### Phase 3 (Advanced): **Add Evolution Tracking**

**When**: If users request it (~8 weeks later)

**Features**:
- Cluster matching algorithm
- Evolution timeline UI
- Trend charts

---

## Storage Estimates

### Baseline (Single Version)

```
10,000 projections × 120 bytes = 1.2 MB
10 clusters × 500 bytes = 5 KB
1 job record × 500 bytes = 500 bytes
Total: ~1.3 MB per version
```

### With 5 Versions

```
1.3 MB × 5 = 6.5 MB per zone
```

### With 100 Active Zones

```
6.5 MB × 100 = 650 MB total
Well within Supabase Pro 8GB limit ✅
```

### With Snapshots (Worst Case)

```
10 snapshots per zone × 100 zones = 1,000 snapshots
1.3 MB × 1,000 = 1.3 GB
Still comfortable ✅
```

---

## Database Schema Updates

### Add Snapshot Support

```sql
ALTER TABLE twitter_clustering_jobs
ADD COLUMN is_snapshot BOOLEAN DEFAULT FALSE,
ADD COLUMN snapshot_name TEXT,
ADD COLUMN snapshot_description TEXT,
ADD COLUMN snapshot_saved_at TIMESTAMPTZ,
ADD COLUMN snapshot_saved_by UUID REFERENCES auth.users(id);

-- Index for listing snapshots
CREATE INDEX idx_clustering_jobs_snapshots
ON twitter_clustering_jobs (zone_id, is_snapshot, created_at DESC)
WHERE is_snapshot = TRUE;

-- Index for cleanup (exclude snapshots)
CREATE INDEX idx_clustering_jobs_auto_delete
ON twitter_clustering_jobs (zone_id, created_at)
WHERE is_snapshot = FALSE;
```

### Evolution Tracking Table (Phase 3)

```sql
CREATE TABLE twitter_cluster_evolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  version_old TEXT NOT NULL,
  version_new TEXT NOT NULL,
  cluster_id_old INTEGER,
  cluster_id_new INTEGER,
  similarity_score NUMERIC CHECK (similarity_score >= 0 AND similarity_score <= 1),
  evolution_type TEXT CHECK (evolution_type IN ('stable', 'grew', 'shrunk', 'merged', 'split', 'new', 'disappeared')),
  tweet_count_delta INTEGER,
  keyword_overlap TEXT[],
  keyword_new TEXT[],
  keyword_lost TEXT[],
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (zone_id, version_old, version_new, cluster_id_old, cluster_id_new)
);

CREATE INDEX idx_cluster_evolutions_zone
ON twitter_cluster_evolutions (zone_id, version_new DESC);
```

---

## UI Components

### Version Selector

```tsx
<Select value={selectedVersion} onValueChange={setSelectedVersion}>
  {/* Current Version */}
  <SelectItem value={currentVersion.projection_version}>
    <div className="flex items-center gap-2">
      <Star className="h-3 w-3 text-primary" />
      <span className="font-medium">Current</span>
      <span className="text-muted-foreground">
        ({formatDate(currentVersion.created_at)})
      </span>
    </div>
  </SelectItem>
  
  {/* Snapshots */}
  {snapshots.length > 0 && (
    <>
      <SelectSeparator />
      <SelectLabel>Saved Snapshots</SelectLabel>
      {snapshots.map(snapshot => (
        <SelectItem key={snapshot.projection_version} value={snapshot.projection_version}>
          <div className="flex items-center gap-2">
            <Bookmark className="h-3 w-3" />
            <span>{snapshot.snapshot_name}</span>
            <span className="text-muted-foreground text-xs">
              ({formatDate(snapshot.created_at)})
            </span>
          </div>
        </SelectItem>
      ))}
    </>
  )}
  
  {/* Recent Versions */}
  {recentVersions.length > 0 && (
    <>
      <SelectSeparator />
      <SelectLabel>Recent Analyses</SelectLabel>
      {recentVersions.map(version => (
        <SelectItem key={version.projection_version} value={version.projection_version}>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{formatDate(version.created_at)}</span>
            <span className="text-muted-foreground text-xs">
              ({version.total_tweets} tweets, {version.total_clusters} clusters)
            </span>
          </div>
        </SelectItem>
      ))}
    </>
  )}
</Select>
```

### Snapshot Management Dialog

```tsx
<Dialog open={showSnapshots} onOpenChange={setShowSnapshots}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Manage Snapshots</DialogTitle>
      <DialogDescription>
        Saved opinion map snapshots for this zone
      </DialogDescription>
    </DialogHeader>
    
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-3">
        {snapshots.map(snapshot => (
          <Card key={snapshot.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <span className="font-medium">{snapshot.snapshot_name}</span>
                </div>
                
                {snapshot.snapshot_description && (
                  <p className="text-sm text-muted-foreground">
                    {snapshot.snapshot_description}
                  </p>
                )}
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(snapshot.created_at)}</span>
                  <span>{snapshot.total_tweets} tweets</span>
                  <span>{snapshot.total_clusters} clusters</span>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => loadSnapshot(snapshot)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editSnapshot(snapshot)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => deleteSnapshot(snapshot)}
                    className="text-destructive"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  </DialogContent>
</Dialog>
```

---

## Recommendation Summary

### MVP Implementation

**Use Strategy 2: Limited History (5 versions)** with these features:

1. **Automatic retention**: Keep last 5 versions
2. **Auto-cleanup**: Delete oldest when generating new
3. **Version selector**: UI to switch between versions
4. **Basic comparison**: Side-by-side cluster comparison

**Storage**: ~50 MB per zone (very reasonable)

### Phase 2 Enhancement

**Add Named Snapshots**:
- User can save important versions
- Snapshots exempt from auto-cleanup
- Optional age limit (1 year)

### Phase 3 Advanced

**Add Evolution Tracking**:
- Cluster matching algorithm
- Evolution timeline UI
- Trend visualization

---

**Next**: Let's do a final architecture synthesis

