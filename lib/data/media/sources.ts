/**
 * Media Sources Data Layer
 * 
 * Handles normalized media source operations.
 * Sources are shared globally across zones (no duplication).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { MediaSource } from "@/types";

/**
 * Get source by Event Registry URI
 * 
 * @param sourceUri - Event Registry source URI (e.g., "bbc.com")
 * @returns Media source or null
 */
export async function getSourceByUri(
  sourceUri: string
): Promise<MediaSource | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_sources")
      .select("*")
      .eq("source_uri", sourceUri)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as MediaSource;
  } catch (error) {
    logger.error(`Failed to fetch source ${sourceUri}`, { error });
    return null;
  }
}

/**
 * Create or update media source
 * Uses source_uri as unique identifier
 * 
 * @param source - Source data to insert/update
 * @returns Created/updated source
 */
export async function upsertSource(
  source: Omit<MediaSource, "id" | "created_at" | "updated_at">
): Promise<MediaSource | null> {
  try {
    const supabase = createAdminClient();

    // Check if source already exists
    const existing = await getSourceByUri(source.source_uri);

    if (existing) {
      // Update existing source
      const { data, error } = await supabase
        .from("media_sources")
        .update({
          title: source.title,
          website_url: source.website_url,
          description: source.description,
          location_country: source.location_country,
          location_label: source.location_label,
          importance_rank: source.importance_rank,
          alexa_global_rank: source.alexa_global_rank,
          alexa_country_rank: source.alexa_country_rank,
          source_type: source.source_type,
          language: source.language,
          article_count: existing.article_count + 1, // Increment count
          last_seen_at: new Date().toISOString(),
          raw_data: source.raw_data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return data as MediaSource;
    } else {
      // Insert new source
      const { data, error } = await supabase
        .from("media_sources")
        .insert([{
          ...source,
          article_count: 1,
        }])
        .select()
        .single();

      if (error) throw error;

      logger.info("Source created", { sourceUri: source.source_uri });

      return data as MediaSource;
    }
  } catch (error) {
    logger.error("Failed to upsert source", { 
      sourceUri: source.source_uri, 
      error 
    });
    return null;
  }
}

/**
 * Search sources by text (title or description)
 * 
 * @param searchText - Text to search for
 * @param limit - Maximum number of results
 * @returns Array of matching sources
 */
export async function searchSources(
  searchText: string,
  limit = 20
): Promise<MediaSource[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_sources")
      .select("*")
      .textSearch("title", searchText, {
        type: "websearch",
        config: "english",
      })
      .order("article_count", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as MediaSource[]) || [];
  } catch (error) {
    logger.error("Failed to search sources", { searchText, error });
    return [];
  }
}

/**
 * Get top sources by article count
 * 
 * @param limit - Number of top sources to return
 * @param country - Optional country filter
 * @returns Array of top sources
 */
export async function getTopSources(
  limit = 50,
  country?: string
): Promise<MediaSource[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("media_sources")
      .select("*")
      .order("article_count", { ascending: false })
      .limit(limit);

    if (country) {
      query = query.eq("location_country", country);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as MediaSource[]) || [];
  } catch (error) {
    logger.error("Failed to get top sources", { error });
    return [];
  }
}

/**
 * Get sources by country
 * 
 * @param country - Country name or code
 * @param limit - Maximum number of results
 * @returns Array of sources from the country
 */
export async function getSourcesByCountry(
  country: string,
  limit = 50
): Promise<MediaSource[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_sources")
      .select("*")
      .eq("location_country", country)
      .order("article_count", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as MediaSource[]) || [];
  } catch (error) {
    logger.error(`Failed to get sources for country ${country}`, { error });
    return [];
  }
}

/**
 * Get sources by language
 * 
 * @param language - Language code (e.g., "eng", "fra")
 * @param limit - Maximum number of results
 * @returns Array of sources in the language
 */
export async function getSourcesByLanguage(
  language: string,
  limit = 50
): Promise<MediaSource[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_sources")
      .select("*")
      .eq("language", language)
      .order("article_count", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as MediaSource[]) || [];
  } catch (error) {
    logger.error(`Failed to get sources for language ${language}`, { error });
    return [];
  }
}

/**
 * Get total source count
 * 
 * @param filters - Optional filters
 * @returns Total number of sources
 */
export async function getSourcesCount(
  filters: {
    country?: string;
    language?: string;
  } = {}
): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { country, language } = filters;

    let query = supabase
      .from("media_sources")
      .select("*", { count: "exact", head: true });

    if (country) {
      query = query.eq("location_country", country);
    }
    if (language) {
      query = query.eq("language", language);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  } catch (error) {
    logger.error("Failed to count sources", { error });
    return 0;
  }
}

/**
 * Update source article count
 * Useful when importing articles in bulk
 * 
 * @param sourceUri - Source URI
 * @param increment - Number to add to article count
 * @returns Updated source
 */
export async function incrementSourceArticleCount(
  sourceUri: string,
  increment: number
): Promise<MediaSource | null> {
  try {
    const supabase = createAdminClient();

    const source = await getSourceByUri(sourceUri);
    if (!source) return null;

    const { data, error } = await supabase
      .from("media_sources")
      .update({
        article_count: source.article_count + increment,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id)
      .select()
      .single();

    if (error) throw error;

    return data as MediaSource;
  } catch (error) {
    logger.error(`Failed to increment article count for source ${sourceUri}`, { error });
    return null;
  }
}

