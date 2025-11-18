# Opinion Map Sampling Strategies

**Date**: November 18, 2025  
**Context**: High-volume zones (10K-100K+ tweets/day)

---

## Problem Statement

For zones with high tweet volume:
- Full clustering of 100K tweets is computationally expensive
- May not provide additional insight beyond 10K well-sampled tweets
- Need intelligent sampling to maintain representativeness

---

## Proposed Sampling Strategies

### Strategy 1: Uniform Time Sampling (Simple)

**Concept**: Evenly distribute 10K tweets across the time period

```typescript
// Example: 50K tweets in 24h → Sample 10K uniformly
SELECT * FROM twitter_tweets
WHERE zone_id = $1
  AND twitter_created_at >= $2
  AND twitter_created_at <= $3
  AND (
    -- Sample using modulo on a hash
    abs(hashtext(tweet_id)::bigint) % 5 = 0
  )
ORDER BY twitter_created_at
LIMIT 10000
```

**Pros**:
- ✅ Simple to implement
- ✅ Preserves temporal distribution
- ✅ Fast query execution

**Cons**:
- ❌ May miss important low-volume periods
- ❌ Doesn't account for tweet importance (engagement)

---

### Strategy 2: Stratified Random Sampling (Recommended)

**Concept**: Divide time period into equal buckets, sample proportionally from each

```typescript
interface SamplingConfig {
  zoneId: string
  startDate: Date
  endDate: Date
  targetSampleSize: number // 10000
  buckets: number // 24 for hourly buckets
}

async function stratifiedSample(config: SamplingConfig) {
  const { zoneId, startDate, endDate, targetSampleSize, buckets } = config
  
  // Calculate bucket size (e.g., 1 hour for 24h period)
  const bucketDuration = (endDate.getTime() - startDate.getTime()) / buckets
  const samplesPerBucket = Math.ceil(targetSampleSize / buckets)
  
  const samples = []
  
  for (let i = 0; i < buckets; i++) {
    const bucketStart = new Date(startDate.getTime() + i * bucketDuration)
    const bucketEnd = new Date(startDate.getTime() + (i + 1) * bucketDuration)
    
    // Sample from this bucket
    const { data: bucketSamples } = await supabase
      .from('twitter_tweets')
      .select('*')
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', bucketStart.toISOString())
      .lt('twitter_created_at', bucketEnd.toISOString())
      .order('random()') // PostgreSQL random sampling
      .limit(samplesPerBucket)
    
    if (bucketSamples) {
      samples.push(...bucketSamples)
    }
  }
  
  // Trim to exact target size
  return samples.slice(0, targetSampleSize)
}
```

**Pros**:
- ✅ Ensures temporal representation
- ✅ Works well for varying volume across time
- ✅ Captures activity patterns (peaks/valleys)

**Cons**:
- ❌ More complex query
- ❌ Slightly slower (multiple queries)

---

### Strategy 3: Engagement-Weighted Sampling (Advanced)

**Concept**: Prioritize high-engagement tweets while maintaining temporal balance

```typescript
async function engagementWeightedSample(config: SamplingConfig) {
  const { zoneId, startDate, endDate, targetSampleSize } = config
  
  // Define engagement tiers
  const tiers = [
    { name: 'ultra_high', threshold: 1000, percentage: 0.20 }, // 20% top tweets
    { name: 'high', threshold: 100, percentage: 0.30 },        // 30% high engagement
    { name: 'medium', threshold: 10, percentage: 0.30 },       // 30% medium
    { name: 'low', threshold: 0, percentage: 0.20 },           // 20% low engagement
  ]
  
  const samples = []
  
  for (const tier of tiers) {
    const tierSampleSize = Math.floor(targetSampleSize * tier.percentage)
    
    const { data: tierSamples } = await supabase
      .from('twitter_tweets')
      .select('*')
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', startDate.toISOString())
      .lte('twitter_created_at', endDate.toISOString())
      .gte('total_engagement', tier.threshold)
      .order('random()')
      .limit(tierSampleSize)
    
    if (tierSamples) {
      samples.push(...tierSamples)
    }
  }
  
  // Shuffle to avoid tier ordering
  return shuffleArray(samples).slice(0, targetSampleSize)
}
```

**Pros**:
- ✅ Captures influential content
- ✅ Better for opinion analysis (high-engagement = more visibility)
- ✅ Balances importance with diversity

**Cons**:
- ❌ Most complex implementation
- ❌ May under-represent niche opinions
- ❌ Requires engagement data to be up-to-date

