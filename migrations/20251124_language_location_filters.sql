-- Migration: Add Language & Location Filters Support
-- Date: 2024-11-24
-- Description: Add language and location filtering for Twitter, TikTok, and Media
-- Strategy: Direct queries with Redis cache (5min TTL) - No materialized views

-- ============================================================================
-- PART 1: UPDATE TIKTOK SCHEMA (Extract language & POI from raw_data)
-- ============================================================================

-- Add language column to tiktok_videos
ALTER TABLE tiktok_videos 
ADD COLUMN IF NOT EXISTS language TEXT;

-- Add POI (Point of Interest) columns to tiktok_videos
ALTER TABLE tiktok_videos 
ADD COLUMN IF NOT EXISTS poi_name TEXT,
ADD COLUMN IF NOT EXISTS poi_address TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_language ON tiktok_videos(language) WHERE language IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_poi_address ON tiktok_videos(poi_address) WHERE poi_address IS NOT NULL;

-- Migrate existing data from raw_data to new columns
UPDATE tiktok_videos 
SET 
  language = raw_data->>'textLanguage',
  poi_name = raw_data->'poi'->>'name',
  poi_address = raw_data->'poi'->>'address'
WHERE raw_data IS NOT NULL
  AND (language IS NULL OR poi_name IS NULL OR poi_address IS NULL);

-- ============================================================================
-- PART 2: PERFORMANCE INDEXES (For direct queries)
-- ============================================================================

-- These indexes ensure fast queries when fetching filter options from Redis cache misses

-- Twitter: Already has good indexes on zone_id and lang
-- Additional composite index for location queries if needed
CREATE INDEX IF NOT EXISTS idx_twitter_profiles_location ON twitter_profiles(location) WHERE location IS NOT NULL AND location != '';

-- Media: Already has good indexes, ensure we have one on source_location_country
CREATE INDEX IF NOT EXISTS idx_media_articles_source_country ON media_articles(source_location_country) WHERE source_location_country IS NOT NULL;

-- TikTok: Indexes already created in Part 1

-- ============================================================================
-- PART 3: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN tiktok_videos.language IS 'Video language extracted from textLanguage (ISO 639-1) - cached in Redis for 5min';
COMMENT ON COLUMN tiktok_videos.poi_name IS 'Point of Interest name if user tagged a location';
COMMENT ON COLUMN tiktok_videos.poi_address IS 'Point of Interest address (city, country) - cached in Redis for 5min';

-- ============================================================================
-- NOTE: Filter options are now cached in Redis with 5-minute TTL
-- No materialized views or cron jobs needed
-- Cache keys: filters:{source}:{zoneId}:languages and filters:{source}:{zoneId}:locations
-- ============================================================================

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

