# Opinion Map V2 - Testing Guide

**Date**: November 18, 2025  
**Status**: Ready for Testing

---

## ⚠️ BEFORE TESTING

### Critical: Add OpenAI API Key

**The opinion map WILL NOT WORK without OpenAI API key!**

**Steps**:
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key (starts with `sk-...`)
4. Open file: `/Users/lkm/Desktop/GORGONEANALYSIS/gorgone/.env.local`
5. Add line: `OPENAI_API_KEY=sk-your-key-here`
6. Save file
7. Restart dev server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

---

## 🚀 Dev Server Started

**URL**: http://localhost:3000

**Status**: Server is running in background

To view logs:
```bash
cd /Users/lkm/Desktop/GORGONEANALYSIS/gorgone
# Server is already running, just open browser
```

---

## 📋 Pre-Test Setup

### 1. Run Database Migration

**Go to**: https://rgegkezdegibgbdqzesd.supabase.co/project/rgegkezdegibgbdqzesd/sql

**Execute this SQL**:

```sql
-- Copy entire content from:
-- /Users/lkm/Desktop/GORGONEANALYSIS/gorgone/scripts/migrations/20251118_create_opinion_map_tables.sql

-- Or run this shortened version:

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create projections table
CREATE TABLE IF NOT EXISTS twitter_tweet_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_db_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  z NUMERIC NOT NULL,
  cluster_id INTEGER NOT NULL,
  cluster_confidence NUMERIC CHECK (cluster_confidence >= 0 AND cluster_confidence <= 1),
  is_outlier BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_tweet_per_session UNIQUE (tweet_db_id, session_id)
);

CREATE INDEX idx_projections_zone_session ON twitter_tweet_projections (zone_id, session_id);
CREATE INDEX idx_projections_cluster ON twitter_tweet_projections (session_id, cluster_id) WHERE cluster_id >= 0;

-- Create clusters table
CREATE TABLE IF NOT EXISTS twitter_opinion_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  cluster_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  reasoning TEXT,
  tweet_count INTEGER DEFAULT 0 CHECK (tweet_count >= 0),
  centroid_x NUMERIC NOT NULL,
  centroid_y NUMERIC NOT NULL,
  centroid_z NUMERIC NOT NULL,
  avg_sentiment NUMERIC CHECK (avg_sentiment >= -1 AND avg_sentiment <= 1),
  coherence_score NUMERIC CHECK (coherence_score >= 0 AND coherence_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_cluster_per_session UNIQUE (zone_id, session_id, cluster_id)
);

CREATE INDEX idx_clusters_zone_session ON twitter_opinion_clusters (zone_id, session_id);

-- Create sessions table
CREATE TABLE IF NOT EXISTS twitter_opinion_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'vectorizing', 'reducing', 'clustering', 
    'labeling', 'completed', 'failed', 'cancelled'
  )),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_phase TEXT,
  phase_message TEXT,
  config JSONB DEFAULT '{}'::JSONB,
  total_tweets INTEGER,
  vectorized_tweets INTEGER DEFAULT 0,
  total_clusters INTEGER,
  outlier_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_sessions_zone_recent ON twitter_opinion_sessions (zone_id, created_at DESC);

-- Enable RLS
ALTER TABLE twitter_tweet_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simplified for testing)
CREATE POLICY "allow_all_for_authenticated" ON twitter_tweet_projections FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_for_authenticated" ON twitter_opinion_clusters FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_for_authenticated" ON twitter_opinion_sessions FOR ALL TO authenticated USING (true);

-- Verify
SELECT 'Tables created successfully!' as status;
```

**Expected output**: "Tables created successfully!"

### 2. Verify Zone Has Twitter Data

**Check if you have tweets**:
```sql
SELECT 
  zone_id,
  COUNT(*) as tweet_count
FROM twitter_tweets
GROUP BY zone_id
ORDER BY tweet_count DESC;
```

**If no tweets**, you need to:
1. Create a monitoring rule in Settings > Twitter
2. Wait for tweets to arrive via webhook
3. Or insert test data manually

---

## 🧪 Testing Procedure

### Test 1: Basic Generation (Small Dataset)

**Goal**: Verify pipeline works end-to-end

**Steps**:
1. Open browser: http://localhost:3000
2. Login
3. Go to: Dashboard > Zones > [Select Zone] > Analysis
4. You should see "Generate Opinion Map" button
5. Select:
   - Period: "Last 24 hours"
   - Sample: "1,000 tweets"
6. Click "Generate Opinion Map"
7. **Watch progress bar** (should update every few seconds)
8. **Expected time**: 30-60 seconds

**Expected Result**:
- ✅ Progress bar updates: 0% → 20% → 40% → 60% → 80% → 100%
- ✅ Phase messages change: "Checking embeddings" → "Running PCA" → etc.
- ✅ 3D visualization appears when complete
- ✅ Evolution chart shows data
- ✅ Clusters appear in sidebar
- ✅ Can click on points and see tweets