---

### Strategy 4: Hybrid Sampling (Best of Both Worlds)

**Concept**: Combine stratified time sampling with engagement weighting

```typescript
async function hybridSample(config: SamplingConfig) {
  const { zoneId, startDate, endDate, targetSampleSize, buckets = 24 } = config
  
  const bucketDuration = (endDate.getTime() - startDate.getTime()) / buckets
  const samplesPerBucket = Math.ceil(targetSampleSize / buckets)
  
  const samples = []
  
  for (let i = 0; i < buckets; i++) {
    const bucketStart = new Date(startDate.getTime() + i * bucketDuration)
    const bucketEnd = new Date(startDate.getTime() + (i + 1) * bucketDuration)
    
    // Within each time bucket, sample with engagement weighting
    // 70% from top 30% by engagement
    const highEngagementCount = Math.floor(samplesPerBucket * 0.7)
    const lowEngagementCount = samplesPerBucket - highEngagementCount
    
    // Get high engagement tweets
    const { data: highSamples } = await supabase
      .from('twitter_tweets')
      .select('*')
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', bucketStart.toISOString())
      .lt('twitter_created_at', bucketEnd.toISOString())
      .order('total_engagement', { ascending: false })
      .order('random()') // Add randomness among top tweets
      .limit(highEngagementCount)
    
    // Get diverse low-medium engagement tweets
    const { data: lowSamples } = await supabase
      .from('twitter_tweets')
      .select('*')
      .eq('zone_id', zoneId)
      .gte('twitter_created_at', bucketStart.toISOString())
      .lt('twitter_created_at', bucketEnd.toISOString())
      .order('random()')
      .limit(lowEngagementCount)
    
    if (highSamples) samples.push(...highSamples)
    if (lowSamples) samples.push(...lowSamples)
  }
  
  return samples.slice(0, targetSampleSize)
}
```

**Pros**:
- ✅ Temporal balance (time buckets)
- ✅ Captures influential content (engagement weighting)
- ✅ Maintains diversity (includes low-engagement tweets)
- ✅ Production-ready

**Cons**:
- ❌ More complex query logic
- ❌ Needs optimization for large datasets

---

## Recommended Approach

### For MVP (Phase 1)

**Use Strategy 2: Stratified Random Sampling**

**Rationale**:
- Simple enough to implement quickly
- Provides good temporal representation
- Works well across all volume scenarios
- Easy to explain to users

### For Production (Phase 2)

**Upgrade to Strategy 4: Hybrid Sampling**

**Rationale**:
- Better captures influential content
- Maintains temporal balance
- More aligned with operational needs (monitoring important conversations)

---

## UI/UX Design

### Time Period Selector with Smart Sampling

```tsx
<div className="space-y-4">
  {/* Sample Size */}
  <div>
    <Label>Sample Size</Label>
    <Select value={sampleSize} onValueChange={setSampleSize}>
      <SelectItem value="1000">1,000 tweets (Fast, Overview)</SelectItem>
      <SelectItem value="5000">5,000 tweets (Balanced)</SelectItem>
      <SelectItem value="10000">10,000 tweets (Detailed)</SelectItem>
      <SelectItem value="20000">20,000 tweets (Comprehensive)</SelectItem>
    </Select>
    <p className="text-xs text-muted-foreground mt-1">
      Larger samples provide more detail but take longer to process
    </p>
  </div>
  
  {/* Time Period Presets */}
  <div>
    <Label>Time Period</Label>
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" onClick={() => setPeriod('3h')}>
        Last 3 Hours
      </Button>
      <Button variant="outline" onClick={() => setPeriod('6h')}>
        Last 6 Hours
      </Button>
      <Button variant="outline" onClick={() => setPeriod('12h')}>
        Last 12 Hours
      </Button>
      <Button variant="outline" onClick={() => setPeriod('24h')}>
        Last 24 Hours
      </Button>
      <Button variant="outline" onClick={() => setPeriod('3d')}>
        Last 3 Days
      </Button>
      <Button variant="outline" onClick={() => setPeriod('7d')}>
        Last 7 Days
      </Button>
      <Button variant="outline" onClick={() => setPeriod('30d')}>
        Last 30 Days
      </Button>
      <Button variant="outline" onClick={() => setShowCustomRange(true)}>
        Custom Range
      </Button>
    </div>
  </div>
  
  {/* Custom Date Range */}
  {showCustomRange && (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label>Start Date</Label>
        <DatePicker value={startDate} onChange={setStartDate} />
      </div>
      <div>
        <Label>End Date</Label>
        <DatePicker value={endDate} onChange={setEndDate} />
      </div>
    </div>
  )}
  
  {/* Volume Preview */}
  <div className="rounded-lg border p-3 bg-muted/30">
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Available tweets in period:</span>
      <span className="font-medium">{availableTweets.toLocaleString()}</span>
    </div>
    <div className="flex items-center justify-between text-sm mt-1">
      <span className="text-muted-foreground">Will sample:</span>
      <span className="font-medium text-primary">{sampleSize.toLocaleString()}</span>
    </div>
    {availableTweets < sampleSize && (
      <p className="text-xs text-amber-600 mt-2">
        ⚠️ Only {availableTweets.toLocaleString()} tweets available. 
        All will be included in the analysis.
      </p>
    )}
  </div>
  
  {/* Generate Button */}
  <Button 
    onClick={handleGenerate} 
    disabled={isGenerating}
    size="lg"
    className="w-full"
  >
    {isGenerating ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Generating Opinion Map... {progress}%
      </>
    ) : (
      <>
        <Sparkles className="mr-2 h-4 w-4" />
        Generate Opinion Map
      </>
    )}
  </Button>
  
  <p className="text-xs text-muted-foreground text-center">
    Estimated processing time: {estimatedTime}
  </p>
</div>
```

