/**
 * Media Article Fetcher Worker
 * 
 * Fetches articles from Event Registry API based on active rules.
 * Normalizes data and stores in database.
 * 
 * Called by QStash cron or manual trigger.
 */

import { eventRegistryClient, type EventRegistryArticle } from "@/lib/api/media";
import {
  getRulesDueForFetch,
  updateRuleFetchStatus,
  upsertArticle,
  upsertSource,
} from "@/lib/data/media";
import { logger } from "@/lib/logger";
import type { MediaRule, MediaArticle, MediaSource } from "@/types";

/**
 * Parse location label (handles both string and object formats)
 */
function parseLocationLabel(label: any): string | null {
  if (!label) return null;
  if (typeof label === 'string') return label;
  if (typeof label === 'object' && label.eng) return label.eng;
  return null;
}

/**
 * Normalize Event Registry article to our database format
 */
function normalizeArticle(
  apiArticle: EventRegistryArticle,
  zoneId: string
): Omit<MediaArticle, "id" | "created_at" | "updated_at" | "shares_total"> {
  return {
    zone_id: zoneId,
    article_uri: apiArticle.uri,
    event_uri: apiArticle.eventUri || null,
    title: apiArticle.title,
    body: apiArticle.body,
    url: apiArticle.url,
    lang: apiArticle.lang,
    published_at: apiArticle.dateTime,
    collected_at: new Date().toISOString(),
    source_uri: apiArticle.source.uri,
    source_title: apiArticle.source.title,
    source_description: apiArticle.source.description || null,
    source_location_country: parseLocationLabel(apiArticle.source.location?.country?.label),
    source_location_label: parseLocationLabel(apiArticle.source.location?.label),
    authors: apiArticle.authors || [],
    image_url: apiArticle.image || null,
    videos: apiArticle.videos || [],
    sentiment: apiArticle.sentiment ?? null,
    relevance: apiArticle.relevance ?? null,
    social_score: apiArticle.socialScore 
      ? (apiArticle.socialScore.facebook || 0) + (apiArticle.socialScore.twitter || 0)
      : (apiArticle.shares?.facebook || 0) + (apiArticle.shares?.twitter || 0),
    shares_facebook: apiArticle.shares?.facebook || apiArticle.socialScore?.facebook || 0,
    shares_twitter: apiArticle.shares?.twitter || apiArticle.socialScore?.twitter || 0,
    categories: apiArticle.categories || [],
    concepts: apiArticle.concepts || [],
    location_label: apiArticle.location?.label || null,
    location_country: apiArticle.location?.country?.label || null,
    extracted_dates: apiArticle.extractedDates || [],
    links: apiArticle.links || [],
    is_duplicate: apiArticle.isDuplicate,
    duplicate_list: apiArticle.duplicateList || [],
    original_article_uri: apiArticle.originalArticle?.uri || null,
    is_processed: false,
    raw_data: apiArticle,
  };
}

/**
 * Normalize source data
 */
function normalizeSource(
  apiSource: EventRegistryArticle["source"]
): Omit<MediaSource, "id" | "created_at" | "updated_at"> {
  return {
    source_uri: apiSource.uri,
    title: apiSource.title,
    website_url: null,
    description: apiSource.description || null,
    location_country: parseLocationLabel(apiSource.location?.country?.label),
    location_label: parseLocationLabel(apiSource.location?.label),
    importance_rank: apiSource.ranking?.importanceRank || null,
    alexa_global_rank: apiSource.ranking?.alexaGlobalRank || null,
    alexa_country_rank: apiSource.ranking?.alexaCountryRank || null,
    source_type: apiSource.dataType || null,
    language: null,
    article_count: 0, // Will be incremented by upsertSource
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    raw_data: apiSource,
  };
}

/**
 * Build Event Registry API params from rule
 */
