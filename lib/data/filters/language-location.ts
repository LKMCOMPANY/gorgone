/**
 * Data Layer for Language & Location Filters
 * Uses Redis cache with 5-minute TTL for optimal performance
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getLanguageName } from "@/lib/constants/languages";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/cache/redis";

export interface LanguageOption {
  code: string;
  name: string;
  count: number;
}

export interface LocationOption {
  name: string;
  count: number;
}

const CACHE_TTL = 300; // 5 minutes

/**
 * Get available languages for a zone and source (with Redis cache)
 */
export async function getAvailableLanguages(
  zoneId: string,
  source: "twitter" | "tiktok" | "media"
): Promise<LanguageOption[]> {
  try {
    // Direct query - no cache (more reliable for filters)
    // Cache was causing stale data issues
    const supabase = createAdminClient();
    
    let rawData: any[] = [];

    if (source === "twitter") {
      const result = await supabase
        .from("twitter_tweets")
        .select("lang")
        .eq("zone_id", zoneId)
        .not("lang", "is", null);
      
      if (result.error) {
        logger.error("Twitter languages query error:", result.error);
        return [];
      }
      rawData = result.data || [];
    } else if (source === "tiktok") {
      const result = await supabase
        .from("tiktok_videos")
        .select("language")
        .eq("zone_id", zoneId)
        .not("language", "is", null);
      
      if (result.error) {
        logger.error("TikTok languages query error:", result.error);
        return [];
      }
      rawData = result.data || [];
    } else if (source === "media") {
      console.log("[DEBUG Media] Zone ID:", zoneId);
      const result = await supabase
        .from("media_articles")
        .select("lang")
        .eq("zone_id", zoneId)
        .not("lang", "is", null);
      
      console.log("[DEBUG Media] Result:", {
        error: result.error,
        count: result.count,
        dataLength: result.data?.length,
        firstItems: result.data?.slice(0, 3)
      });
      
      if (result.error) {
        logger.error("Media languages query error:", result.error);
        return [];
      }
      rawData = result.data || [];
    }

    // Count occurrences
    const counts = new Map<string, number>();
    rawData.forEach((item) => {
      const code = item.lang || item.language;
      if (code) {
        counts.set(code, (counts.get(code) || 0) + 1);
      }
    });

    // Convert to array and sort
    const result: LanguageOption[] = Array.from(counts.entries())
      .map(([code, count]) => ({
        code,
        name: getLanguageName(code, source),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return result;
  } catch (error) {
    logger.error(`Error in getAvailableLanguages for ${source}:`, error);
    return [];
  }
}

/**
 * Get available locations for a zone and source (with Redis cache)
 */
export async function getAvailableLocations(
  zoneId: string,
  source: "twitter" | "tiktok" | "media"
): Promise<LocationOption[]> {
  try {
    // Direct query - no cache (more reliable for filters)
    // Cache was causing stale data issues
    const supabase = createAdminClient();
    let rawData: any[] = [];

    if (source === "twitter") {
      // Twitter: Get locations from profiles (via tweets)
      const tweetsResult = await supabase
        .from("twitter_tweets")
        .select("author_profile_id")
        .eq("zone_id", zoneId);

      if (tweetsResult.error) {
        logger.error("Twitter locations query error:", tweetsResult.error);
        return [];
      }

      const tweets = tweetsResult.data || [];

      if (tweets.length > 0) {
        const profileIds = [...new Set(tweets.map((t) => t.author_profile_id).filter(Boolean))];
        
        const profilesResult = await supabase
          .from("twitter_profiles")
          .select("location")
          .in("id", profileIds)
          .not("location", "is", null)
          .neq("location", "");
        
        if (profilesResult.error) {
          logger.error("Twitter profiles locations query error:", profilesResult.error);
          return [];
        }
        
        rawData = profilesResult.data || [];
      }
    } else if (source === "tiktok") {
      const result = await supabase
        .from("tiktok_videos")
        .select("poi_address")
        .eq("zone_id", zoneId)
        .not("poi_address", "is", null);
      
      if (result.error) {
        logger.error("TikTok locations query error:", result.error);
        return [];
      }
      rawData = result.data || [];
    } else if (source === "media") {
      const result = await supabase
        .from("media_articles")
        .select("source_location_country")
        .eq("zone_id", zoneId)
        .not("source_location_country", "is", null);
      
      if (result.error) {
        logger.error("Media locations query error:", result.error);
        return [];
      }
      rawData = result.data || [];
    }

    // Count occurrences
    const counts = new Map<string, number>();
    rawData.forEach((item) => {
      const loc = item.location || item.poi_address || item.source_location_country;
      if (loc && loc.trim()) {
        counts.set(loc, (counts.get(loc) || 0) + 1);
      }
    });

    // Convert to array and sort
    const result: LocationOption[] = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return result;
  } catch (error) {
    logger.error(`Error in getAvailableLocations for ${source}:`, error);
    return [];
  }
}

/**
 * Get both languages and locations in a single call
 */
export async function getFilterOptions(
  zoneId: string,
  source: "twitter" | "tiktok" | "media"
): Promise<{
  languages: LanguageOption[];
  locations: LocationOption[];
}> {
  const [languages, locations] = await Promise.all([
    getAvailableLanguages(zoneId, source),
    getAvailableLocations(zoneId, source),
  ]);

  return { languages, locations };
}

/**
 * Search languages by query
 */
export function searchLanguages(
  languages: LanguageOption[],
  query: string
): LanguageOption[] {
  const lowerQuery = query.toLowerCase();
  
  return languages.filter(
    (lang) =>
      lang.code.toLowerCase().includes(lowerQuery) ||
      lang.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search locations by query
 */
export function searchLocations(
  locations: LocationOption[],
  query: string
): LocationOption[] {
  const lowerQuery = query.toLowerCase();
  
  return locations.filter((loc) =>
    loc.name.toLowerCase().includes(lowerQuery)
  );
}
