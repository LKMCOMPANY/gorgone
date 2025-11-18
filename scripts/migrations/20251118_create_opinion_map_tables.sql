-- ============================================================================
-- GORGONE V2 - Opinion Map Feature
-- Migration: Create tables for 3D opinion clustering
-- Date: 2025-11-18
-- Author: AI Assistant
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- TABLE 1: twitter_tweet_projections
-- Stores 3D coordinates after dimensionality reduction (UMAP)
-- ============================================================================

CREATE TABLE IF NOT EXISTS twitter_tweet_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_db_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- 3D coordinates (normalized 0-100 range for visualization)
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  z NUMERIC NOT NULL,
  
  -- Cluster assignment
  cluster_id INTEGER NOT NULL,
  cluster_confidence NUMERIC CHECK (cluster_confidence >= 0 AND cluster_confidence <= 1),
  is_outlier BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_tweet_per_session UNIQUE (tweet_db_id, session_id),
  CONSTRAINT valid_coordinates CHECK (
    x IS NOT NULL AND y IS NOT NULL AND z IS NOT NULL
  )
);

-- Indexes for performance
CREATE INDEX idx_projections_zone_session 
  ON twitter_tweet_projections (zone_id, session_id);

CREATE INDEX idx_projections_cluster 
  ON twitter_tweet_projections (session_id, cluster_id) 
  WHERE cluster_id >= 0;

CREATE INDEX idx_projections_session 
  ON twitter_tweet_projections (session_id);

-- Comments
COMMENT ON TABLE twitter_tweet_projections IS 'UMAP 3D projections for opinion map visualization';
COMMENT ON COLUMN twitter_tweet_projections.x IS '3D X coordinate (normalized 0-100)';
COMMENT ON COLUMN twitter_tweet_projections.y IS '3D Y coordinate (normalized 0-100)';
COMMENT ON COLUMN twitter_tweet_projections.z IS '3D Z coordinate (normalized 0-100)';
COMMENT ON COLUMN twitter_tweet_projections.cluster_id IS 'K-means cluster assignment (-1 for outliers)';
COMMENT ON COLUMN twitter_tweet_projections.cluster_confidence IS 'Confidence score for cluster assignment (0-1)';

-- ============================================================================
-- TABLE 2: twitter_opinion_clusters
-- Stores cluster metadata and AI-generated labels
-- ============================================================================

CREATE TABLE IF NOT EXISTS twitter_opinion_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  cluster_id INTEGER NOT NULL,
  
  -- AI-generated metadata
  label TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  reasoning TEXT,
  
  -- Statistics
  tweet_count INTEGER DEFAULT 0 CHECK (tweet_count >= 0),
  
  -- 3D centroid position
  centroid_x NUMERIC NOT NULL,
  centroid_y NUMERIC NOT NULL,
  centroid_z NUMERIC NOT NULL,
  
  -- Sentiment analysis
  avg_sentiment NUMERIC CHECK (avg_sentiment >= -1 AND avg_sentiment <= 1),
  
  -- Quality metrics
  coherence_score NUMERIC CHECK (coherence_score >= 0 AND coherence_score <= 1),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_cluster_per_session UNIQUE (zone_id, session_id, cluster_id),
  CONSTRAINT valid_cluster_id CHECK (cluster_id >= 0)
);

-- Indexes for performance
CREATE INDEX idx_clusters_zone_session 
  ON twitter_opinion_clusters (zone_id, session_id);

CREATE INDEX idx_clusters_session 
  ON twitter_opinion_clusters (session_id);

CREATE INDEX idx_clusters_tweet_count 
  ON twitter_opinion_clusters (session_id, tweet_count DESC);

-- Comments
COMMENT ON TABLE twitter_opinion_clusters IS 'Cluster metadata for opinion map visualization';
COMMENT ON COLUMN twitter_opinion_clusters.label IS 'AI-generated cluster label (GPT-4o-mini)';
COMMENT ON COLUMN twitter_opinion_clusters.keywords IS 'Representative keywords extracted from cluster tweets';
COMMENT ON COLUMN twitter_opinion_clusters.reasoning IS 'AI explanation for cluster label';
COMMENT ON COLUMN twitter_opinion_clusters.coherence_score IS 'Cluster quality metric (higher = more coherent)';

-- ============================================================================
-- TABLE 3: twitter_opinion_sessions
-- Tracks opinion map generation jobs (clustering pipeline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS twitter_opinion_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Job created, not started
    'vectorizing',  -- Generating embeddings
    'reducing',     -- PCA + UMAP dimensionality reduction
    'clustering',   -- K-means clustering
    'labeling',     -- AI cluster labeling
    'completed',    -- Successfully completed
    'failed',       -- Failed with error
    'cancelled'     -- User cancelled
  )),
  
  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_phase TEXT,
  phase_message TEXT,
  
  -- Configuration (JSONB for flexibility)
  config JSONB DEFAULT '{}'::JSONB,
  
  -- Statistics
  total_tweets INTEGER,
  vectorized_tweets INTEGER DEFAULT 0,
  total_clusters INTEGER,
  outlier_count INTEGER,
  execution_time_ms INTEGER,
  
  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_progress CHECK (
    (status = 'completed' AND progress = 100) OR
    (status != 'completed')
  )
);