function buildAPIParams(rule: MediaRule): any {
  const params: any = {
    action: "getArticles",
    articlesCount: rule.articles_per_fetch,
    articlesSortBy: rule.sort_by,
    articlesSortByAsc: rule.sort_asc,
    articleBodyLen: rule.include_body ? -1 : 0,
    dataType: rule.data_types,
    isDuplicateFilter: rule.duplicate_filter,
    eventFilter: rule.event_filter,
    includeArticleSocialScore: rule.include_social_score,
    includeArticleSentiment: rule.include_sentiment,
    includeArticleConcepts: rule.include_concepts,
    includeArticleCategories: rule.include_categories,
    includeArticleAuthors: rule.include_authors,
    includeArticleVideos: rule.include_videos,
    includeArticleLinks: rule.include_links,
    includeSourceLocation: true,
    includeSourceRanking: true,
  };

  // Add time window if specified
  if (rule.force_max_data_time_window) {
    params.forceMaxDataTimeWindow = rule.force_max_data_time_window;
  }

  // Merge query config
  Object.assign(params, rule.query_config);
  
  // IMPORTANT: Respect keywordOper from query_config
  // Only set default if not explicitly defined by user
  // Default to "or" for multi-keyword queries (more permissive)
  if (Array.isArray(params.keyword) && params.keyword.length > 1) {
    if (!params.keywordOper || params.keywordOper === '') {
      params.keywordOper = "or";
      logger.debug("Set default keywordOper to 'or' for multi-keyword query", {
        ruleId: rule.id,
        keywordCount: params.keyword.length
      });
    }
  }

  return params;
}

/**
 * Fetch articles for a single rule
 */
async function fetchArticlesForRule(rule: MediaRule): Promise<number> {
  try {
    logger.info("Fetching articles for rule", {
      ruleId: rule.id,
      name: rule.name,
      zoneId: rule.zone_id,
    });

    // Build API params
    const params = buildAPIParams(rule);

    // Fetch from Event Registry
    const response = await eventRegistryClient.getArticles(params);

    if (!response.articles?.results) {
      logger.warn("No articles returned from Event Registry", { ruleId: rule.id });
      await updateRuleFetchStatus(rule.id, "success", 0);
      return 0;
    }

    const articles = response.articles.results;
    let insertedCount = 0;

    // Process each article
    for (const apiArticle of articles) {
      try {
        // Normalize and upsert source
        const sourceData = normalizeSource(apiArticle.source);
        await upsertSource(sourceData);

        // Normalize and upsert article with deduplication
        const articleData = normalizeArticle(apiArticle, rule.zone_id);
        const result = await upsertArticle(articleData, rule.id);

        // Count as inserted if it's new to THIS ZONE
        // (even if article existed in another zone - it's still new for this zone)
        if (result.wasNew) {
          insertedCount++;
        }
      } catch (error) {
        logger.error("Failed to process article", {
          articleUri: apiArticle.uri,
          ruleId: rule.id,
          zoneId: rule.zone_id,
          error,
        });
      }
    }

    // Update rule fetch status
    await updateRuleFetchStatus(rule.id, "success", insertedCount);

    logger.info("Articles fetched successfully", {
      ruleId: rule.id,
      total: articles.length,
      inserted: insertedCount,
      duplicates: articles.length - insertedCount,
    });

    return insertedCount;
  } catch (error) {
    logger.error("Failed to fetch articles for rule", {
      ruleId: rule.id,
      error,
    });

    // Update rule with error status
    await updateRuleFetchStatus(
      rule.id,
      "error",
      0,
      error instanceof Error ? error.message : "Unknown error"
    );

    return 0;
  }
}

/**
 * Main worker function
 * Fetches articles for rules that are due
 * 
 * OPTIMIZATION STRATEGY:
 * - Batch processing (max 10 rules per execution to avoid timeouts)
 * - Priority to oldest last_fetched_at (fairness)
 * - Progressive rate limiting (1s -> 2s -> 3s delays)
 * - Graceful error handling (one failure doesn't stop others)
 * 
 * @param maxRules - Maximum number of rules to process per execution (default: 10)
 */
