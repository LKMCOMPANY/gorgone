/**
 * Media Autocomplete API
 * Provides autocomplete suggestions for keywords and media sources
 * 
 * Features:
 * - Keyword suggestions from article titles and content
 * - Media source suggestions with metadata
 * - Optimized for production with batch processing
 * - Proper error handling and logging
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface AutocompleteResult {
  type: "keyword" | "source";
  value: string;
  label: string;
  metadata?: {
    website_url?: string;
    location_country?: string;
    source_type?: string;
    article_count?: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zone_id");
    const query = searchParams.get("q");

    logger.info(`Media autocomplete called: zone=${zoneId}, query="${query}"`);

    if (!zoneId || !query) {
      return NextResponse.json(
        { success: false, error: "Missing zone_id or query parameter" },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
      });
    }

    const supabase = createAdminClient();
    const results: AutocompleteResult[] = [];
    const cleanQuery = query.toLowerCase();

    // Search for media sources
    // Get source URIs from articles in this zone
    const { data: articleData, error: articleError } = await supabase
      .from("media_articles")
      .select("source_uri, source_title")
      .eq("zone_id", zoneId);

    if (articleError) {
      logger.error("Error fetching articles for autocomplete:", articleError);
    }

    logger.debug(`Media autocomplete: Found ${articleData?.length || 0} articles in zone`);

    if (articleData && articleData.length > 0) {
      // Get unique source URIs from zone
      const uniqueSourceUris = [...new Set(articleData.map((a) => a.source_uri).filter(Boolean))];

      logger.debug(`Media autocomplete: Searching "${cleanQuery}" in ${uniqueSourceUris.length} sources`);

      // Fetch source details in batches
      const BATCH_SIZE = 100;
      const allSources = [];
      
      for (let i = 0; i < uniqueSourceUris.length; i += BATCH_SIZE) {
        const batch = uniqueSourceUris.slice(i, i + BATCH_SIZE);
        const { data: batchSources, error: batchError } = await supabase
          .from("media_sources")
          .select("source_uri, title, website_url, location_country, source_type, article_count")
          .in("source_uri", batch);

        if (batchError) {
          logger.error(`Error fetching sources batch ${i / BATCH_SIZE + 1}:`, batchError);
          continue;
        }

        if (batchSources) {
          allSources.push(...batchSources);
        }
      }

      logger.debug(`Media autocomplete: Fetched ${allSources.length} total sources`);

      // Filter sources by title or URI
      const matchingSources = allSources
        .filter((s) => 
          s.title?.toLowerCase().includes(cleanQuery) ||
          s.source_uri?.toLowerCase().includes(cleanQuery)
        )
        .sort((a, b) => (b.article_count || 0) - (a.article_count || 0))
        .slice(0, 6);

      logger.debug(`Media autocomplete: Found ${matchingSources.length} matching sources`);

      matchingSources.forEach((source) => {
        // Parse location_country if it's a JSON string
        let locationCountry = source.location_country;
        if (typeof locationCountry === "string" && locationCountry.startsWith("{")) {
          try {
            const parsed = JSON.parse(locationCountry);
            locationCountry = parsed.eng || locationCountry;
          } catch (e) {
            // Keep original value if parsing fails
          }
        }

        results.push({
          type: "source",
          value: source.source_uri,
          label: source.title || source.source_uri,
          metadata: {
            website_url: source.website_url || undefined,
            location_country: locationCountry || undefined,
            source_type: source.source_type || undefined,
            article_count: source.article_count || 0,
          },
        });
      });
    }

    // Search for keywords in article titles
    if (cleanQuery.length >= 2) {
      const { data: articles, error: articlesError } = await supabase
        .from("media_articles")
        .select("title, body")
        .eq("zone_id", zoneId)
        .or(`title.ilike.%${cleanQuery}%,body.ilike.%${cleanQuery}%`)
        .order("published_at", { ascending: false })
        .limit(20);

      if (articlesError) {
        logger.error("Error searching articles:", articlesError);
      } else if (articles) {
        // Extract keywords from titles and body
        const keywords = new Set<string>();
        
        articles.forEach((article) => {
          // Extract from title
          const titleWords = article.title
            .toLowerCase()
            .split(/\s+/)
            .filter((word: string) => {
              // Remove URLs, short words, and common stop words
              return (
                word.length > 2 &&
                !word.startsWith("http") &&
                word.includes(cleanQuery) &&
                !["the", "and", "for", "with", "from", "this", "that", "are", "was"].includes(word)
              );
            });
          
          titleWords.forEach((word: string) => {
            // Clean word (remove punctuation)
            const cleanWord = word.replace(/[^\w\s-]/g, "").trim();
            if (cleanWord.length > 2) {
              keywords.add(cleanWord);
            }
          });
        });

        logger.debug(`Media autocomplete: Found ${keywords.size} unique keywords`);

        // Add unique keywords to results (max 5)
        Array.from(keywords)
          .slice(0, 5)
          .forEach((keyword) => {
            results.push({
              type: "keyword",
              value: keyword,
              label: keyword,
            });
          });
      }
    }

    logger.debug(`Media autocomplete: Total results before dedup: ${results.length}`);

    // Remove duplicates and limit total results
    const uniqueResults = results
      .filter(
        (result, index, self) =>
          index === self.findIndex((r) => r.value === result.value)
      )
      .slice(0, 10);

    logger.debug(`Media autocomplete: Returning ${uniqueResults.length} final results`);

    return NextResponse.json({
      success: true,
      results: uniqueResults,
    });
  } catch (error) {
    logger.error("Media autocomplete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform autocomplete search",
      },
      { status: 500 }
    );
  }
}

