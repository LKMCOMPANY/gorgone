/**
 * Media Articles Data Layer
 * 
 * Handles all article-related database operations for Event Registry integration.
 * Follows the same patterns as Twitter data layer for consistency.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { VERIFIED_SOURCE_URIS } from "@/lib/data/media/verified-sources";
import type { MediaArticle } from "@/types";

/**
 * Get articles by zone with pagination and filters
 * 
 * @param zoneId - Zone ID to fetch articles for
 * @param options - Query options (pagination, date range, filters)
 * @returns Array of media articles
 */
export async function getArticlesByZone(
  zoneId: string,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    lang?: string[];
    sourceUri?: string[];
    sourceLocationCountry?: string[];
    minSentiment?: number;
    maxSentiment?: number;
    searchText?: string;
    sortBy?: "published_at" | "social_score" | "sentiment";
    sortAsc?: boolean;
    verifiedOnly?: boolean;
  } = {}
): Promise<MediaArticle[]> {
  try {
    const supabase = createAdminClient();
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      lang,
      sourceUri,
      sourceLocationCountry,
      minSentiment,
      maxSentiment,
      searchText,
      sortBy = "published_at",
      sortAsc = false,
      verifiedOnly = false,
    } = options;

    let query = supabase
      .from("media_articles")
      .select("*")
      .eq("zone_id", zoneId)
      .order(sortBy, { ascending: sortAsc })
      .range(offset, offset + limit - 1);

    // Date filters
    if (startDate) {
      query = query.gte("published_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("published_at", endDate.toISOString());
    }

    // Language filter
    if (lang && lang.length > 0) {
      query = query.in("lang", lang);
    }

    // Source filter
    if (sourceUri && sourceUri.length > 0) {
      query = query.in("source_uri", sourceUri);
    }

    // Location filter (NEW) - filter by source country
    if (sourceLocationCountry && sourceLocationCountry.length > 0) {
      query = query.in("source_location_country", sourceLocationCountry);
    }

    // Verified media filter
    if (verifiedOnly) {
      const verifiedSourcesArray = Array.from(VERIFIED_SOURCE_URIS);
      query = query.in("source_uri", verifiedSourcesArray);
    }

    // Sentiment filters
    if (minSentiment !== undefined) {
      query = query.gte("sentiment", minSentiment);
    }
    if (maxSentiment !== undefined) {
      query = query.lte("sentiment", maxSentiment);
    }

    // Full-text search
    if (searchText) {
      query = query.textSearch("title", searchText, {
        type: "websearch",
        config: "english",
      });
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching articles by zone", { zoneId, error });
      throw error;
    }

    return (data as MediaArticle[]) || [];
  } catch (error) {
    logger.error(`Failed to fetch articles for zone ${zoneId}`, { error });
    return [];
  }
}

/**
 * Get article by internal database ID
 * 
 * @param articleId - Internal article ID
 * @returns Media article or null
 */
export async function getArticleById(
  articleId: string
): Promise<MediaArticle | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as MediaArticle;
  } catch (error) {
    logger.error(`Failed to fetch article ${articleId}`, { error });
    return null;
  }
}

/**
 * Get article by Event Registry URI
 * 
 * @param articleUri - Event Registry article URI
 * @returns Media article or null
 */
export async function getArticleByUri(
  articleUri: string
): Promise<MediaArticle | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_articles")
      .select("*")
      .eq("article_uri", articleUri)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as MediaArticle;
  } catch (error) {
    logger.error(`Failed to fetch article by URI ${articleUri}`, { error });
    return null;
  }
}

/**
 * Create or update media article
 * Uses article_uri as unique identifier for deduplication
 * 
 * @param article - Article data to insert/update
 * @returns Created/updated article
 */