---

## Database Optimization

### Efficient Sampling Query (PostgreSQL)

```sql
-- Create function for stratified sampling
CREATE OR REPLACE FUNCTION sample_tweets_stratified(
  p_zone_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_sample_size INTEGER,
  p_buckets INTEGER DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  tweet_id TEXT,
  text TEXT,
  author_profile_id UUID,
  twitter_created_at TIMESTAMPTZ,
  total_engagement INTEGER,
  -- other columns...
) AS $$
DECLARE
  bucket_duration INTERVAL;
  samples_per_bucket INTEGER;
BEGIN
  -- Calculate bucket parameters
  bucket_duration := (p_end_date - p_start_date) / p_buckets;
  samples_per_bucket := CEIL(p_sample_size::NUMERIC / p_buckets);
  
  -- Sample from each bucket
  RETURN QUERY
  WITH time_buckets AS (
    SELECT 
      generate_series(
        p_start_date,
        p_end_date - bucket_duration,
        bucket_duration
      ) AS bucket_start
  ),
  bucket_samples AS (
    SELECT DISTINCT ON (tb.bucket_start, t.id)
      t.*,
      tb.bucket_start
    FROM time_buckets tb
    CROSS JOIN LATERAL (
      SELECT *
      FROM twitter_tweets t
      WHERE t.zone_id = p_zone_id
        AND t.twitter_created_at >= tb.bucket_start
        AND t.twitter_created_at < tb.bucket_start + bucket_duration
      ORDER BY random()
      LIMIT samples_per_bucket
    ) t
  )
  SELECT 
    bs.id,
    bs.tweet_id,
    bs.text,
    bs.author_profile_id,
    bs.twitter_created_at,
    bs.total_engagement
    -- other columns...
  FROM bucket_samples bs
  ORDER BY bs.twitter_created_at
  LIMIT p_sample_size;
END;
$$ LANGUAGE plpgsql;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tweets_zone_time_random 
ON twitter_tweets (zone_id, twitter_created_at, random());
```

---

## Performance Considerations

### Query Performance

| Volume | Period | Sample Size | Query Time | Notes |
|--------|--------|-------------|------------|-------|
| 10K tweets | 24h | 5K | < 100ms | Direct sampling |
| 50K tweets | 24h | 10K | < 200ms | Stratified (24 buckets) |
| 100K tweets | 7d | 10K | < 500ms | Stratified (168 buckets = hourly) |
| 500K tweets | 30d | 10K | < 1s | Stratified (30 buckets = daily) |

**Target**: All sampling queries < 1 second ✅

### Bucket Selection Guidelines

| Period | Recommended Buckets | Bucket Duration | Rationale |
|--------|---------------------|-----------------|-----------|
| 3h | 6 | 30 min | Capture short-term bursts |
| 6h | 12 | 30 min | Hourly patterns |
| 12h | 24 | 30 min | Half-day cycles |
| 24h | 24 | 1 hour | Daily rhythm |
| 3d | 36 | 2 hours | Multi-day trends |
| 7d | 28 | 6 hours | Weekly patterns |
| 30d | 30 | 1 day | Monthly evolution |
| Custom | Auto-calculate | (end - start) / 24 | Flexible |

