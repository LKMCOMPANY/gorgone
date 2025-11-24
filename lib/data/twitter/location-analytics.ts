/**
 * Twitter Location Analytics
 * Handles geocoding and location-based aggregations for heatmap visualization
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

// Redis client for caching
const redis = new Redis({
  url: env.redis.url,
  token: env.redis.token,
});

// Mapbox token from env
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Cache TTL: 7 days for geocoding, 5 minutes for heatmap results
const GEOCODE_CACHE_TTL = 604800; // 7 days
const HEATMAP_CACHE_TTL = 300; // 5 minutes

export interface CountryData {
  country_code: string;
  country_name: string;
  tweet_count: number;
  profile_count: number;
}

/**
 * Geocode a single location to country code using Mapbox API
 */
async function geocodeLocationToCountry(
  location: string
): Promise<{ code: string; name: string } | null> {
  try {
    const encodedLocation = encodeURIComponent(location.trim());
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodedLocation}&types=country,region,place&limit=1&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      logger.warn(`Geocoding failed for "${location}"`, { status: response.status });
      return null;
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      logger.debug(`No geocoding result for "${location}"`);
      return null;
    }

    const feature = data.features[0];
    const context = feature.properties?.context;
    
    // Extract country from context
    const country = context?.country;
    if (country?.country_code && country?.name) {
      return {
        code: country.country_code.toUpperCase(),
        name: country.name,
      };
    }

    // Fallback: check if feature itself is a country
    if (feature.properties?.feature_type === 'country') {
      return {
        code: feature.properties.country_code?.toUpperCase() || '',
        name: feature.properties.name || '',
      };
    }

    return null;
  } catch (error) {
    logger.error(`Error geocoding location "${location}"`, { error });
    return null;
  }
}

/**
 * Batch normalize locations to country codes with Redis caching
 */