export async function upsertArticle(
  article: Omit<MediaArticle, "id" | "created_at" | "updated_at" | "shares_total">
): Promise<MediaArticle | null> {
  try {
    const supabase = createAdminClient();

    // Check if article already exists
    const existing = await getArticleByUri(article.article_uri);

    if (existing) {
      // Update existing article (e.g., social metrics)
      const { data, error } = await supabase
        .from("media_articles")
        .update({
          shares_facebook: article.shares_facebook,
          shares_twitter: article.shares_twitter,
          social_score: article.social_score,
          sentiment: article.sentiment,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      
      logger.info("Article updated", { 
        articleUri: article.article_uri,
        articleId: existing.id 
      });
      
      return data as MediaArticle;
    } else {
      // Insert new article
      const { data, error } = await supabase
        .from("media_articles")
        .insert([article])
        .select()
        .single();

      if (error) throw error;
      
      logger.info("Article created", { 
        articleUri: article.article_uri,
        articleId: data.id 
      });
      
      return data as MediaArticle;
    }
  } catch (error) {
    logger.error("Failed to upsert article", { 
      articleUri: article.article_uri, 
      error 
    });
    return null;
  }
}

/**
 * Bulk insert articles (for initial batch imports)
 * Skips duplicates automatically
 * 
 * @param articles - Array of articles to insert
 * @returns Number of successfully inserted articles
 */
export async function bulkInsertArticles(
  articles: Omit<MediaArticle, "id" | "created_at" | "updated_at" | "shares_total">[]
): Promise<number> {
  try {
    const supabase = createAdminClient();

    // Filter out duplicates by checking existing article URIs
    const articleUris = articles.map(a => a.article_uri);
    const { data: existing } = await supabase
      .from("media_articles")
      .select("article_uri")
      .in("article_uri", articleUris);

    const existingUris = new Set(existing?.map(a => a.article_uri) || []);
    const newArticles = articles.filter(a => !existingUris.has(a.article_uri));

    if (newArticles.length === 0) {
      logger.info("No new articles to insert (all duplicates)");
      return 0;
    }

    const { data, error } = await supabase
      .from("media_articles")
      .insert(newArticles)
      .select();

    if (error) throw error;

    logger.info("Bulk articles inserted", { 
      total: articles.length,
      inserted: data?.length || 0,
      skipped: articles.length - (data?.length || 0)
    });

    return data?.length || 0;
  } catch (error) {
    logger.error("Failed to bulk insert articles", { 
      count: articles.length, 
      error 
    });
    return 0;
  }
}

/**
 * Get article count by zone
 * 
 * @param zoneId - Zone ID
 * @param options - Filter options
 * @returns Total count of articles
 */
export async function getArticlesCountByZone(
  zoneId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    lang?: string[];
    sourceUri?: string[];
    sourceLocationCountry?: string[];
  } = {}
): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { startDate, endDate, lang, sourceUri, sourceLocationCountry } = options;

    let query = supabase
      .from("media_articles")
      .select("*", { count: "exact", head: true })
      .eq("zone_id", zoneId);

    if (startDate) {
      query = query.gte("published_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("published_at", endDate.toISOString());
    }
    if (lang && lang.length > 0) {
      query = query.in("lang", lang);
    }
    if (sourceUri && sourceUri.length > 0) {
      query = query.in("source_uri", sourceUri);
    }
    if (sourceLocationCountry && sourceLocationCountry.length > 0) {
      query = query.in("source_location_country", sourceLocationCountry);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  } catch (error) {
    logger.error(`Failed to count articles for zone ${zoneId}`, { error });
    return 0;
  }
}

/**
 * Get top sources by article count for a zone
 * 
 * @param zoneId - Zone ID
 * @param limit - Number of top sources to return
 * @returns Array of sources with article counts
 */
export async function getTopSourcesByZone(
  zoneId: string,
  limit = 10
): Promise<Array<{ source_uri: string; source_title: string; count: number }>> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_articles")
      .select("source_uri, source_title")
      .eq("zone_id", zoneId);

    if (error) throw error;

    // Group by source and count
    const sourceCounts = new Map<string, { title: string; count: number }>();
    
    data?.forEach(article => {
      const existing = sourceCounts.get(article.source_uri);
      if (existing) {
        existing.count++;
      } else {
        sourceCounts.set(article.source_uri, {
          title: article.source_title,
          count: 1,
        });
      }
    });

    // Convert to array and sort by count
    const topSources = Array.from(sourceCounts.entries())
      .map(([uri, { title, count }]) => ({
        source_uri: uri,
        source_title: title,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return topSources;
  } catch (error) {
    logger.error(`Failed to get top sources for zone ${zoneId}`, { error });
    return [];
  }
}

/**
 * Get sentiment distribution for articles in a zone
 * 
 * @param zoneId - Zone ID
 * @param options - Filter options
 * @returns Sentiment stats
 */
export async function getSentimentDistribution(
  zoneId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  positive: number;
  neutral: number;
  negative: number;
  average: number;
}> {
  try {
    const supabase = createAdminClient();
    const { startDate, endDate } = options;

    let query = supabase
      .from("media_articles")
      .select("sentiment")
      .eq("zone_id", zoneId)
      .not("sentiment", "is", null);

    if (startDate) {
      query = query.gte("published_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("published_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return { positive: 0, neutral: 0, negative: 0, average: 0 };
    }

    let positive = 0;
    let neutral = 0;
    let negative = 0;
    let sum = 0;

    data.forEach(article => {
      const sentiment = article.sentiment as number;
      sum += sentiment;

      if (sentiment > 0.1) {
        positive++;
      } else if (sentiment < -0.1) {
        negative++;
      } else {
        neutral++;
      }
    });

    return {
      positive,
      neutral,
      negative,
      average: sum / data.length,
    };
  } catch (error) {
    logger.error(`Failed to get sentiment distribution for zone ${zoneId}`, { error });
    return { positive: 0, neutral: 0, negative: 0, average: 0 };
  }
}

/**
 * Delete articles older than specified days for a zone
 * Used for cleanup/maintenance
 * 
 * @param zoneId - Zone ID
 * @param daysOld - Delete articles older than this many days
 * @returns Number of deleted articles
 */
export async function deleteOldArticles(
  zoneId: string,
  daysOld: number
): Promise<number> {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from("media_articles")
      .delete()
      .eq("zone_id", zoneId)
      .lt("published_at", cutoffDate.toISOString())
      .select();

    if (error) throw error;

    const deleted = data?.length || 0;
    
    logger.info("Old articles deleted", { 
      zoneId, 
      daysOld, 
      deleted 
    });

    return deleted;
  } catch (error) {
    logger.error(`Failed to delete old articles for zone ${zoneId}`, { error });
    return 0;
  }
}

