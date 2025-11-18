# Embedding Strategy - When to Vectorize?

**Date**: November 18, 2025  
**Context**: Deciding when and how to generate OpenAI embeddings

---

## The Question

Should we vectorize tweets:
1. **Real-time** when received from webhook?
2. **On-demand** when clustering is triggered?
3. **Hybrid** approach?

---

## Option 1: Real-time Embedding (Webhook Integration)

### Concept

Hook into existing webhook flow:

```
TwitterAPI.io sends tweets
  ↓
/api/webhooks/twitter (existing)
  ↓
Deduplicator processes tweets
  ↓
Save to twitter_tweets
  ↓
[NEW] Schedule vectorization via QStash
  ↓
/api/webhooks/qstash/vectorize-tweet
  ↓
Generate embedding
  ↓
Update twitter_tweets.embedding
```

### Implementation

```typescript
// /api/webhooks/twitter/route.ts (modify existing)
export async function POST(request: Request) {
  // ... existing webhook code ...
  
  // After saving tweets
  for (const savedTweet of savedTweets) {
    // Schedule vectorization (10s delay to batch)
    await qstash.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/qstash/vectorize-tweet`,
      body: {
        tweet_id: savedTweet.id,
        zone_id: savedTweet.zone_id,
      },
      delay: 10, // Small delay to allow batching
    })
  }
  
  return new Response(JSON.stringify({ success: true }))
}
```

```typescript
// /api/webhooks/qstash/vectorize-tweet/route.ts (new)
export async function POST(request: Request) {
  const { tweet_id, zone_id } = await request.json()
  
  // Fetch tweet
  const tweet = await supabase
    .from('twitter_tweets')
    .select('id, text, author_profile_id, raw_data')
    .eq('id', tweet_id)
    .single()
  
  if (!tweet) {
    return new Response(JSON.stringify({ error: 'Tweet not found' }))
  }
  
  // Check if already vectorized
  if (tweet.embedding) {
    return new Response(JSON.stringify({ 
      success: true, 
      skipped: true 
    }))
  }
  
  // Enrich content
  const enrichedContent = enrichTweetContent({
    tweet_text: tweet.text,
    author_name: tweet.raw_data.author?.name,
    author_handle: tweet.raw_data.author?.userName,
    hashtags: extractHashtags(tweet.raw_data),
  })
  
  // Generate embedding
  const { embedding } = await embed({
    model: 'openai/text-embedding-3-small',
    value: enrichedContent,
  })
  
  // Save to database
  await supabase
    .from('twitter_tweets')
    .update({
      embedding,
      embedding_model: 'openai/text-embedding-3-small',
      embedding_created_at: new Date().toISOString(),
    })
    .eq('id', tweet_id)
  
  return new Response(JSON.stringify({ success: true }))
}
```

### Pros

✅ **Embeddings ready immediately** when clustering is triggered  
✅ **Spreads API calls over time** (avoids rate limits)  
✅ **No waiting** at clustering time  
✅ **Can use for other features** (semantic search, similarity)  
✅ **Leverages existing QStash infrastructure**

### Cons

❌ **Vectorizes ALL tweets** (even if never used for clustering)  
❌ **Higher ongoing cost** ($2-5/month per 10K daily tweets)  
❌ **Storage overhead** (1536 floats = 6KB per tweet)  
❌ **More complex webhook logic**

### Cost Analysis

**Scenario**: Zone with 10K tweets/day

**Monthly vectorization**:
- 10K tweets/day × 30 days = 300K tweets
- ~250 tokens/tweet = 75M tokens/month
- Cost: 75M × $0.02/1M = **$1.50/month**

**Storage**:
- 300K tweets × 6KB = 1.8 GB
- Supabase Pro includes 8GB ✅

**Verdict**: Affordable for high-value zones, but wasteful if clustering rarely used

---

## Option 2: On-Demand Batch Embedding (Clustering-Time)

### Concept

Only vectorize when clustering is triggered:

```
User clicks "Generate Opinion Map"
  ↓
