/**
 * TikTok Deduplicator Worker
 * Handles video deduplication, profile normalization, and storage
 */

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { determineTier } from "@/lib/data/tiktok/engagement";
import type { TikTokVideo } from "@/lib/api/tiktok";

interface ProcessingResult {
  created: number;
  duplicates: number;
  errors: number;
  updatedProfiles: number;
  createdVideoIds: string[]; // For engagement tracking
}

/**
 * Process incoming videos from polling
 */
export async function processIncomingVideos(
  videos: TikTokVideo[],
  zoneId: string
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    created: 0,
    duplicates: 0,
    errors: 0,
    updatedProfiles: 0,
    createdVideoIds: [],
  };

  // Process each video
  for (const apiVideo of videos) {
    try {
      await processSingleVideo(apiVideo, zoneId, result);
    } catch (error) {
      logger.error(`Error processing video ${apiVideo.id}:`, error);
      result.errors++;
    }
  }

  return result;
}

/**
 * Process a single video
 */
async function processSingleVideo(
  apiVideo: TikTokVideo,
  zoneId: string,
  result: ProcessingResult
): Promise<void> {
  const supabase = createAdminClient();

  // Check if video already exists
  const { data: existing } = await supabase
    .from("tiktok_videos")
    .select("id")
    .eq("video_id", apiVideo.id)
    .maybeSingle();

  if (existing) {
    logger.debug(`Video ${apiVideo.id} already exists, skipping`);
    result.duplicates++;
    return;
  }

  // Process author profile first (normalization)
  const authorProfileId = await processAuthorProfile(apiVideo, zoneId);
  if (authorProfileId) {
    result.updatedProfiles++;
  }

  // Prepare video data
  const videoData = {
    zone_id: zoneId,
    video_id: apiVideo.id,
    author_profile_id: authorProfileId || undefined,
    description: apiVideo.desc || null,
    duration: apiVideo.video?.duration || null,
    height: apiVideo.video?.height || null,
    width: apiVideo.video?.width || null,
    cover_url: apiVideo.video?.cover || null,
    share_url: apiVideo.shareUrl || null,
    tiktok_created_at: new Date(apiVideo.createTime * 1000).toISOString(),
    play_count: apiVideo.stats?.playCount || 0,
    digg_count: apiVideo.stats?.diggCount || 0,
    comment_count: apiVideo.stats?.commentCount || 0,
    share_count: apiVideo.stats?.shareCount || 0,
    collect_count: apiVideo.stats?.collectCount || 0,
    music_id: apiVideo.music?.id || null,
    music_title: apiVideo.music?.title || null,
    music_author: apiVideo.music?.authorName || null,
    is_ad: apiVideo.isAd || false,
    // Language & Location (extracted from raw_data)
    language: (apiVideo as any).textLanguage || null,
    poi_name: (apiVideo as any).poi?.name || null,
    poi_address: (apiVideo as any).poi?.address || null,
    raw_data: apiVideo as any,
  };

  // Create video (using admin client)
  const { data: videoRecord, error: videoError } = await supabase
    .from("tiktok_videos")
    .insert(videoData)
    .select()
    .single();

  if (videoError) {
    logger.error(`Error creating video ${apiVideo.id}:`, videoError);
    throw videoError;
  }
  
  logger.debug(`Video created: ${videoRecord.id} (${apiVideo.id})`);
  result.created++;
  result.createdVideoIds.push(videoRecord.id);

  // Extract entities (hashtags, mentions)
  await extractAndSaveEntitiesAdmin(
    supabase,
    videoRecord.id,
    zoneId,
    apiVideo.challenges || [],
    apiVideo.textExtra || []
  );

  // Start engagement tracking
  const tier = determineTier(new Date(apiVideo.createTime * 1000));
  const nextUpdateAt = calculateNextUpdateTime(tier);

  await supabase
    .from("tiktok_engagement_tracking")
    .insert({
      video_db_id: videoRecord.id,
      tier,
      next_update_at: nextUpdateAt,
    });
}

/**
 * Process and normalize author profile
 * Returns profile ID or null
 */
