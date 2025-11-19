-- Gorgone Media Monitoring Tables V2
-- Event Registry API Integration
-- Created: 2025-11-19
-- Updated: 2025-11-19 (Removed source tags, adjusted based on full API doc)

-- ====================
-- DROP OLD TABLES (if exists from previous version)
-- ====================
DROP TABLE IF EXISTS public.media_source_zone_tags CASCADE;
DROP TABLE IF EXISTS public.media_articles CASCADE;
DROP TABLE IF EXISTS public.media_sources CASCADE;
DROP TABLE IF EXISTS public.media_rules CASCADE;

-- ====================
-- 1. MEDIA ARTICLES
-- ====================
CREATE TABLE public.media_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  
  -- Event Registry identifiers
  article_uri TEXT NOT NULL UNIQUE,
  event_uri TEXT,
  
  -- Article content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT NOT NULL,
  lang TEXT NOT NULL,
  
  -- Publishing info
  published_at TIMESTAMPTZ NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Source info (denormalized for performance)
  source_uri TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_description TEXT,
  source_location_country TEXT,
  source_location_label TEXT,
  
  -- Authors (JSON array)
  authors JSONB DEFAULT '[]'::JSONB,
  
  -- Media
  image_url TEXT,
  videos JSONB DEFAULT '[]'::JSONB,
  
  -- Analysis
  sentiment NUMERIC,
  relevance INTEGER,
  social_score INTEGER DEFAULT 0,
  
  -- Social shares
  shares_facebook INTEGER DEFAULT 0,
  shares_twitter INTEGER DEFAULT 0,
  shares_total INTEGER GENERATED ALWAYS AS (shares_facebook + shares_twitter) STORED,
  
  -- Categories and concepts
  categories JSONB DEFAULT '[]'::JSONB,
  concepts JSONB DEFAULT '[]'::JSONB,
  
  -- Location mentioned in article (dateline)
  location_label TEXT,
  location_country TEXT,
  
  -- Extracted dates
  extracted_dates JSONB DEFAULT '[]'::JSONB,
  
  -- Links found in article
  links JSONB DEFAULT '[]'::JSONB,
  
  -- Duplicate info
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_list JSONB DEFAULT '[]'::JSONB,
  original_article_uri TEXT,
  
  -- Processing
  is_processed BOOLEAN DEFAULT FALSE,
  
  -- Full API response
  raw_data JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for media_articles
CREATE INDEX idx_media_articles_zone_id ON public.media_articles(zone_id);
CREATE INDEX idx_media_articles_zone_published ON public.media_articles(zone_id, published_at DESC);
CREATE INDEX idx_media_articles_source_uri ON public.media_articles(source_uri);
CREATE INDEX idx_media_articles_event_uri ON public.media_articles(event_uri) WHERE event_uri IS NOT NULL;
CREATE INDEX idx_media_articles_published_at ON public.media_articles(published_at DESC);
CREATE INDEX idx_media_articles_lang ON public.media_articles(lang);
CREATE INDEX idx_media_articles_sentiment ON public.media_articles(sentiment DESC) WHERE sentiment IS NOT NULL;
CREATE INDEX idx_media_articles_social_score ON public.media_articles(social_score DESC) WHERE social_score > 0;
CREATE INDEX idx_media_articles_shares ON public.media_articles(shares_total DESC) WHERE shares_total > 0;

-- Full-text search
CREATE INDEX idx_media_articles_text_search ON public.media_articles 
USING GIN(to_tsvector('english', title || ' ' || body));

-- JSONB indexes
CREATE INDEX idx_media_articles_raw_data ON public.media_articles USING GIN(raw_data);
CREATE INDEX idx_media_articles_categories ON public.media_articles USING GIN(categories);
CREATE INDEX idx_media_articles_concepts ON public.media_articles USING GIN(concepts);

COMMENT ON TABLE public.media_articles IS 'Media articles from Event Registry API';
COMMENT ON COLUMN public.media_articles.article_uri IS 'Event Registry unique article identifier';
COMMENT ON COLUMN public.media_articles.sentiment IS 'Sentiment score from -1 (negative) to 1 (positive) - only for English articles';
COMMENT ON COLUMN public.media_articles.social_score IS 'Total social media engagement score';

-- ====================
-- 2. MEDIA SOURCES
-- ====================
CREATE TABLE public.media_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event Registry identifier
  source_uri TEXT NOT NULL UNIQUE,
  
  -- Source info
  title TEXT NOT NULL,
  website_url TEXT,
  description TEXT,
  
  -- Location
  location_country TEXT,
  location_label TEXT,
  
  -- Rankings (if included)
  importance_rank INTEGER,
  alexa_global_rank INTEGER,
  alexa_country_rank INTEGER,
  
  -- Classification
  source_type TEXT,
  language TEXT,
  
  -- Metrics
  article_count INTEGER DEFAULT 0,
  
  -- Tracking
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Full API response
  raw_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for media_sources