Select 10K tweets to analyze (sampling)
  ↓
Check which tweets lack embeddings
  ↓
Batch vectorize missing embeddings (100 per batch)
  ↓
Proceed with clustering pipeline
```

### Implementation

```typescript
// Phase 0: Vectorization (only if needed)
async function ensureEmbeddings(job: ClusteringJob) {
  // Get sampled tweets for this job
  const tweets = await sampleTweetsForClustering(
    job.zone_id,
    job.config.start_date,
    job.config.end_date,
    job.config.sample_size
  )
  
  // Filter tweets without embeddings
  const tweetsToVectorize = tweets.filter(t => !t.embedding)
  
  if (tweetsToVectorize.length === 0) {
    // All tweets already vectorized, skip to next phase
    await updateJobStatus(job.id, 'reducing', 25)
    return
  }
  
  const BATCH_SIZE = 100
  let vectorized = 0
  
  for (let i = 0; i < tweetsToVectorize.length; i += BATCH_SIZE) {
    const batch = tweetsToVectorize.slice(i, i + BATCH_SIZE)
    
    // Enrich content for each tweet
    const contents = batch.map(t => enrichTweetContent(t))
    
    // Batch generate embeddings (single API call)
    const result = await embedMany({
      model: 'openai/text-embedding-3-small',
      values: contents,
    })
    
    // Save embeddings
    for (let j = 0; j < batch.length; j++) {
      await supabase
        .from('twitter_tweets')
        .update({
          embedding: result.embeddings[j],
          embedding_model: 'openai/text-embedding-3-small',
          embedding_created_at: new Date().toISOString(),
        })
        .eq('id', batch[j].id)
    }
    
    vectorized += batch.length
    
    // Update progress
    const progress = Math.floor((vectorized / tweetsToVectorize.length) * 20)
    await updateJobStatus(job.id, 'vectorizing', progress, 
      `Vectorized ${vectorized}/${tweetsToVectorize.length} tweets`
    )
    
    // Small delay between batches (rate limit protection)
    if (i + BATCH_SIZE < tweetsToVectorize.length) {
      await sleep(2000) // 2s between batches
    }
  }
  
  // Move to next phase
  await updateJobStatus(job.id, 'reducing', 25)
}
```

### Pros

✅ **Only vectorize what's needed** (cost-efficient)  
✅ **Simple architecture** (all in clustering pipeline)  
✅ **No webhook modifications** required  
✅ **Batch API calls** (efficient, rate-limit friendly)  
✅ **Embeddings cached** for future re-clustering

### Cons

❌ **First clustering is slower** (must vectorize first)  
❌ **Subsequent clusterings still need new tweets** vectorized  
❌ **All vectorization happens at once** (potential timeout if large backlog)

### Cost Analysis

**Scenario**: Zone with 100K tweets, user triggers clustering monthly

**Only vectorize 10K sampled tweets**:
- 10K tweets × 250 tokens = 2.5M tokens
- Cost per clustering: 2.5M × $0.02/1M = **$0.05**
- Monthly cost (assuming 4 clusterings): **$0.20/month**

**95% cost savings** vs real-time approach!

### Performance

| Scenario | Vectorization Time | Clustering Time | Total |
|----------|-------------------|-----------------|-------|
| All tweets vectorized | 0s | ~2min | ~2min |
| None vectorized | ~1min | ~2min | ~3min |
| 50% vectorized | ~30s | ~2min | ~2.5min |

**Extra ~1 minute** is acceptable for 95% cost savings ✅

---

## Option 3: Hybrid Strategy (Smart Caching)

### Concept

Vectorize intelligently based on usage patterns:

**Rules**:
1. **High-engagement tweets** → Vectorize immediately (likely to be analyzed)
2. **Recent tweets** (< 24h old) → Vectorize on webhook
3. **Old/low-engagement tweets** → Vectorize on-demand only

```typescript
// /api/webhooks/twitter/route.ts
export async function POST(request: Request) {
  // ... save tweets ...
  
  for (const tweet of savedTweets) {
    // Decision logic
    const shouldVectorizeNow = (
      tweet.total_engagement >= dynamicThreshold || // High engagement
      isRecent(tweet, '24h') // Recent tweet
    )
    
    if (shouldVectorizeNow) {
      await scheduleVectorization(tweet.id, tweet.zone_id)
    }
    // Otherwise, vectorize on-demand when needed
  }
}
```

### Pros

✅ **Best of both worlds** (fast clustering + cost-efficient)  
✅ **Important tweets ready instantly**  
✅ **Automatic optimization** based on engagement patterns  
✅ **Flexible** (adapts to zone activity)

### Cons

❌ **Most complex** implementation  
❌ **Needs dynamic threshold** calculation  
❌ **Harder to predict** costs

### Cost Analysis

**Scenario**: Zone with 10K tweets/day, 20% high-engagement

**Real-time vectorization** (20%):
- 2K tweets/day × 30 days = 60K tweets
- Cost: 60K × 250 × $0.02/1M = **$0.30/month**

**On-demand vectorization** (80%):
- Only when clustering triggered (10K sample might need 8K on-demand)
- Per clustering: 8K × 250 × $0.02/1M = **$0.04**
- Monthly (4 clusterings): **$0.16/month**

**Total**: ~**$0.46/month** (77% savings vs full real-time)

---

## Comparison Matrix

| Aspect | Real-time | On-Demand | Hybrid |
|--------|-----------|-----------|--------|
| **First Clustering Speed** | ⚡ Instant | 🐢 +1 min | ⚡ Mostly instant |
| **Subsequent Clustering** | ⚡ Instant | 🐌 +30s | ⚡ Mostly instant |
| **Cost** | 💰 High ($1.50/mo) | 💵 Low ($0.20/mo) | 💵 Medium ($0.50/mo) |
| **Storage** | 📦 High (all tweets) | 📦 Low (sampled) | 📦 Medium (20-30%) |
| **Implementation** | 🔨 Medium | 🔨 Simple | 🔨 Complex |
| **Webhook Impact** | ⚠️ Adds load | ✅ None | ⚠️ Some load |
| **Rate Limit Risk** | ⚠️ Medium | ✅ Low | ✅ Low |
| **Reusability** | ✅ High | ⚠️ Limited | ✅ High |

---

## Recommendation

### For MVP: **Option 2 - On-Demand Batch Embedding**

**Rationale**:
1. **Simplest to implement** - No webhook changes
2. **Most cost-efficient** - Only vectorize what's analyzed
3. **Good performance** - +1 min is acceptable
4. **No rate limit concerns** - Controlled batching
5. **Easy to migrate** to hybrid later

### Implementation Priority

**Phase 1 (MVP)**:
```typescript
// Simple on-demand vectorization in clustering pipeline
async function clusteringWorker(job) {
  // Phase 0: Ensure embeddings exist
  await ensureEmbeddings(job) // New function
  
  // Phase 1: Fetch embeddings
  const embeddings = await getEmbeddings(job.tweet_ids)
  
  // Phase 2-4: Existing clustering logic
  // ...
}
```

**Phase 2 (Optimization)**:
```typescript
// Add caching logic
const cachedEmbeddings = await getCachedEmbeddings(tweetIds)
const missingTweetIds = tweetIds.filter(id => !cachedEmbeddings[id])