---

## Operational Best Practices

### 1. Cache Sample Metadata

Store sampling parameters with each clustering job:

```typescript
interface ClusteringJobConfig {
  sampling: {
    strategy: 'stratified' | 'uniform' | 'engagement_weighted' | 'hybrid'
    total_available: number
    sample_size: number
    start_date: string
    end_date: string
    buckets: number
    actual_sampled: number
  }
  // other config...
}
```

**Why**: Allows users to see exactly what data was used

### 2. Display Sampling Info in UI

```tsx
<Badge variant="outline" className="text-xs">
  Showing 10,000 of 47,328 tweets (21%) from Nov 1-7
</Badge>
```

### 3. Allow Re-sampling

```tsx
<Button onClick={handleResample} variant="ghost" size="sm">
  <RefreshCw className="h-3 w-3 mr-1" />
  Re-sample (different 10K tweets)
</Button>
```

**Why**: Verify that clusters are stable, not artifacts of sampling

### 4. Progressive Detail Levels

```
Quick Overview (1K tweets, ~30s)
  ↓
Standard Analysis (5K tweets, ~1min)
  ↓
Deep Dive (10K tweets, ~2min)
  ↓
Comprehensive (20K tweets, ~5min)
```

**Why**: Let users choose speed vs detail trade-off

---

## Edge Cases

### Case 1: Low Volume Period

**Scenario**: User selects 30d period but only 2K tweets exist

**Solution**:
```typescript
const availableTweets = await getTweetCount(zoneId, startDate, endDate)
const actualSampleSize = Math.min(targetSampleSize, availableTweets)

if (availableTweets < targetSampleSize) {
  // Show warning
  toast.warning(
    `Only ${availableTweets} tweets available. All will be included.`
  )
}
```

### Case 2: Highly Skewed Distribution

**Scenario**: 90% of tweets in 1-hour burst, rest spread over 23 hours

**Solution**: Stratified sampling ensures representation of quiet periods

```typescript
// Each time bucket gets equal representation
// Even if bucket only has 10 tweets, all 10 are included
// Busy buckets are sampled down to match target
```

### Case 3: Real-time Updates

**Scenario**: New tweets arrive while clustering is running

**Solution**: Snapshot the tweet IDs at job start

```typescript
// Save tweet IDs at clustering start
const snapshotTweetIds = await sampleTweets(config)

await supabase
  .from('twitter_clustering_jobs')
  .update({
    config: {
      ...config,
      snapshot_tweet_ids: snapshotTweetIds.map(t => t.id)
    }
  })
  .eq('id', jobId)

// Later phases query using exact tweet IDs
const tweets = await supabase
  .from('twitter_tweets')
  .select('*')
  .in('id', job.config.snapshot_tweet_ids)
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Stratified Sampling', () => {
  it('should distribute samples evenly across time buckets', async () => {
    const samples = await stratifiedSample({
      zoneId: 'test-zone',
      startDate: new Date('2025-01-01T00:00:00Z'),
      endDate: new Date('2025-01-02T00:00:00Z'),
      targetSampleSize: 1000,
      buckets: 24
    })
    
    // Check each hour has ~41 tweets (1000/24)
    const hourCounts = groupByHour(samples)
    expect(hourCounts).toHaveLength(24)
    hourCounts.forEach(count => {
      expect(count).toBeGreaterThanOrEqual(30)
      expect(count).toBeLessThanOrEqual(50)
    })
  })
  
  it('should handle low-volume periods gracefully', async () => {
    // Only 500 tweets available, requesting 1000
    const samples = await stratifiedSample({
      zoneId: 'low-volume-zone',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      targetSampleSize: 1000,
      buckets: 24
    })
    
    expect(samples.length).toBeLessThanOrEqual(500)
  })
})
```

---

## Recommendation Summary

### For MVP

**Use Stratified Random Sampling** with these settings:

- Default sample size: **10,000 tweets**
- Time buckets: **Auto-calculated** (1 bucket per 1h for periods < 7d, 1 bucket per 6h for longer)
- Allow sample sizes: 1K, 5K, 10K, 20K
- Cache sampling metadata with job
- Show sampling info in UI

### For Future Enhancement

**Upgrade to Hybrid Sampling**:
- 70% high-engagement tweets
- 30% diverse low-engagement tweets
- Maintains temporal balance
- Add "re-sample" feature to verify cluster stability

---

**Next**: Let's discuss embedding strategy (Question 2)