-- Indexes for performance
CREATE INDEX idx_sessions_zone_recent 
  ON twitter_opinion_sessions (zone_id, created_at DESC);

CREATE INDEX idx_sessions_active 
  ON twitter_opinion_sessions (status, created_at DESC) 
  WHERE status IN ('pending', 'vectorizing', 'reducing', 'clustering', 'labeling');

CREATE INDEX idx_sessions_completed 
  ON twitter_opinion_sessions (zone_id, completed_at DESC NULLS LAST) 
  WHERE status = 'completed';

-- Only one active (non-terminal) session per zone
CREATE UNIQUE INDEX idx_one_active_session_per_zone 
  ON twitter_opinion_sessions (zone_id) 
  WHERE status IN ('pending', 'vectorizing', 'reducing', 'clustering', 'labeling');

-- Comments
COMMENT ON TABLE twitter_opinion_sessions IS 'Opinion map generation job tracking';
COMMENT ON COLUMN twitter_opinion_sessions.session_id IS 'Unique session identifier (zone_id + timestamp)';
COMMENT ON COLUMN twitter_opinion_sessions.config IS 'Job configuration: start_date, end_date, sample_size, sampled_tweet_ids, etc.';
COMMENT ON COLUMN twitter_opinion_sessions.progress IS 'Progress percentage (0-100)';

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to projections table
CREATE TRIGGER update_projections_updated_at
  BEFORE UPDATE ON twitter_tweet_projections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to clusters table
CREATE TRIGGER update_clusters_updated_at
  BEFORE UPDATE ON twitter_opinion_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: Auto-cleanup old sessions (keep only active session per zone)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_opinion_map_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- When a session completes, delete old completed sessions for this zone
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Delete old projections (keep only the newly completed session)
    DELETE FROM twitter_tweet_projections
    WHERE zone_id = NEW.zone_id
      AND session_id != NEW.session_id;
    
    -- Delete old clusters
    DELETE FROM twitter_opinion_clusters
    WHERE zone_id = NEW.zone_id
      AND session_id != NEW.session_id;
    
    -- Delete old completed/failed sessions
    DELETE FROM twitter_opinion_sessions
    WHERE zone_id = NEW.zone_id
      AND id != NEW.id
      AND status IN ('completed', 'failed', 'cancelled');
    
    RAISE NOTICE 'Cleaned up old opinion map data for zone %', NEW.zone_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_old_sessions
  AFTER UPDATE OF status ON twitter_opinion_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION cleanup_old_opinion_map_sessions();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE twitter_tweet_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can do anything
CREATE POLICY "super_admin_all_access_projections" 
  ON twitter_tweet_projections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admin_all_access_clusters" 
  ON twitter_opinion_clusters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admin_all_access_sessions" 
  ON twitter_opinion_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

-- Policy: Client users can only access their zones
CREATE POLICY "client_users_access_projections" 
  ON twitter_tweet_projections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN zones ON zones.client_id = profiles.client_id
      WHERE profiles.id = auth.uid()
        AND zones.id = twitter_tweet_projections.zone_id
    )
  );

CREATE POLICY "client_users_access_clusters" 
  ON twitter_opinion_clusters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN zones ON zones.client_id = profiles.client_id
      WHERE profiles.id = auth.uid()
        AND zones.id = twitter_opinion_clusters.zone_id
    )
  );

CREATE POLICY "client_users_access_sessions" 
  ON twitter_opinion_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN zones ON zones.client_id = profiles.client_id
      WHERE profiles.id = auth.uid()
        AND zones.id = twitter_opinion_sessions.zone_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN zones ON zones.client_id = profiles.client_id
      WHERE profiles.id = auth.uid()
        AND zones.id = twitter_opinion_sessions.zone_id
        AND profiles.role IN ('manager', 'super_admin')
    )
  );

-- ============================================================================
-- INDEXES ON EXISTING TABLES
-- ============================================================================

-- Index for finding non-vectorized tweets (for on-demand embedding)
CREATE INDEX IF NOT EXISTS idx_tweets_needs_embedding 
  ON twitter_tweets (zone_id, twitter_created_at DESC)
  WHERE embedding IS NULL;

-- Index for finding recently vectorized tweets
CREATE INDEX IF NOT EXISTS idx_tweets_recently_vectorized 
  ON twitter_tweets (zone_id, embedding_created_at DESC)
  WHERE embedding IS NOT NULL;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users (RLS will handle fine-grained control)
GRANT SELECT, INSERT, UPDATE, DELETE ON twitter_tweet_projections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON twitter_opinion_clusters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON twitter_opinion_sessions TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify tables exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'twitter_tweet_projections') THEN
    RAISE EXCEPTION 'Table twitter_tweet_projections was not created';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'twitter_opinion_clusters') THEN
    RAISE EXCEPTION 'Table twitter_opinion_clusters was not created';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'twitter_opinion_sessions') THEN
    RAISE EXCEPTION 'Table twitter_opinion_sessions was not created';
  END IF;
  
  RAISE NOTICE '✅ Opinion Map tables created successfully';
  RAISE NOTICE '   - twitter_tweet_projections';
  RAISE NOTICE '   - twitter_opinion_clusters';
  RAISE NOTICE '   - twitter_opinion_sessions';
  RAISE NOTICE '✅ Indexes created (9 total)';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Triggers configured';
END $$;