if (missingTweetIds.length > 0) {
  await batchVectorize(missingTweetIds)
}
```

**Phase 3 (Advanced)**:
```typescript
// Upgrade to hybrid if needed
if (highVolumeZone && frequentClustering) {
  enableRealtimeVectorization(zoneId, {
    threshold: 'dynamic', // P75 engagement
    recencyWindow: '24h',
  })
}
```

---

## Migration Path to Hybrid (Future)

If a zone shows frequent clustering (>1/day):

```typescript
// Auto-enable real-time for active zones
const clusteringFrequency = await getClusteringFrequency(zoneId, '7d')

if (clusteringFrequency > 1) {
  await updateZoneSettings(zoneId, {
    vectorization_strategy: 'hybrid',
    vectorize_threshold_percentile: 75, // Top 25% by engagement
  })
  
  toast.info(
    'This zone is frequently analyzed. ' +
    'Enabling smart vectorization for faster clustering.'
  )
}
```

---

## Database Changes

### Add Vectorization Status Tracking

```sql
-- Add column to track vectorization attempts
ALTER TABLE twitter_tweets
ADD COLUMN vectorization_attempts INTEGER DEFAULT 0,
ADD COLUMN vectorization_error TEXT,
ADD COLUMN vectorization_last_attempt_at TIMESTAMPTZ;

