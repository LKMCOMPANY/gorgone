# Opinion Map V2 - Deployment Guide

**Date**: November 18, 2025  
**Status**: Ready for Deployment

---

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure these are configured in Vercel:

```bash
# OpenAI (for embeddings and labeling)
OPENAI_API_KEY=sk-...

# QStash (for background workers)
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...

# Application URL (for webhooks)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Database Migration

**Step 1**: Go to Supabase Dashboard > SQL Editor

**Step 2**: Copy and paste the migration file:
```
scripts/migrations/20251118_create_opinion_map_tables.sql
```

**Step 3**: Execute the migration

**Step 4**: Verify tables created:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'twitter_opinion%';

-- Expected output:
-- twitter_tweet_projections
-- twitter_opinion_clusters
-- twitter_opinion_sessions
```

### 3. Install Dependencies (if needed)

These should already be in package.json:
```json
{
  "dependencies": {
    "ml-pca": "^4.1.1",
    "umap-js": "^1.4.0",
    "@react-three/fiber": "^8.17.10",
    "@react-three/drei": "^9.117.3",
    "three": "^0.170.0",
    "ai": "^4.0.52",
    "@ai-sdk/openai": "^1.0.11",
    "recharts": "^2.15.4"
  }
}
```

If missing, run:
```bash
npm install ml-pca umap-js @react-three/fiber @react-three/drei three
```

---

## Deployment Steps

### Option A: Deploy via Vercel Dashboard

1. Go to https://vercel.com/your-team/gorgone
2. Click "Deploy" on main branch
3. Wait for build to complete (~3-5 minutes)
4. Verify deployment succeeded
5. Test on production URL

### Option B: Deploy via CLI

```bash
# From project root
cd /Users/lkm/Desktop/GORGONEANALYSIS/gorgone

# Deploy to production
vercel --prod

# Or deploy to preview
vercel
```

---

## Post-Deployment Verification

### 1. Health Checks

**Test worker endpoint**:
```bash
curl https://your-app.vercel.app/api/webhooks/qstash/opinion-map-worker

# Expected: { "status": "ok", "service": "opinion-map-worker" }
```

**Test API routes**:
```bash
# Generate endpoint (requires auth)
curl -X POST https://your-app.vercel.app/api/twitter/opinion-map/generate \
  -H "Content-Type: application/json" \
  -d '{
    "zone_id": "test-zone-id",
    "start_date": "2025-11-01T00:00:00Z",
    "end_date": "2025-11-18T00:00:00Z",
    "sample_size": 1000
  }'
```

### 2. Test Opinion Map Generation

1. **Login** to Gorgone
2. **Navigate** to any zone with Twitter data
3. **Go to** Analysis page
4. **Click** "Generate Opinion Map"
5. **Monitor** progress bar (should update in real-time)
6. **Verify** completion after 2-4 minutes
7. **Check** 3D visualization renders
8. **Test** interactions (hover, click, slider)

### 3. Monitor Logs

**Vercel Logs**:
```bash
vercel logs --follow
```

Look for:
- `[Opinion Map] Starting clustering pipeline` (worker started)
- `[Opinion Map] Pipeline complete` (success)
- Any error messages

**Supabase Logs**:
- Go to Supabase Dashboard > Logs
- Filter by "twitter_opinion_sessions"
- Check for INSERT/UPDATE operations

### 4. Check Database

```sql
-- Verify session created
SELECT * FROM twitter_opinion_sessions
ORDER BY created_at DESC
LIMIT 1;

-- Check status progression
SELECT session_id, status, progress, phase_message
FROM twitter_opinion_sessions
WHERE zone_id = 'your-zone-id'
ORDER BY created_at DESC;

-- Verify projections saved
SELECT COUNT(*) FROM twitter_tweet_projections
WHERE session_id = 'latest-session-id';

-- Verify clusters created
SELECT cluster_id, label, tweet_count
FROM twitter_opinion_clusters
WHERE session_id = 'latest-session-id'
ORDER BY tweet_count DESC;
```

---

## Troubleshooting

### Issue: "Failed to create session"

**Cause**: Database permissions or RLS issue

**Fix**:
```sql
-- Check RLS policies are created
SELECT * FROM pg_policies
WHERE tablename LIKE 'twitter_opinion%';

-- Verify user has access
SELECT * FROM profiles WHERE id = auth.uid();
```