async function processAuthorProfile(
  apiVideo: TikTokVideo,
  zoneId: string
): Promise<string | null> {
  try {
    if (!apiVideo.author) {
      logger.warn(`No author data for video ${apiVideo.id}`);
      return null;
    }

    const author = apiVideo.author;
    const supabase = createAdminClient();

    // Check if profile exists by tiktok_user_id
    const { data: existingProfile } = await supabase
      .from("tiktok_profiles")
      .select("id")
      .eq("tiktok_user_id", author.id)
      .maybeSingle();

    if (existingProfile) {
      // Get stats from API
      const stats = (author as any).stats || {};

      // Update existing profile with latest stats
      await supabase
        .from("tiktok_profiles")
        .update({
          username: author.uniqueId?.toLowerCase() || "",
          nickname: author.nickname || "",
          signature: author.signature || null,
          avatar_thumb: author.avatarThumb || null,
          avatar_medium: author.avatarMedium || null,
          avatar_larger: author.avatarLarger || null,
          is_verified: author.verified || false,
          is_private: author.privateAccount || false,
          region: author.region || null,
          language: author.language || null,
          follower_count: stats.followerCount || 0,
          following_count: stats.followingCount || 0,
          heart_count: stats.heart || stats.heartCount || 0,
          video_count: stats.videoCount || 0,
          last_seen_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
          total_videos_collected: supabase.rpc("increment", { x: 1 }) as any,
        })
        .eq("id", existingProfile.id);

      return existingProfile.id;
    }

    // Get stats from API (from raw_data if available)
    const stats = (author as any).stats || {};

    // Create new profile with stats
    const { data: newProfile, error } = await supabase
      .from("tiktok_profiles")
      .insert({
        tiktok_user_id: author.id,
        sec_uid: author.secUid,
        username: author.uniqueId?.toLowerCase() || "",
        nickname: author.nickname || "",
        signature: author.signature || null,
        avatar_thumb: author.avatarThumb || null,
        avatar_medium: author.avatarMedium || null,
        avatar_larger: author.avatarLarger || null,
        is_verified: author.verified || false,
        is_private: author.privateAccount || false,
        region: author.region || null,
        language: author.language || null,
        follower_count: stats.followerCount || 0,
        following_count: stats.followingCount || 0,
        heart_count: stats.heart || stats.heartCount || 0,
        video_count: stats.videoCount || 0,
        total_videos_collected: 1,
        raw_data: author as any,
      })
      .select("id")
      .single();

    if (error) {
      // Might be duplicate due to race condition
      if (error.code === "23505") {
        // Try to get existing profile again
        const { data: retry } = await supabase
          .from("tiktok_profiles")
          .select("id")
          .eq("tiktok_user_id", author.id)
          .maybeSingle();

        return retry?.id || null;
      }

      logger.error("Error creating profile:", error);
      return null;
    }

    logger.info(`TikTok profile created: @${author.uniqueId} (${newProfile.id})`);
    return newProfile.id;
  } catch (error) {
    logger.error("Error in processAuthorProfile:", error);
    return null;
  }
}

/**
 * Extract and save entities using admin client
 */
async function extractAndSaveEntitiesAdmin(
  supabase: ReturnType<typeof createAdminClient>,
  videoDbId: string,
  zoneId: string,
  challenges: Array<{ title: string }> = [],
  textExtra: Array<{ hashtagName?: string; userId?: string }> = []
): Promise<number> {
  try {
    const entities: Array<{
      video_id: string;
      zone_id: string;
      entity_type: "hashtag" | "mention";
      entity_value: string;
      entity_normalized: string;
    }> = [];

    // Extract hashtags
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

    if (entities.length === 0) return 0;

    // Deduplicate
    const uniqueEntities = Array.from(
      new Map(entities.map((e) => [`${e.entity_type}-${e.entity_normalized}`, e])).values()
    );

    await supabase.from("tiktok_entities").insert(uniqueEntities);

    return uniqueEntities.length;
  } catch (error) {
    logger.error("Error extracting entities:", error);
    return 0;
  }
}

/**
 * Calculate next update time based on tier
 */
function calculateNextUpdateTime(tier: "ultra_hot" | "hot" | "warm" | "cold"): string | null {
  const now = new Date();
  
  switch (tier) {
    case "ultra_hot":
      now.setMinutes(now.getMinutes() + 10);
      break;
    case "hot":
      now.setMinutes(now.getMinutes() + 30);
      break;
    case "warm":
      now.setHours(now.getHours() + 1);
      break;
    case "cold":
      return null;
  }
  
  return now.toISOString();
}

/**
 * Batch process videos with deduplication
 */
export async function batchProcessVideos(
  videos: TikTokVideo[],
  zoneId: string
): Promise<ProcessingResult> {
  logger.info(`Processing batch of ${videos.length} TikTok videos for zone ${zoneId}`);

  const result = await processIncomingVideos(videos, zoneId);

  logger.info(
    `Batch processed: ${result.created} created, ${result.duplicates} duplicates, ${result.errors} errors`
  );

  return result;
}