export async function normalizeLocationsToCountries(
  locations: string[]
): Promise<Record<string, { code: string; name: string }>> {
  const normalized: Record<string, { code: string; name: string }> = {};
  const uncachedLocations: string[] = [];

  // 1. Check cache for each location
  for (const location of locations) {
    if (!location || location.trim() === '') continue;
    
    const cacheKey = `geocode:${location.toLowerCase().trim()}`;
    const cached = await redis.get<{ code: string; name: string }>(cacheKey);
    
    if (cached) {
      normalized[location] = cached;
      logger.debug(`Geocode cache hit for "${location}"`);
    } else {
      uncachedLocations.push(location);
    }
  }

  // 2. Geocode uncached locations
  logger.info(`Geocoding ${uncachedLocations.length} locations (${locations.length - uncachedLocations.length} cached)`);
  
  for (const location of uncachedLocations) {
    const result = await geocodeLocationToCountry(location);
    
    if (result && result.code) {
      normalized[location] = result;
      
      // Cache for 7 days
      const cacheKey = `geocode:${location.toLowerCase().trim()}`;
      await redis.set(cacheKey, result, { ex: GEOCODE_CACHE_TTL });
      
      logger.debug(`Geocoded "${location}" → ${result.code} (${result.name})`);
    } else {
      logger.warn(`Failed to geocode "${location}"`);
    }
    
    // Rate limiting: wait 50ms between requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return normalized;
}

/**
 * Get location heatmap data for a zone and period
 * Cached for 5 minutes to avoid repeated geocoding
 */
export async function getTwitterLocationHeatmap(
  zoneId: string,
  startDate: Date,
  endDate: Date
): Promise<CountryData[]> {
  try {
    // Build cache key based on zone and period (rounded to hour for consistent caching)
    const periodHours = Math.floor((endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000));
    const currentHour = new Date().setMinutes(0, 0, 0);
    const cacheKey = `heatmap:${zoneId}:${periodHours}h:${currentHour}`;
    
    // Try cache first
    const cached = await redis.get<CountryData[]>(cacheKey);
    if (cached) {
      logger.info("Heatmap cache HIT", { zoneId, period: `${periodHours}h`, countries: cached.length });
      return cached;
    }
    
    logger.debug("Heatmap cache MISS, calculating...", { zoneId, period: `${periodHours}h` });

    const supabase = createAdminClient();

    // Get tweets with author profiles in the period
    const { data: tweets, error } = await supabase
      .from("twitter_tweets")
      .select(`
        id,
        author_profile_id,
        author:twitter_profiles!twitter_tweets_author_profile_id_fkey (
          id,
          location
        )
      `)
      .eq("zone_id", zoneId)
      .gte("twitter_created_at", startDate.toISOString())
      .lte("twitter_created_at", endDate.toISOString());

    if (error) {
      logger.error("Error fetching tweets for location heatmap", { zoneId, error });
      throw error;
    }

    if (!tweets || tweets.length === 0) {
      return [];
    }

    // Extract unique locations
    const locationsSet = new Set<string>();
    for (const tweet of tweets) {
      const location = (tweet as any).author?.location;
      if (location && typeof location === 'string' && location.trim() !== '') {
        locationsSet.add(location.trim());
      }
    }

    const uniqueLocations = Array.from(locationsSet);
    logger.info(`Found ${uniqueLocations.length} unique locations in ${tweets.length} tweets`);

    // Normalize locations to country codes
    const locationToCountry = await normalizeLocationsToCountries(uniqueLocations);

    // Aggregate by country
    const countryStats = new Map<string, { name: string; tweets: Set<string>; profiles: Set<string> }>();

    for (const tweet of tweets) {
      const location = (tweet as any).author?.location;
      if (!location) continue;

      const country = locationToCountry[location.trim()];
      if (!country) continue;

      const existing = countryStats.get(country.code);
      if (existing) {
        existing.tweets.add(tweet.id);
        existing.profiles.add((tweet as any).author?.id);
      } else {
        countryStats.set(country.code, {
          name: country.name,
          tweets: new Set([tweet.id]),
          profiles: new Set([(tweet as any).author?.id]),
        });
      }
    }

    // Convert to array
    const heatmapData: CountryData[] = Array.from(countryStats.entries())
      .map(([code, stats]) => ({
        country_code: code,
        country_name: stats.name,
        tweet_count: stats.tweets.size,
        profile_count: stats.profiles.size,
      }))
      .sort((a, b) => b.tweet_count - a.tweet_count);

    logger.info(`Location heatmap generated for ${heatmapData.length} countries`);

    // Cache the complete result for 5 minutes
    await redis.set(cacheKey, heatmapData, { ex: HEATMAP_CACHE_TTL });
    logger.debug("Heatmap cached", { zoneId, ttl: HEATMAP_CACHE_TTL });

    return heatmapData;
  } catch (error) {
    logger.error("Error generating location heatmap", { zoneId, error });
    return [];
  }
}

/**
 * Get unique locations from a zone (for debugging/inspection)
 */
export async function getUniqueLocations(zoneId: string): Promise<string[]> {
  try {
    const supabase = createAdminClient();

    // First, get profile IDs from tweets in this zone
    const { data: tweets, error: tweetsError } = await supabase
      .from("twitter_tweets")
      .select("author_profile_id")
      .eq("zone_id", zoneId);

    if (tweetsError) throw tweetsError;

    const profileIds = [...new Set(tweets?.map(t => t.author_profile_id).filter(Boolean))];
    
    if (profileIds.length === 0) return [];

    // Then get locations for these profiles
    const { data, error } = await supabase
      .from("twitter_profiles")
      .select("location")
      .in("id", profileIds);

    if (error) throw error;

    const locations = data
      ?.map((p) => p.location)
      .filter((l): l is string => Boolean(l && l.trim()))
      .map((l) => l.trim());

    return [...new Set(locations)];
  } catch (error) {
    logger.error("Error getting unique locations", { zoneId, error });
    return [];
  }
}