**Verify in Database**:
```sql
-- Check session completed
SELECT status, progress, total_clusters
FROM twitter_opinion_sessions
WHERE zone_id = 'your-zone-id'
ORDER BY created_at DESC
LIMIT 1;

-- Check projections saved
SELECT COUNT(*) FROM twitter_tweet_projections
WHERE zone_id = 'your-zone-id';

-- Check clusters created
SELECT cluster_id, label, tweet_count
FROM twitter_opinion_clusters
WHERE zone_id = 'your-zone-id'
ORDER BY tweet_count DESC;
```

### Test 2: Medium Dataset

**Repeat Test 1 with**:
- Period: "Last 7 days"
- Sample: "5,000 tweets"

**Expected time**: 1-2 minutes

### Test 3: Large Dataset

**Repeat Test 1 with**:
- Period: "Last 30 days"
- Sample: "10,000 tweets"

**Expected time**: 3-4 minutes

### Test 4: Cache Verification

**Goal**: Verify embeddings are reused

**Steps**:
1. Generate opinion map (wait for completion)
2. **Immediately generate again** (same period, same sample size)
3. **Watch the progress** - should skip vectorization

**Expected**:
- Progress jumps quickly through vectorization (0% → 20%)
- Phase message shows "mostly cached"
- Second generation **faster than first** (1-2 min vs 3-4 min)

**Verify in Logs**:
```
[Vectorization] All tweets already vectorized (100% cache hit)
```

---

## 🎮 Interactive Tests

### Test 5: 3D Interactions

**Hover on point**:
- [ ] Tooltip appears with tweet preview
- [ ] Point scales up slightly
- [ ] No lag (smooth)

**Click on point**:
- [ ] Point super-glows (2x size, white)
- [ ] Cluster points glow (1.2x size)
- [ ] Other points fade (30% opacity)
- [ ] Sidebar switches to "Tweets" tab
- [ ] Slider shows selected tweet
- [ ] Transitions are smooth (250ms)

**Click on centroid (sphere)**:
- [ ] Selects cluster
- [ ] Shows first tweet of cluster
- [ ] Same visual effects as point click

**Drag to rotate**:
- [ ] Camera orbits smoothly
- [ ] No jitter
- [ ] 60 FPS maintained

**Scroll to zoom**:
- [ ] Zooms in/out smoothly
- [ ] No lag

### Test 6: Evolution Chart

**Hover on curve**:
- [ ] Curve gets thicker
- [ ] Other curves fade
- [ ] Tooltip shows cluster name + count
- [ ] Corresponding cluster points glow in 3D

**Click on curve**:
- [ ] Selects cluster
- [ ] Switches to Tweets tab
- [ ] Shows first tweet

### Test 7: Tweet Slider

**Click → button**:
- [ ] Shows next tweet
- [ ] Slide animation (200ms)
- [ ] Point in 3D pulses/hovers
- [ ] Keyboard ← → works

**Check confidence indicator**:
- [ ] Shows percentage (0-100%)
- [ ] Progress bar filled correctly

---

## 🐛 Common Issues & Solutions

### Issue: "No tweets found in selected period"

**Solution**:
- Check if zone has Twitter data
- Select longer period
- Verify monitoring rules are active

### Issue: "Failed to generate opinion map"

**Check Vercel logs**:
```bash
# In terminal
vercel logs --follow
```

**Common causes**:
- OpenAI API key missing/invalid
- QStash not configured
- Database migration not run

### Issue: "Progress stuck at X%"

**Solution**:
- Check QStash dashboard for failed jobs
- Check Vercel function logs
- Verify no timeout errors

**Recovery**:
- Click "Cancel" button
- Try again with smaller sample size

### Issue: "3D canvas is black/empty"

**Solution**:
- Check browser console for Three.js errors
- Try different browser (Chrome recommended)
- Verify WebGL supported: https://get.webgl.org/

### Issue: "TypeError: Cannot read property 'embedding'"

**Solution**:
- Some tweets lack embeddings
- This is normal on first run
- Worker will vectorize them automatically

---

## 📊 Success Criteria

After all tests pass:

✅ **Pipeline completes** for 100, 1K, 5K, and 10K tweets  
✅ **Cache works** (second run faster)  
✅ **3D renders** at 60 FPS  
✅ **Interactions work** (hover, click, slider)  
✅ **Progress updates** in real-time  
✅ **No errors** in console  
✅ **Clusters make sense** (AI labels are meaningful)  
✅ **Evolution chart** shows temporal distribution

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅
1. Deploy to production (Vercel)
2. Run same tests on production
3. Monitor for 24h
4. Gather user feedback
5. Iterate on UX if needed

### If Issues Found ❌
1. Document the issue
2. Check logs and error messages
3. Fix the bug
4. Re-test
5. Repeat until all tests pass

---

## 📞 Quick Start (TL;DR)

```bash
# 1. Add OpenAI key to .env.local
echo "OPENAI_API_KEY=sk-your-key" >> .env.local

# 2. Server already running at http://localhost:3000

# 3. Run migration in Supabase SQL Editor

# 4. Login and go to Zone > Analysis

# 5. Click "Generate Opinion Map"

# 6. Wait 2-4 minutes

# 7. Explore 3D visualization! 🎉
```

---

**Testing Status**: ⏳ Awaiting OpenAI API Key  
**Server Status**: ✅ Running on http://localhost:3000  
**Database**: ⏳ Needs migration