### Issue: "Worker timeout"

**Cause**: Large dataset or slow OpenAI API

**Fix**:
- Reduce sample size (try 5,000 instead of 10,000)
- Check OpenAI API status
- Verify QStash retries are working

**Monitor**:
```sql
SELECT status, progress, error_message
FROM twitter_opinion_sessions
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Issue: "3D visualization not rendering"

**Cause**: WebGL not supported or Three.js error

**Fix**:
- Check browser console for errors
- Verify Three.js/R3F versions match
- Test on different browser (Chrome recommended)

**Fallback**:
- Show error message with browser compatibility info

### Issue: "Realtime updates not working"

**Cause**: Supabase Realtime not configured

**Fix**:
1. Go to Supabase Dashboard > Database > Replication
2. Enable replication for `twitter_opinion_sessions` table
3. Verify realtime enabled in Supabase settings

---

## Performance Monitoring

### Key Metrics to Track

**Pipeline Performance**:
```sql
-- Average execution time by tweet count
SELECT 
  CASE 
    WHEN total_tweets < 1000 THEN '< 1K'
    WHEN total_tweets < 5000 THEN '1K-5K'
    ELSE '5K+'
  END as size_bucket,
  COUNT(*) as sessions,
  AVG(execution_time_ms / 1000) as avg_seconds,
  MAX(execution_time_ms / 1000) as max_seconds
FROM twitter_opinion_sessions
WHERE status = 'completed'
GROUP BY size_bucket;
```

**Success Rate**:
```sql
-- Pipeline success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM twitter_opinion_sessions
GROUP BY status;
```

**Cache Hit Rate**:
```sql
-- Check embedding reuse
SELECT 
  COUNT(*) as total_tweets,
  COUNT(embedding) as vectorized,
  ROUND(COUNT(embedding) * 100.0 / COUNT(*), 1) as cache_rate
FROM twitter_tweets
WHERE zone_id = 'your-zone-id';
```

### Expected Results

✅ **Success rate**: > 95%  
✅ **Average time (10K tweets)**: 180-240s  
✅ **Cache hit rate**: 50-80% (after first clustering)  
✅ **3D FPS**: 60 constant

---

## Rollback Procedure

If issues arise, rollback is simple:

### 1. Revert Code Changes

```bash
# Revert to previous commit
git revert HEAD

# Push to main
git push origin main

# Vercel auto-deploys
```

### 2. Remove Database Tables (if needed)

```sql
-- Drop tables in reverse order (foreign keys)
DROP TABLE IF EXISTS twitter_tweet_projections CASCADE;
DROP TABLE IF EXISTS twitter_opinion_clusters CASCADE;
DROP TABLE IF EXISTS twitter_opinion_sessions CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_cleanup_old_sessions ON twitter_opinion_sessions;
DROP TRIGGER IF EXISTS update_projections_updated_at ON twitter_tweet_projections;
DROP TRIGGER IF EXISTS update_clusters_updated_at ON twitter_opinion_clusters;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_old_opinion_map_sessions();
DROP FUNCTION IF EXISTS update_updated_at_column();
```

### 3. Clean Up Existing Data

```sql
-- Remove embeddings if no longer needed
UPDATE twitter_tweets
SET embedding = NULL,
    embedding_model = NULL,
    embedding_created_at = NULL
WHERE zone_id IN (SELECT id FROM zones);
```

---

## Production Best Practices

### 1. Monitor Costs

Track OpenAI usage monthly:
```
Expected: $2-5/month per active zone
Alert if > $10/month per zone
```

### 2. Set Usage Limits

In OpenAI Dashboard:
- Set hard limit: $100/month
- Enable email alerts at $50/month

### 3. Rate Limiting

Consider adding rate limits:
```typescript
// Max 5 clusterings per zone per day
const dailyLimit = 5

const count = await countClusteringsToday(zoneId)
if (count >= dailyLimit) {
  return NextResponse.json(
    { error: 'Daily clustering limit reached' },
    { status: 429 }
  )
}
```

### 4. Backup Strategy

Enable Supabase Point-in-Time Recovery:
- Go to Supabase Dashboard > Settings > Backups
- Enable PITR (7-day retention recommended)

---

**Deployment Status**: ✅ Ready  
**Last Updated**: November 18, 2025  
**Next Review**: After 1 week of production use

