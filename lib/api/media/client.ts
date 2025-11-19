/**
 * Event Registry API Client
 * 
 * Complete implementation of Event Registry API for media monitoring.
 * Documentation: https://newsapi.ai/documentation
 * 
 * @see https://eventregistry.org/documentation
 */

import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const EVENT_REGISTRY_API_KEY = env.eventRegistry.apiKey;
const BASE_URL = "https://eventregistry.org/api/v1";

// ============================================
// TYPE DEFINITIONS (Based on Event Registry API)
// ============================================

export type SortBy = "date" | "rel" | "sourceImportance" | "sourceAlexaGlobalRank" | "sourceAlexaCountryRank" | "socialScore" | "facebookShares";
export type DataType = "news" | "pr" | "blog";
export type KeywordLocation = "body" | "title" | "body,title";
export type BooleanOperator = "and" | "or";
export type DuplicateFilter = "skipDuplicates" | "keepOnlyDuplicates" | "keepAll";
export type EventFilter = "skipArticlesWithoutEvent" | "keepOnlyArticlesWithoutEvent" | "keepAll";

/**
 * Query parameters for getArticles endpoint
 */
export interface GetArticlesParams {
  // Action
  action: "getArticles";
  apiKey: string;
  
  // Result type and pagination
  resultType?: "articles";
  articlesPage?: number;
  articlesCount?: number;
  articlesSortBy?: SortBy;
  articlesSortByAsc?: boolean;
  
  // Article body
  articleBodyLen?: number;
  
  // Data type
  dataType?: DataType | DataType[];
  
  // Time window (to reduce token usage)
  forceMaxDataTimeWindow?: 7 | 31;
  
  // Search parameters
  keyword?: string | string[];
  conceptUri?: string | string[];
  categoryUri?: string | string[];
  sourceUri?: string | string[];
  sourceLocationUri?: string | string[];
  sourceGroupUri?: string | string[];
  authorUri?: string | string[];
  locationUri?: string | string[];
  lang?: string | string[];
  dateStart?: string; // YYYY-MM-DD
  dateEnd?: string; // YYYY-MM-DD
  dateMentionStart?: string; // YYYY-MM-DD
  dateMentionEnd?: string; // YYYY-MM-DD
  
  // Search operators
  keywordLoc?: KeywordLocation;
  keywordOper?: BooleanOperator;
  conceptOper?: BooleanOperator;
  categoryOper?: BooleanOperator;
  
  // Ignore parameters (negative conditions)
  ignoreKeyword?: string | string[];
  ignoreConceptUri?: string | string[];
  ignoreCategoryUri?: string | string[];
  ignoreSourceUri?: string | string[];
  ignoreSourceLocationUri?: string | string[];
  ignoreSourceGroupUri?: string | string[];
  ignoreLocationUri?: string | string[];
  ignoreAuthorUri?: string | string[];
  ignoreLang?: string | string[];
  ignoreKeywordLoc?: KeywordLocation;
  
  // Source ranking
  startSourceRankPercentile?: number; // 0-90, divisible by 10
  endSourceRankPercentile?: number; // 10-100, divisible by 10
  
  // Sentiment
  minSentiment?: number; // -1 to 1
  maxSentiment?: number; // -1 to 1
  
  // Filters
  isDuplicateFilter?: DuplicateFilter;
  eventFilter?: EventFilter;
  
  // Include flags (what to return in response)
  includeArticleTitle?: boolean;
  includeArticleBasicInfo?: boolean;
  includeArticleBody?: boolean;
  includeArticleEventUri?: boolean;
  includeArticleSocialScore?: boolean;
  includeArticleSentiment?: boolean;
  includeArticleConcepts?: boolean;
  includeArticleCategories?: boolean;
  includeArticleLocation?: boolean;
  includeArticleImage?: boolean;
  includeArticleAuthors?: boolean;
  includeArticleVideos?: boolean;
  includeArticleLinks?: boolean;
  includeArticleExtractedDates?: boolean;
  includeArticleDuplicateList?: boolean;
  includeArticleOriginalArticle?: boolean;
  
  // Source includes
  includeSourceTitle?: boolean;
  includeSourceDescription?: boolean;
  includeSourceLocation?: boolean;
  includeSourceRanking?: boolean;
  
  // Concept includes
  includeConceptLabel?: boolean;
  includeConceptImage?: boolean;
  includeConceptSynonyms?: boolean;
  conceptLang?: string;
  
  // Category includes
  includeCategoryParentUri?: boolean;
  
  // Location includes
  includeLocationGeoLocation?: boolean;
  includeLocationPopulation?: boolean;
  includeLocationGeoNamesId?: boolean;
  includeLocationCountryArea?: boolean;
  includeLocationCountryContinent?: boolean;
}

/**
 * Article structure from Event Registry API
 */
export interface EventRegistryArticle {
  uri: string;
  url: string;
  title: string;
  body: string;
  lang: string;
  isDuplicate: boolean;
  date: string;
  time: string;
  dateTime: string;
  dateTimePub?: string;
  dataType: "news" | "pr" | "blog";
  sim: number;
  
  source: {
    uri: string;
    dataType: string;
    title: string;
    description?: string;
    location?: {
      country?: {
        label: string;
        code: string;
      };
      label?: string;
    };
    ranking?: {
      importanceRank?: number;
      alexaGlobalRank?: number;
      alexaCountryRank?: number;
    };
  };
  
  authors?: Array<{
    name: string;
    uri: string;
  }>;
  
  image?: string;
  videos?: Array<{
    url: string;
  }>;
  
  eventUri?: string | null;
  sentiment?: number;
  wgt?: number;
  relevance?: number;
  
  socialScore?: {
    facebook?: number;
    twitter?: number;
  };
  
