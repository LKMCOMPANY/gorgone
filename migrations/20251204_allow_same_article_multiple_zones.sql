-- ================================================================
-- GORGONE MEDIA: Allow Same Article in Multiple Zones
-- ================================================================
-- Date: 2025-12-04
-- Goal: Enable the same article to appear in multiple zones/clients
-- Pattern: Normalized articles + junction table (like Twitter)
-- ================================================================

-- ================================================================
-- STEP 1: Create Junction Table (Zero-Downtime)
-- ================================================================

-- Many-to-many relationship between articles and zones
CREATE TABLE IF NOT EXISTS public.media_article_zones (
  article_id UUID NOT NULL REFERENCES public.media_articles(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  
  -- Metadata for this specific zone relationship
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  rule_id UUID REFERENCES public.media_rules(id) ON DELETE SET NULL,
  
  -- Composite primary key
  PRIMARY KEY (article_id, zone_id)
);

-- Indexes for performance
CREATE INDEX idx_media_article_zones_zone_id 
  ON public.media_article_zones(zone_id);

CREATE INDEX idx_media_article_zones_article_id 
  ON public.media_article_zones(article_id);

CREATE INDEX idx_media_article_zones_collected 
  ON public.media_article_zones(zone_id, collected_at DESC);

COMMENT ON TABLE public.media_article_zones IS 'Junction table: allows same article in multiple zones (many-to-many)';
COMMENT ON COLUMN public.media_article_zones.rule_id IS 'Which rule collected this article for this zone';

-- ================================================================
-- STEP 2: Migrate Existing Data
-- ================================================================

-- Populate junction table with existing article-zone relationships
INSERT INTO public.media_article_zones (article_id, zone_id, collected_at)
SELECT 
  id,
  zone_id,
  collected_at
FROM public.media_articles
ON CONFLICT (article_id, zone_id) DO NOTHING;

-- Log migration result
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM public.media_article_zones;
  RAISE NOTICE 'Migrated % article-zone relationships', migrated_count;
END $$;

-- ================================================================
-- STEP 3: Remove Old UNIQUE Constraint
-- ================================================================

-- Drop the global UNIQUE constraint on article_uri
-- This allows the same article_uri to exist multiple times (once per zone)
ALTER TABLE public.media_articles 
  DROP CONSTRAINT IF EXISTS media_articles_article_uri_key;

-- ================================================================
-- STEP 4: Add New Composite UNIQUE Constraint
-- ================================================================

-- Create composite UNIQUE index: article_uri is unique PER ZONE
-- This prevents duplicate articles within the same zone
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_articles_zone_uri 
  ON public.media_articles(zone_id, article_uri);

COMMENT ON INDEX idx_media_articles_zone_uri IS 'Ensures article_uri is unique per zone (allows same article in different zones)';

-- ================================================================
-- STEP 5: RLS Policies for Junction Table
-- ================================================================

ALTER TABLE public.media_article_zones ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all article-zone relationships
CREATE POLICY "Super admins can manage all article zones"
ON public.media_article_zones FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

-- Users can view article-zone relationships from their client zones
CREATE POLICY "Users can view article zones from their client"
ON public.media_article_zones FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zones
    JOIN public.profiles ON profiles.client_id = zones.client_id
    WHERE zones.id = media_article_zones.zone_id 
      AND profiles.id = auth.uid()
  )
);

-- ================================================================
-- STEP 6: Create Helper Functions
-- ================================================================

-- Function: Get articles for a zone via junction table
CREATE OR REPLACE FUNCTION get_media_articles_for_zone(
  p_zone_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  article_uri TEXT,
  title TEXT,
  body TEXT,
  url TEXT,
  lang TEXT,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  source_title TEXT,
  source_location_country TEXT,
  sentiment NUMERIC,
  social_score INTEGER,
  shares_facebook INTEGER,
  shares_twitter INTEGER,
  image_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ma.id,
    ma.article_uri,
    ma.title,
    ma.body,
    ma.url,
    ma.lang,
    ma.published_at,
    maz.collected_at,
    ma.source_title,
    ma.source_location_country,
    ma.sentiment,
    ma.social_score,
    ma.shares_facebook,
    ma.shares_twitter,
    ma.image_url
  FROM public.media_articles ma
  JOIN public.media_article_zones maz ON maz.article_id = ma.id
  WHERE maz.zone_id = p_zone_id
  ORDER BY maz.collected_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_media_articles_for_zone IS 'Fetch articles for a specific zone via junction table';

-- Function: Get article count per zone
CREATE OR REPLACE FUNCTION get_media_article_count_for_zone(p_zone_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  article_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO article_count
  FROM public.media_article_zones
  WHERE zone_id = p_zone_id;
  
  RETURN article_count;
END;
$$;

COMMENT ON FUNCTION get_media_article_count_for_zone IS 'Count articles for a specific zone';

-- Function: Link existing article to new zone (deduplication)
CREATE OR REPLACE FUNCTION link_article_to_zone(
  p_article_id UUID,
  p_zone_id UUID,
  p_rule_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.media_article_zones (article_id, zone_id, rule_id, collected_at)
  VALUES (p_article_id, p_zone_id, p_rule_id, NOW())
  ON CONFLICT (article_id, zone_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION link_article_to_zone IS 'Link an existing article to a zone (for deduplication)';

-- ================================================================
-- STEP 7: Update Existing Indexes (Optimization)
-- ================================================================

-- Drop old single-column indexes that are now redundant
DROP INDEX IF EXISTS public.idx_media_articles_zone_id;

-- Create optimized composite indexes
CREATE INDEX IF NOT EXISTS idx_media_articles_zone_published 
  ON public.media_articles(zone_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_articles_zone_sentiment 
  ON public.media_articles(zone_id, sentiment DESC) 
  WHERE sentiment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_articles_zone_social 
  ON public.media_articles(zone_id, social_score DESC) 
  WHERE social_score > 0;

-- ================================================================
-- STEP 8: Verification Queries (for testing)
-- ================================================================

-- Check if migration was successful
DO $$
DECLARE
  articles_count INTEGER;
  junction_count INTEGER;
  zones_with_articles INTEGER;
BEGIN
  SELECT COUNT(*) INTO articles_count FROM public.media_articles;
  SELECT COUNT(*) INTO junction_count FROM public.media_article_zones;
  SELECT COUNT(DISTINCT zone_id) INTO zones_with_articles FROM public.media_article_zones;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Verification:';
  RAISE NOTICE 'Total articles: %', articles_count;
  RAISE NOTICE 'Junction records: %', junction_count;
  RAISE NOTICE 'Zones with articles: %', zones_with_articles;
  RAISE NOTICE '========================================';
  
  -- Alert if junction count < articles count (data loss)
  IF junction_count < articles_count THEN
    RAISE WARNING 'Junction records (%) < Articles (%). Investigate data migration!', 
      junction_count, articles_count;
  END IF;
END $$;

-- ================================================================
-- SUCCESS! 🎉
-- ================================================================
-- Next Steps:
-- 1. Update article-fetcher.ts worker to use junction table
-- 2. Update articles.ts data layer to query via junction
-- 3. Test with multiple zones/clients
-- ================================================================

