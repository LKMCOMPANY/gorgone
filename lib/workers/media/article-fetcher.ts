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
    source_location_country: apiArticle.source.location?.country?.label || null,
    source_location_label: apiArticle.source.location?.label || null,
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
    location_country: apiSource.location?.country?.label || null,
    location_label: apiSource.location?.label || null,
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

        // Normalize and upsert article
        const articleData = normalizeArticle(apiArticle, rule.zone_id);
        const inserted = await upsertArticle(articleData);

        if (inserted) {
          insertedCount++;
        }
      } catch (error) {
        logger.error("Failed to process article", {
          articleUri: apiArticle.uri,
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
 * Fetches articles for all rules that are due
 */
export async function fetchArticlesForDueRules(): Promise<{
  success: boolean;
  rulesProcessed: number;
  articlesCollected: number;
  errors: number;
}> {
  try {
    logger.info("Starting media article fetch worker");

    // Get rules that need to be fetched
    const rules = await getRulesDueForFetch();

    if (rules.length === 0) {
      logger.info("No rules due for fetch");
      return {
        success: true,
        rulesProcessed: 0,
        articlesCollected: 0,
        errors: 0,
      };
    }

    logger.info(`Found ${rules.length} rules due for fetch`);

    let totalArticles = 0;
    let errorCount = 0;

    // Process each rule sequentially to avoid rate limiting
    for (const rule of rules) {
      try {
        const articlesAdded = await fetchArticlesForRule(rule);
        totalArticles += articlesAdded;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errorCount++;
        logger.error(`Error processing rule ${rule.id}`, { error });
      }
    }

    logger.info("Media article fetch worker completed", {
      rulesProcessed: rules.length,
      articlesCollected: totalArticles,
      errors: errorCount,
    });

    return {
      success: true,
      rulesProcessed: rules.length,
      articlesCollected: totalArticles,
      errors: errorCount,
    };
  } catch (error) {
    logger.error("Media article fetch worker failed", { error });
    return {
      success: false,
      rulesProcessed: 0,
      articlesCollected: 0,
      errors: 1,
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