  shares?: {
    facebook?: number;
    twitter?: number;
  };
  
  categories?: Array<{
    uri: string;
    label: string;
    wgt: number;
  }>;
  
  concepts?: Array<{
    uri: string;
    label: {
      eng: string;
      [key: string]: string;
    };
    score?: number;
    type?: string;
  }>;
  
  location?: {
    label: string;
    country?: {
      label: string;
      code: string;
    };
  };
  
  links?: string[];
  extractedDates?: Array<{
    date: string;
    label: string;
  }>;
  
  duplicateList?: Array<{
    uri: string;
  }>;
  
  originalArticle?: {
    uri: string;
  };
}

/**
 * Response from getArticles endpoint
 */
export interface GetArticlesResponse {
  articles?: {
    results: EventRegistryArticle[];
    totalResults: number;
    page: number;
    count: number;
    pages: number;
  };
}

// ============================================
// API CLIENT CLASS
// ============================================

export class EventRegistryClient {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || EVENT_REGISTRY_API_KEY;
    this.baseUrl = BASE_URL;
  }
  
  /**
   * Fetch articles from Event Registry API
   * 
   * @param params Query parameters
   * @returns Articles response
   */
  async getArticles(params: Partial<GetArticlesParams>): Promise<GetArticlesResponse> {
    try {
      // Build minimal query params (only send what's needed)
      const queryParams: Record<string, any> = {
        action: "getArticles",
        apiKey: this.apiKey,
        articlesCount: params.articlesCount || 100,
        articlesSortBy: params.articlesSortBy || "date",
        ...params,
      };

      // Remove undefined/null values
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === undefined || queryParams[key] === null) {
          delete queryParams[key];
        }
      });

      logger.info("Fetching articles from Event Registry", {
        page: queryParams.articlesPage || 1,
        count: queryParams.articlesCount,
        hasKeyword: !!queryParams.keyword,
        hasSourceUri: !!queryParams.sourceUri,
      });

      // Build URL with query parameters
      const urlParams = new URLSearchParams();
      Object.keys(queryParams).forEach(key => {
        const value = queryParams[key];
        if (Array.isArray(value)) {
          // Single element: pass as string, multiple: pass as JSON array
          if (value.length === 1) {
            urlParams.set(key, value[0].toString());
          } else if (value.length > 1) {
            urlParams.set(key, JSON.stringify(value));
          }
        } else {
          urlParams.set(key, value.toString());
        }
      });

      const response = await fetch(`${this.baseUrl}/article/getArticles?${urlParams}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Event Registry API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data: GetArticlesResponse = await response.json();
      
      // Check for API-level errors
      if ("error" in data) {
        throw new Error(`Event Registry API error: ${(data as any).error}`);
      }
      
      logger.info("Articles fetched successfully", {
        totalResults: data.articles?.totalResults,
        returned: data.articles?.results.length,
        page: data.articles?.page,
      });
      
      return data;
    } catch (error) {
      logger.error("Error fetching articles from Event Registry", { error });
      throw error;
    }
  }
  
  /**
   * Helper: Build query parameters from simple keyword search
   */
  buildSimpleQuery(keyword: string, lang?: string[]): Partial<GetArticlesParams> {
    return {
      keyword,
      lang: lang || ["eng"],
      keywordLoc: "body,title",
    };
  }
  
  /**
   * Helper: Build query parameters from advanced configuration
   */
  buildAdvancedQuery(config: {
    keyword?: string;
    keywords?: string[];
    keywordOper?: BooleanOperator;
    sourceUri?: string;
    sourceUris?: string[];
    categoryUri?: string;
    conceptUri?: string;
    lang?: string[];
    dateStart?: Date;
    dateEnd?: Date;
    minSentiment?: number;
    maxSentiment?: number;
    sourceLocationUri?: string[];
    ignoreSourceUri?: string[];
    ignoreKeyword?: string;
  }): Partial<GetArticlesParams> {
    const params: Partial<GetArticlesParams> = {};
    
    // Keywords
    if (config.keyword) {
      params.keyword = config.keyword;
    } else if (config.keywords && config.keywords.length > 0) {
      params.keyword = config.keywords;
      params.keywordOper = config.keywordOper || "and";
    }
    
    // Sources
    if (config.sourceUri) {
      params.sourceUri = config.sourceUri;
    } else if (config.sourceUris && config.sourceUris.length > 0) {
      params.sourceUri = config.sourceUris;
    }
    
    // Categories and concepts
    if (config.categoryUri) {
      params.categoryUri = config.categoryUri;
    }
    if (config.conceptUri) {
      params.conceptUri = config.conceptUri;
    }
    
    // Language
    if (config.lang && config.lang.length > 0) {
      params.lang = config.lang;
    }
    
    // Dates
    if (config.dateStart) {
      params.dateStart = this.formatDate(config.dateStart);
    }
    if (config.dateEnd) {
      params.dateEnd = this.formatDate(config.dateEnd);
    }
    
    // Sentiment
    if (config.minSentiment !== undefined) {
      params.minSentiment = config.minSentiment;
    }
    if (config.maxSentiment !== undefined) {
      params.maxSentiment = config.maxSentiment;
    }
    
    // Location
    if (config.sourceLocationUri && config.sourceLocationUri.length > 0) {
      params.sourceLocationUri = config.sourceLocationUri;
    }
    
    // Ignore parameters
    if (config.ignoreSourceUri && config.ignoreSourceUri.length > 0) {
      params.ignoreSourceUri = config.ignoreSourceUri;
    }
    if (config.ignoreKeyword) {
      params.ignoreKeyword = config.ignoreKeyword;
    }
    
    return params;
  }
  
  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }
}

// Export singleton instance
export const eventRegistryClient = new EventRegistryClient();

