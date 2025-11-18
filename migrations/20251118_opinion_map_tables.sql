-- ============================================================================
-- GORGONE V2 - Opinion Map Tables (Simplified Migration)
-- Execute in Supabase SQL Editor before deploying
-- ============================================================================

-- Table 1: Projections
CREATE TABLE IF NOT EXISTS twitter_tweet_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_db_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  z NUMERIC NOT NULL,
  cluster_id INTEGER NOT NULL,
  cluster_confidence NUMERIC,
  is_outlier BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tweet_db_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_projections_zone_session ON twitter_tweet_projections (zone_id, session_id);
CREATE INDEX IF NOT EXISTS idx_projections_cluster ON twitter_tweet_projections (session_id, cluster_id) WHERE cluster_id >= 0;

-- Table 2: Clusters
CREATE TABLE IF NOT EXISTS twitter_opinion_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  cluster_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  reasoning TEXT,
  tweet_count INTEGER DEFAULT 0,
  centroid_x NUMERIC NOT NULL,
  centroid_y NUMERIC NOT NULL,
  centroid_z NUMERIC NOT NULL,
  avg_sentiment NUMERIC,
  coherence_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (zone_id, session_id, cluster_id)
);

CREATE INDEX IF NOT EXISTS idx_clusters_zone_session ON twitter_opinion_clusters (zone_id, session_id);

-- Table 3: Sessions
CREATE TABLE IF NOT EXISTS twitter_opinion_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
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
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_zone_recent ON twitter_opinion_sessions (zone_id, created_at DESC);

-- Enable RLS
ALTER TABLE twitter_tweet_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users - RLS in application layer)
CREATE POLICY IF NOT EXISTS "authenticated_access_projections" ON twitter_tweet_projections FOR ALL TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "authenticated_access_clusters" ON twitter_opinion_clusters FOR ALL TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "authenticated_access_sessions" ON twitter_opinion_sessions FOR ALL TO authenticated USING (true);

-- Verify
SELECT '✅ Opinion Map tables ready!' as status;