export async function fetchArticlesForDueRules(
  maxRules = 10
): Promise<{
  success: boolean;
  rulesProcessed: number;
  articlesCollected: number;
  errors: number;
  hasMore: boolean;
}> {
  try {
    logger.info("Starting media article fetch worker", { maxRules });

    // Get ALL rules that need to be fetched
    const allDueRules = await getRulesDueForFetch();

    if (allDueRules.length === 0) {
      logger.info("No rules due for fetch");
      return {
        success: true,
        rulesProcessed: 0,
        articlesCollected: 0,
        errors: 0,
        hasMore: false,
      };
    }

    // Sort by last_fetched_at ASC (oldest first = priority)
    // Null values go first (never fetched)
    const sortedRules = allDueRules.sort((a, b) => {
      if (!a.last_fetched_at) return -1;
      if (!b.last_fetched_at) return 1;
      return new Date(a.last_fetched_at).getTime() - new Date(b.last_fetched_at).getTime();
    });

    // Take only first N rules (batching)
    const rulesToProcess = sortedRules.slice(0, maxRules);
    const hasMore = sortedRules.length > maxRules;

    logger.info(`Processing ${rulesToProcess.length} of ${allDueRules.length} due rules`, {
      totalDue: allDueRules.length,
      processing: rulesToProcess.length,
      hasMore,
    });

    let totalArticles = 0;
    let errorCount = 0;
    let processedCount = 0;

    // Process each rule sequentially with progressive rate limiting
    for (let i = 0; i < rulesToProcess.length; i++) {
      const rule = rulesToProcess[i];
      
      try {
        const articlesAdded = await fetchArticlesForRule(rule);
        totalArticles += articlesAdded;
        processedCount++;

        // Progressive delay: 1s, 2s, 2s, 3s, 3s, 3s...
        // Reduces rate limiting risk while keeping execution time reasonable
        const delay = Math.min(1000 + Math.floor(i / 2) * 1000, 3000);
        
        if (i < rulesToProcess.length - 1) {
          logger.debug(`Waiting ${delay}ms before next rule`, {
            currentRule: i + 1,
            totalRules: rulesToProcess.length
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        errorCount++;
        logger.error(`Error processing rule ${rule.id}`, { 
          ruleId: rule.id,
          ruleName: rule.name,
          zoneId: rule.zone_id,
          error 
        });
        
        // Continue processing other rules even if one fails
        // But add a longer delay after error (5s) to avoid cascading failures
        if (i < rulesToProcess.length - 1) {
          logger.debug("Adding extra delay after error (5s)");
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    logger.info("Media article fetch worker completed", {
      totalDue: allDueRules.length,
      rulesProcessed: processedCount,
      articlesCollected: totalArticles,
      errors: errorCount,
      hasMore,
    });

    return {
      success: true,
      rulesProcessed: processedCount,
      articlesCollected: totalArticles,
      errors: errorCount,
      hasMore,
    };
  } catch (error) {
    logger.error("Media article fetch worker failed", { error });
    return {
      success: false,
      rulesProcessed: 0,
      articlesCollected: 0,
      errors: 1,
      hasMore: false,
    };
  }
}

/**
 * Fetch articles for a specific rule (manual trigger)
 */
export async function fetchArticlesForSpecificRule(
  ruleId: string
): Promise<{
  success: boolean;
  articlesCollected: number;
  error?: string;
}> {
  try {
    const { getRuleById } = await import("@/lib/data/media");
    const rule = await getRuleById(ruleId);

    if (!rule) {
      return {
        success: false,
        articlesCollected: 0,
        error: "Rule not found",
      };
    }

    const articlesAdded = await fetchArticlesForRule(rule);

    return {
      success: true,
      articlesCollected: articlesAdded,
    };
  } catch (error) {
    logger.error(`Failed to fetch articles for rule ${ruleId}`, { error });
    return {
      success: false,
      articlesCollected: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