CREATE INDEX idx_media_sources_source_uri ON public.media_sources(source_uri);
CREATE INDEX idx_media_sources_country ON public.media_sources(location_country) WHERE location_country IS NOT NULL;
CREATE INDEX idx_media_sources_language ON public.media_sources(language) WHERE language IS NOT NULL;
CREATE INDEX idx_media_sources_article_count ON public.media_sources(article_count DESC);
CREATE INDEX idx_media_sources_importance ON public.media_sources(importance_rank ASC) WHERE importance_rank IS NOT NULL;

-- Full-text search
CREATE INDEX idx_media_sources_text_search ON public.media_sources 
USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

COMMENT ON TABLE public.media_sources IS 'Normalized media sources from Event Registry';

-- ====================
-- 3. MEDIA RULES
-- ====================
CREATE TABLE public.media_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  
  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,
  
  -- Query type
  query_type TEXT NOT NULL CHECK (query_type IN ('simple', 'advanced')),
  
  -- Query configuration (JSONB for flexibility)
  query_config JSONB NOT NULL,
  
  -- Fetch configuration
  fetch_interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (fetch_interval_minutes >= 15),
  articles_per_fetch INTEGER DEFAULT 100 CHECK (articles_per_fetch > 0 AND articles_per_fetch <= 100),
  sort_by TEXT DEFAULT 'date' CHECK (sort_by IN ('date', 'rel', 'sourceImportance', 'socialScore')),
  sort_asc BOOLEAN DEFAULT FALSE,
  
  -- Data type filter
  data_types TEXT[] DEFAULT ARRAY['news']::TEXT[],
  
  -- Time window (7 or 31 days to reduce token usage)
  force_max_data_time_window INTEGER CHECK (force_max_data_time_window IN (7, 31)),
  
  -- Duplicate handling
  duplicate_filter TEXT DEFAULT 'skipDuplicates' CHECK (duplicate_filter IN ('skipDuplicates', 'keepOnlyDuplicates', 'keepAll')),
  
  -- Event filter
  event_filter TEXT DEFAULT 'keepAll' CHECK (event_filter IN ('skipArticlesWithoutEvent', 'keepOnlyArticlesWithoutEvent', 'keepAll')),
  
  -- What to include in response (for optimization)
  include_body BOOLEAN DEFAULT TRUE,
  include_social_score BOOLEAN DEFAULT TRUE,
  include_sentiment BOOLEAN DEFAULT TRUE,
  include_concepts BOOLEAN DEFAULT FALSE,
  include_categories BOOLEAN DEFAULT FALSE,
  include_authors BOOLEAN DEFAULT TRUE,
  include_videos BOOLEAN DEFAULT FALSE,
  include_links BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  last_fetch_status TEXT,
  last_fetch_error TEXT,
  articles_collected INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for media_rules
CREATE INDEX idx_media_rules_zone_id ON public.media_rules(zone_id);
CREATE INDEX idx_media_rules_is_active ON public.media_rules(is_active);
CREATE INDEX idx_media_rules_last_fetched ON public.media_rules(last_fetched_at) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_media_rules_zone_name ON public.media_rules(zone_id, name);

-- JSONB index
CREATE INDEX idx_media_rules_query_config ON public.media_rules USING GIN(query_config);

COMMENT ON TABLE public.media_rules IS 'Media monitoring rules for Event Registry API';
COMMENT ON COLUMN public.media_rules.query_config IS 'JSONB with Event Registry query parameters (keyword, conceptUri, sourceUri, etc.)';
COMMENT ON COLUMN public.media_rules.fetch_interval_minutes IS 'Polling interval in minutes (minimum 15)';

-- ====================
-- 4. AUTO-UPDATE TRIGGERS
-- ====================

CREATE OR REPLACE FUNCTION update_media_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_media_articles_updated_at
BEFORE UPDATE ON public.media_articles
FOR EACH ROW
EXECUTE FUNCTION update_media_articles_updated_at();

CREATE OR REPLACE FUNCTION update_media_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_media_sources_updated_at
BEFORE UPDATE ON public.media_sources
FOR EACH ROW
EXECUTE FUNCTION update_media_sources_updated_at();

CREATE OR REPLACE FUNCTION update_media_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_media_rules_updated_at
BEFORE UPDATE ON public.media_rules
FOR EACH ROW
EXECUTE FUNCTION update_media_rules_updated_at();

-- ====================
-- 5. RLS POLICIES
-- ====================

ALTER TABLE public.media_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_rules ENABLE ROW LEVEL SECURITY;

-- Media Articles Policies
CREATE POLICY "Super admins can manage all media articles"
ON public.media_articles FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Users can view media articles from their client zones"
ON public.media_articles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zones
    JOIN public.profiles ON profiles.client_id = zones.client_id
    WHERE zones.id = media_articles.zone_id AND profiles.id = auth.uid()
  )
);

-- Media Sources Policies
CREATE POLICY "Everyone can view media sources"
ON public.media_sources FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Super admins can manage media sources"
ON public.media_sources FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

-- Media Rules Policies
CREATE POLICY "Super admins can manage all media rules"
ON public.media_rules FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Users can manage media rules from their client zones"
ON public.media_rules FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zones
    JOIN public.profiles ON profiles.client_id = zones.client_id
    WHERE zones.id = media_rules.zone_id AND profiles.id = auth.uid()
  )
);

