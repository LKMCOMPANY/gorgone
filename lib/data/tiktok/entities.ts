/**
 * TikTok Entities Data Layer
 * Handles hashtag and mention extraction
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type EntityType = "hashtag" | "mention";

export interface TikTokEntity {
  id: string;
  video_id: string;
  zone_id: string;
  entity_type: EntityType;
  entity_value: string;
  entity_normalized: string;
  created_at: string;
}

/**
 * Extract and save entities from video data
 */
export async function extractAndSaveEntities(
  videoDbId: string,
  zoneId: string,
  challenges: Array<{ title: string }> = [],
  textExtra: Array<{ hashtagName?: string; userId?: string }> = []
): Promise<number> {
  try {
    const supabase = await createClient();
    const entities: Array<{
      video_id: string;
      zone_id: string;
      entity_type: EntityType;
      entity_value: string;
      entity_normalized: string;
    }> = [];

    // Extract hashtags from challenges
    challenges.forEach((challenge) => {
      if (challenge.title) {
        entities.push({
          video_id: videoDbId,
          zone_id: zoneId,
          entity_type: "hashtag",
          entity_value: challenge.title,
          entity_normalized: challenge.title.toLowerCase(),
        });
      }
    });

    // Extract from textExtra
    textExtra.forEach((extra) => {
      if (extra.hashtagName) {
        entities.push({
          video_id: videoDbId,
          zone_id: zoneId,
          entity_type: "hashtag",
          entity_value: extra.hashtagName,
          entity_normalized: extra.hashtagName.toLowerCase(),
        });
      }
      if (extra.userId) {
        entities.push({
          video_id: videoDbId,
          zone_id: zoneId,
          entity_type: "mention",
          entity_value: extra.userId,
          entity_normalized: extra.userId.toLowerCase(),
        });
      }
    });

    if (entities.length === 0) {
      return 0;
    }

    // Deduplicate entities
    const uniqueEntities = Array.from(
      new Map(
        entities.map((e) => [
          `${e.entity_type}-${e.entity_normalized}`,
          e,
        ])
      ).values()
    );

    const { error } = await supabase
      .from("tiktok_entities")
      .insert(uniqueEntities);

    if (error) {
      logger.error("Error saving entities:", error);
      throw error;
    }

    logger.info(`Extracted ${uniqueEntities.length} entities from video ${videoDbId}`);
    return uniqueEntities.length;
  } catch (error) {
    logger.error("Error in extractAndSaveEntities:", error);
    return 0;
  }
}

/**
 * Get trending hashtags for a zone
 */
export async function getTrendingHashtags(
  zoneId: string,
  limit = 20
): Promise<Array<{ hashtag: string; count: number }>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_entities")
      .select("entity_normalized")
      .eq("zone_id", zoneId)
      .eq("entity_type", "hashtag");

    if (error) throw error;

    // Count occurrences
    const counts = new Map<string, number>();
    data?.forEach((row) => {
      const current = counts.get(row.entity_normalized) || 0;
      counts.set(row.entity_normalized, current + 1);
    });

    // Sort by count
    const sorted = Array.from(counts.entries())
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sorted;
  } catch (error) {
    logger.error("Error in getTrendingHashtags:", error);
    return [];
  }
}

