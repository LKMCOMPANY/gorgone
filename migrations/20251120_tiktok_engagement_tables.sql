-- =====================================================
-- GORGONE V2 - TikTok Integration
-- Migration: Engagement Tracking Tables
-- Date: 2025-11-20
-- =====================================================

-- =====================================================
-- TABLE 1: tiktok_engagement_history
-- Time-series snapshots of video engagement
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tiktok_engagement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.tiktok_videos(id) ON DELETE CASCADE,
  
  -- Snapshot values (5 metrics)
  play_count BIGINT DEFAULT 0,
  digg_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  collect_count INTEGER DEFAULT 0,
  total_engagement BIGINT GENERATED ALWAYS AS (
    play_count + digg_count + comment_count + share_count + collect_count
  ) STORED,
  
  -- Deltas (change since last snapshot)
  delta_play_count BIGINT DEFAULT 0,
  delta_digg_count INTEGER DEFAULT 0,
  delta_comment_count INTEGER DEFAULT 0,
  delta_share_count INTEGER DEFAULT 0,
  delta_collect_count INTEGER DEFAULT 0,
  
  -- Velocity (engagement per hour)
  engagement_velocity NUMERIC,
  
  -- Timestamps
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tiktok_engagement_history_video_id 
  ON public.tiktok_engagement_history(video_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_engagement_history_video_snapshot 
  ON public.tiktok_engagement_history(video_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_engagement_history_snapshot_at 
  ON public.tiktok_engagement_history(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_engagement_history_velocity 
  ON public.tiktok_engagement_history(engagement_velocity DESC);

-- =====================================================
-- TABLE 2: tiktok_engagement_tracking
-- Tiered engagement update scheduling
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tiktok_engagement_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_db_id UUID NOT NULL REFERENCES public.tiktok_videos(id) ON DELETE CASCADE,
  
  -- Tiered tracking strategy
  tier TEXT NOT NULL CHECK (tier IN ('ultra_hot', 'hot', 'warm', 'cold')),
  
  -- Scheduling
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  next_update_at TIMESTAMPTZ,
  update_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One tracking record per video
  UNIQUE(video_db_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tiktok_engagement_tracking_tier 
  ON public.tiktok_engagement_tracking(tier);
CREATE INDEX IF NOT EXISTS idx_tiktok_engagement_tracking_next_update 
  ON public.tiktok_engagement_tracking(next_update_at) 
  WHERE tier != 'cold';
CREATE INDEX IF NOT EXISTS idx_tiktok_engagement_tracking_video_id 
  ON public.tiktok_engagement_tracking(video_db_id);

-- =====================================================
-- TABLE 3: tiktok_profile_snapshots
-- Profile stats evolution over time
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tiktok_profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.tiktok_profiles(id) ON DELETE CASCADE,
  
  -- Snapshot values
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  heart_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  
  -- Deltas (change since last snapshot)
  delta_follower_count INTEGER DEFAULT 0,
  delta_following_count INTEGER DEFAULT 0,
  delta_heart_count BIGINT DEFAULT 0,
  delta_video_count INTEGER DEFAULT 0,
  
  -- Growth rate
  follower_growth_rate NUMERIC,
  
  -- Timestamps
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tiktok_profile_snapshots_profile_id 
  ON public.tiktok_profile_snapshots(profile_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_profile_snapshots_profile_snapshot 
  ON public.tiktok_profile_snapshots(profile_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_profile_snapshots_snapshot_at 
  ON public.tiktok_profile_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_profile_snapshots_growth_rate 
  ON public.tiktok_profile_snapshots(follower_growth_rate DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.tiktok_engagement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_engagement_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_profile_snapshots ENABLE ROW LEVEL SECURITY;

-- Engagement history
CREATE POLICY "Users can view tiktok_engagement_history from their zones"
  ON public.tiktok_engagement_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tiktok_videos v
      INNER JOIN public.zones z ON z.id = v.zone_id
      INNER JOIN public.profiles p ON p.client_id = z.client_id
      WHERE v.id = video_id AND p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
    )
  );

-- Engagement tracking
CREATE POLICY "Users can view tiktok_engagement_tracking from their zones"
  ON public.tiktok_engagement_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tiktok_videos v
      INNER JOIN public.zones z ON z.id = v.zone_id
      INNER JOIN public.profiles p ON p.client_id = z.client_id
      WHERE v.id = video_db_id AND p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
    )
  );

-- Profile snapshots
CREATE POLICY "Users can view tiktok_profile_snapshots"
  ON public.tiktok_profile_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      INNER JOIN public.profiles p ON p.client_id = z.client_id
      WHERE p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- VALIDATION
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('tiktok_engagement_history', 'tiktok_engagement_tracking', 'tiktok_profile_snapshots')
  ) THEN
    RAISE NOTICE 'TikTok engagement tables created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create TikTok engagement tables';
  END IF;
END $$;

