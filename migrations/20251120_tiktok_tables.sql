-- =====================================================
-- GORGONE V2 - TikTok Integration
-- Migration: TikTok Tables (Phase 1 - Rules)
-- Date: 2025-11-20
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: tiktok_profiles
-- Normalized TikTok user profiles (no duplication)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tiktok_profiles (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_user_id TEXT UNIQUE NOT NULL,
  sec_uid TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  nickname TEXT NOT NULL,
  
  -- Profile Information
  signature TEXT,
  avatar_thumb TEXT,
  avatar_medium TEXT,
  avatar_larger TEXT,
  region TEXT,
  language TEXT,
  
  -- Flags
  is_verified BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  
  -- Current Stats (latest snapshot)
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  heart_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  
  -- Bio Link
  bio_link_url TEXT,
  
  -- Metadata
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_videos_collected INTEGER DEFAULT 0,
  
  -- Raw data from API
  raw_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tiktok_profiles
CREATE INDEX IF NOT EXISTS idx_tiktok_profiles_tiktok_user_id ON public.tiktok_profiles(tiktok_user_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_profiles_username ON public.tiktok_profiles(username);
CREATE INDEX IF NOT EXISTS idx_tiktok_profiles_sec_uid ON public.tiktok_profiles(sec_uid);
CREATE INDEX IF NOT EXISTS idx_tiktok_profiles_follower_count ON public.tiktok_profiles(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_profiles_last_seen ON public.tiktok_profiles(last_seen_at DESC);

-- =====================================================
-- TABLE 2: tiktok_rules
-- TikTok monitoring rules (polling-based)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tiktok_rules (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  
  -- Rule Configuration
  rule_type TEXT NOT NULL CHECK (rule_type IN ('keyword', 'hashtag', 'user', 'combined')),
  rule_name TEXT NOT NULL,
  
  -- Query Parameters (based on rule_type)
  query TEXT, -- For keyword/combined types
  hashtag TEXT, -- For hashtag type (without #)
  username TEXT, -- For user type (without @)
  sec_uid TEXT, -- Cached secUid for user type
  country TEXT, -- Optional country filter (ISO code)
  
  -- Polling Configuration
  interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes IN (60, 180, 360)),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_polled_at TIMESTAMPTZ,
  next_poll_at TIMESTAMPTZ,
  
  -- Statistics
  total_videos_collected INTEGER DEFAULT 0,
  last_video_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(zone_id, rule_name)
);

-- Indexes for tiktok_rules
CREATE INDEX IF NOT EXISTS idx_tiktok_rules_zone_id ON public.tiktok_rules(zone_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_rules_rule_type ON public.tiktok_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_tiktok_rules_is_active ON public.tiktok_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_tiktok_rules_next_poll ON public.tiktok_rules(next_poll_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tiktok_rules_last_polled ON public.tiktok_rules(last_polled_at DESC) WHERE is_active = TRUE;

-- =====================================================
-- TABLE 3: tiktok_videos (simplified for now, full schema later)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tiktok_videos (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  video_id TEXT UNIQUE NOT NULL,
  author_profile_id UUID REFERENCES public.tiktok_profiles(id),
  
  -- Content
  description TEXT,
  
  -- Video Metadata
  duration INTEGER,
  height INTEGER,
  width INTEGER,
  cover_url TEXT,
  share_url TEXT,
  
  -- Timestamps
  tiktok_created_at TIMESTAMPTZ NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Engagement Stats (snapshot at collection)
  play_count BIGINT DEFAULT 0,
  digg_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  collect_count INTEGER DEFAULT 0,
  total_engagement BIGINT GENERATED ALWAYS AS (
    play_count + digg_count + comment_count + share_count + collect_count
  ) STORED,
  
  -- Music
  music_id TEXT,
  music_title TEXT,
  music_author TEXT,
  
  -- Flags
  is_ad BOOLEAN DEFAULT FALSE,
  
  -- Raw data
  raw_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tiktok_videos
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_zone_id ON public.tiktok_videos(zone_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_video_id ON public.tiktok_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_author_profile_id ON public.tiktok_videos(author_profile_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_zone_created ON public.tiktok_videos(zone_id, tiktok_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_zone_engagement ON public.tiktok_videos(zone_id, total_engagement DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_created_at ON public.tiktok_videos(tiktok_created_at DESC);

-- =====================================================
-- TABLE 4: tiktok_entities (hashtags & mentions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tiktok_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.tiktok_videos(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  
  entity_type TEXT NOT NULL CHECK (entity_type IN ('hashtag', 'mention')),
  entity_value TEXT NOT NULL,
  entity_normalized TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tiktok_entities
CREATE INDEX IF NOT EXISTS idx_tiktok_entities_video_id ON public.tiktok_entities(video_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_entities_zone_id ON public.tiktok_entities(zone_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_entities_type ON public.tiktok_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_tiktok_entities_normalized ON public.tiktok_entities(entity_normalized);
CREATE INDEX IF NOT EXISTS idx_tiktok_entities_zone_type_normalized ON public.tiktok_entities(zone_id, entity_type, entity_normalized);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.tiktok_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_entities ENABLE ROW LEVEL SECURITY;

-- Policies for tiktok_profiles (read-only for now)
CREATE POLICY "Users can view tiktok_profiles from their client zones"
  ON public.tiktok_profiles FOR SELECT
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

-- Policies for tiktok_rules
CREATE POLICY "Users can view tiktok_rules from their client zones"
  ON public.tiktok_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      INNER JOIN public.profiles p ON p.client_id = z.client_id
      WHERE z.id = zone_id AND p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Managers and admins can create tiktok_rules"
  ON public.tiktok_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zones z
      INNER JOIN public.profiles p ON p.client_id = z.client_id
      WHERE z.id = zone_id 
        AND p.id = auth.uid() 
        AND p.role IN ('super_admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can update tiktok_rules"
  ON public.tiktok_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      INNER JOIN public.profiles p ON p.client_id = z.client_id
      WHERE z.id = zone_id 
        AND p.id = auth.uid() 
        AND p.role IN ('super_admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can delete tiktok_rules"
  ON public.tiktok_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      INNER JOIN public.profiles p ON p.client_id = z.client_id
      WHERE z.id = zone_id 
        AND p.id = auth.uid() 
        AND p.role IN ('super_admin', 'manager')
    )
  );

-- Policies for tiktok_videos
CREATE POLICY "Users can view tiktok_videos from their client zones"
  ON public.tiktok_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      INNER JOIN public.profiles p ON p.client_id = z.client_id
      WHERE z.id = zone_id AND p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
    )
  );

-- Policies for tiktok_entities
CREATE POLICY "Users can view tiktok_entities from their client zones"
  ON public.tiktok_entities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      INNER JOIN public.profiles p ON p.client_id = z.client_id
      WHERE z.id = zone_id AND p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tiktok_profiles_updated_at
  BEFORE UPDATE ON public.tiktok_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tiktok_rules_updated_at
  BEFORE UPDATE ON public.tiktok_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tiktok_videos_updated_at
  BEFORE UPDATE ON public.tiktok_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA / VALIDATION
-- =====================================================

-- Verify tables were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('tiktok_profiles', 'tiktok_rules', 'tiktok_videos', 'tiktok_entities')
  ) THEN
    RAISE NOTICE 'TikTok tables created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create TikTok tables';
  END IF;
END $$;