-- Index for finding non-vectorized tweets
CREATE INDEX idx_tweets_needs_vectorization 
ON twitter_tweets (zone_id, id) 
WHERE embedding IS NULL;

-- Index for finding recently vectorized tweets
CREATE INDEX idx_tweets_recently_vectorized 
ON twitter_tweets (zone_id, embedding_created_at DESC)
WHERE embedding IS NOT NULL;
```

### Vectorization Metrics Table (Optional)

Track costs and usage:

```sql
CREATE TABLE twitter_vectorization_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tweets_vectorized INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  strategy TEXT CHECK (strategy IN ('realtime', 'on_demand', 'hybrid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (zone_id, date)
);

-- Daily rollup function
CREATE OR REPLACE FUNCTION update_vectorization_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO twitter_vectorization_metrics (
    zone_id,
    date,
    tweets_vectorized,
    tokens_used,
    cost_usd
  )
  VALUES (
    NEW.zone_id,
    CURRENT_DATE,
    1,
    (LENGTH(NEW.embedding)::INTEGER / 4), -- Rough token estimate
    (LENGTH(NEW.embedding)::INTEGER / 4) * 0.00000002 -- $0.02/1M tokens
  )
  ON CONFLICT (zone_id, date)
  DO UPDATE SET
    tweets_vectorized = twitter_vectorization_metrics.tweets_vectorized + 1,
    tokens_used = twitter_vectorization_metrics.tokens_used + EXCLUDED.tokens_used,
    cost_usd = twitter_vectorization_metrics.cost_usd + EXCLUDED.cost_usd;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_vectorization_metrics
AFTER UPDATE OF embedding ON twitter_tweets
FOR EACH ROW
WHEN (OLD.embedding IS NULL AND NEW.embedding IS NOT NULL)
EXECUTE FUNCTION update_vectorization_metrics();
```

---

## Error Handling

### Retry Logic for Failed Vectorizations

```typescript
async function vectorizeWithRetry(
  tweetId: string, 
  maxAttempts: number = 3
): Promise<boolean> {
  const tweet = await getTweet(tweetId)
  
  if (tweet.vectorization_attempts >= maxAttempts) {
    console.error(`Max attempts reached for tweet ${tweetId}`)
    return false
  }
  
  try {
    const embedding = await generateEmbedding(tweet.text)
    
    await supabase
      .from('twitter_tweets')
      .update({
        embedding,
        embedding_model: 'openai/text-embedding-3-small',
        embedding_created_at: new Date().toISOString(),
        vectorization_attempts: tweet.vectorization_attempts + 1,
        vectorization_error: null,
      })
      .eq('id', tweetId)
    
    return true
  } catch (error) {
    await supabase
      .from('twitter_tweets')
      .update({
        vectorization_attempts: tweet.vectorization_attempts + 1,
        vectorization_error: error.message,
        vectorization_last_attempt_at: new Date().toISOString(),
      })
      .eq('id', tweetId)
    
    // Retry with exponential backoff
    if (tweet.vectorization_attempts < maxAttempts - 1) {
      const delay = Math.pow(2, tweet.vectorization_attempts) * 1000
      await sleep(delay)
      return vectorizeWithRetry(tweetId, maxAttempts)
    }
    
    return false
  }
}
```

### Graceful Degradation

If vectorization fails for some tweets:

```typescript
// Allow clustering with partial embeddings
const tweets = await sampleTweets(config)
const tweetsWithEmbeddings = tweets.filter(t => t.embedding !== null)

if (tweetsWithEmbeddings.length < tweets.length * 0.8) {
  // Less than 80% vectorized
  toast.warning(
    `Only ${tweetsWithEmbeddings.length}/${tweets.length} tweets could be vectorized. ` +
    `Proceeding with available data.`
  )
}

if (tweetsWithEmbeddings.length < 100) {
  throw new Error('Not enough vectorized tweets for meaningful clustering')
}

// Continue with available tweets
return tweetsWithEmbeddings
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('On-Demand Vectorization', () => {
  it('should vectorize only missing embeddings', async () => {
    // Setup: 10 tweets, 5 already vectorized
    const tweets = createTestTweets(10, { 
      vectorized: [0, 1, 2, 3, 4] 
    })
    
    const result = await ensureEmbeddings(tweets)
    
    // Should only vectorize 5 tweets
    expect(result.vectorized).toBe(5)
    expect(result.skipped).toBe(5)
  })
  
  it('should batch API calls efficiently', async () => {
    const tweets = createTestTweets(250) // 250 tweets
    const spy = jest.spyOn(openai, 'embedMany')
    
    await ensureEmbeddings(tweets)
    
    // Should make 3 calls (100 + 100 + 50)
    expect(spy).toHaveBeenCalledTimes(3)
  })
})
```

### Integration Tests

```typescript
describe('Clustering with On-Demand Vectorization', () => {
  it('should complete full pipeline with vectorization', async () => {
    // Create tweets without embeddings
    const tweets = await createTestTweetsInDB(1000, { vectorized: false })
    
    // Trigger clustering
    const job = await triggerClustering(zoneId)
    
    // Wait for completion
    await waitForJobCompletion(job.id, { timeout: 60000 })
    
    // Verify all tweets were vectorized
    const vectorizedCount = await countVectorizedTweets(zoneId)
    expect(vectorizedCount).toBe(1000)
    
    // Verify clustering succeeded
    const clusters = await getClusters(zoneId, job.projection_version)
    expect(clusters.length).toBeGreaterThan(0)
  })
})
```

---

## Monitoring & Alerting

### Metrics to Track

```typescript
// Dashboard metrics
interface VectorizationMetrics {
  daily_vectorized: number
  daily_cost_usd: number
  success_rate: number // %
  avg_tokens_per_tweet: number
  cache_hit_rate: number // % already vectorized
  failed_attempts: number
}

// Alerts
if (metrics.daily_cost_usd > 5.00) {
  alertAdmin('Vectorization cost exceeded $5/day')
}

if (metrics.success_rate < 0.95) {
  alertAdmin('Vectorization success rate below 95%')
}
```

### Logs

```typescript
console.log('[Vectorization] Starting batch', {
  jobId,
  totalTweets: tweets.length,
  alreadyVectorized: cachedCount,
  toVectorize: tweets.length - cachedCount,
  estimatedCost: estimateCost(tweets.length - cachedCount),
})

console.log('[Vectorization] Batch complete', {
  jobId,
  vectorized: vectorizedCount,
  failed: failedCount,
  duration: durationMs,
  costUsd: actualCost,
})
```

---

## Recommendation Summary

**Choose Option 2: On-Demand Batch Embedding**

### Why

1. **Cost-efficient**: 95% savings vs real-time
2. **Simple**: No webhook modifications
3. **Safe**: Controlled rate limits
4. **Scalable**: Easy to optimize later
5. **Performant**: +1min is acceptable

### Implementation Steps

1. Create vectorization function in clustering pipeline
2. Add batch processing with rate limit protection
3. Implement retry logic for failures
4. Add progress tracking
5. Test with various data volumes

### Future Optimization Path

If zone becomes high-traffic (>1 clustering/day):
→ Auto-suggest enabling hybrid mode  
→ Vectorize top 25% by engagement in real-time  
→ Rest on-demand

---

**Next**: Let's discuss versioning strategy (Question 5)

