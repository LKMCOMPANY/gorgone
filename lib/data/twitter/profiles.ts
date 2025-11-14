/**
 * Twitter Profiles Data Layer
 * Handles all profile-related database operations
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  TwitterProfile,
  TwitterProfileSnapshot,
  TwitterProfileZoneTag,
  TwitterProfileTagType,
  TwitterProfileRatios,
} from "@/types";

/**
 * Get profile by Twitter user ID (external ID)
 */
export async function getProfileByTwitterId(
  twitterUserId: string
): Promise<TwitterProfile | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_profiles")
      .select("*")
      .eq("twitter_user_id", twitterUserId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return data as TwitterProfile;
  } catch (error) {
    logger.error(`Error fetching profile ${twitterUserId}:`, error);
    return null;
  }
}

/**
 * Get profile by internal database ID
 */
export async function getProfileById(
  profileId: string
): Promise<TwitterProfile | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as TwitterProfile;
  } catch (error) {
    logger.error(`Error fetching profile by ID ${profileId}:`, error);
    return null;
  }
}

/**
 * Create or update profile (upsert)
 * Returns the profile ID
 */
export async function upsertProfile(
  profileData: Partial<TwitterProfile>
): Promise<string> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_profiles")
      .upsert(
        {
          ...profileData,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: "twitter_user_id",
          ignoreDuplicates: false,
        }
      )
      .select("id")
      .single();

    if (error) throw error;

    logger.debug(`Profile upserted: ${data.id}`);
    return data.id;
  } catch (error) {
    logger.error("Error upserting profile:", error);
    throw error;
  }
}

/**
 * Get profiles in a specific zone
 */
export async function getProfilesByZone(
  zoneId: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: "followers" | "tweets" | "engagement";
  } = {}
): Promise<TwitterProfile[]> {
  try {
    const supabase = createAdminClient();
    const { limit = 100, offset = 0, sortBy = "followers" } = options;

    // Get unique profile IDs from tweets in this zone
    const { data: tweetData } = await supabase
      .from("twitter_tweets")
      .select("author_profile_id")
      .eq("zone_id", zoneId);

    if (!tweetData || tweetData.length === 0) return [];

    const profileIds = [...new Set(tweetData.map((t) => t.author_profile_id))];

    // Get profiles
    let query = supabase
      .from("twitter_profiles")
      .select("*")
      .in("id", profileIds);

    // Sort
    if (sortBy === "followers") {
      query = query.order("followers_count", { ascending: false });
    } else if (sortBy === "tweets") {
      query = query.order("total_tweets_collected", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    return (data as TwitterProfile[]) || [];
  } catch (error) {
    logger.error(`Error fetching profiles for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get profile stats evolution (snapshots)
 */
export async function getProfileGrowth(
  profileId: string,
  days: number = 30
): Promise<TwitterProfileSnapshot[]> {
  try {
    const supabase = createAdminClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("twitter_profile_snapshots")
      .select("*")
      .eq("profile_id", profileId)
      .gte("snapshot_at", startDate.toISOString())
      .order("snapshot_at", { ascending: true });

    if (error) throw error;

    return (data as TwitterProfileSnapshot[]) || [];
  } catch (error) {
    logger.error(`Error fetching profile growth ${profileId}:`, error);
    return [];
  }
}

/**
 * Create profile snapshot
 */
export async function createProfileSnapshot(
  profileId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Get current profile stats
    const profile = await getProfileById(profileId);
    if (!profile) return;

    // Get last snapshot for delta calculation
    const { data: lastSnapshot } = await supabase
      .from("twitter_profile_snapshots")
      .select("*")
      .eq("profile_id", profileId)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .single();

    const deltaFollowers = lastSnapshot
      ? profile.followers_count - lastSnapshot.followers_count
      : 0;
    const deltaFollowing = lastSnapshot
      ? profile.following_count - lastSnapshot.following_count
      : 0;
    const deltaTweets = lastSnapshot
      ? profile.tweets_count - lastSnapshot.tweets_count
      : 0;

    // Calculate growth rate (followers per day)
    let followersGrowthRate = null;
    if (lastSnapshot) {
      const hoursSinceLastSnapshot =
        (new Date().getTime() - new Date(lastSnapshot.snapshot_at).getTime()) /
        (1000 * 60 * 60);
      const daysSinceLastSnapshot = hoursSinceLastSnapshot / 24;
      if (daysSinceLastSnapshot > 0) {
        followersGrowthRate = deltaFollowers / daysSinceLastSnapshot;
      }
    }

    // Insert snapshot
    const { error } = await supabase.from("twitter_profile_snapshots").insert({
      profile_id: profileId,
      followers_count: profile.followers_count,
      following_count: profile.following_count,
      tweets_count: profile.tweets_count,
      favourites_count: profile.favourites_count,
      delta_followers: deltaFollowers,
      delta_following: deltaFollowing,
      delta_tweets: deltaTweets,
      followers_growth_rate: followersGrowthRate,
    });

    if (error) throw error;

    logger.debug(`Profile snapshot created: ${profileId}`);
  } catch (error) {
    logger.error(`Error creating profile snapshot ${profileId}:`, error);
  }
}

/**
 * Get profiles by tag type (for Share of Voice)
 */
export async function getProfilesByTag(
  zoneId: string,
  tagType: TwitterProfileTagType
): Promise<TwitterProfile[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_profile_zone_tags")
      .select(
        `
        profile_id,
        twitter_profiles (*)
      `
      )
      .eq("zone_id", zoneId)
      .eq("tag_type", tagType);

    if (error) throw error;

    return data?.map((item: any) => item.twitter_profiles) || [];
  } catch (error) {
    logger.error(`Error fetching profiles by tag ${tagType}:`, error);
    return [];
  }
}

/**
 * Add tag to profile
 */
export async function addProfileTag(
  profileId: string,
  zoneId: string,
  tagType: TwitterProfileTagType,
  notes?: string,
  createdBy?: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("twitter_profile_zone_tags").insert({
      profile_id: profileId,
      zone_id: zoneId,
      tag_type: tagType,
      notes: notes || null,
      created_by: createdBy || null,
    });

    if (error) throw error;

    logger.info(`Profile tag added: ${profileId} -> ${tagType}`);
  } catch (error) {
    logger.error("Error adding profile tag:", error);
    throw error;
  }
}

/**
 * Remove tag from profile
 */
export async function removeProfileTag(
  profileId: string,
  zoneId: string,
  tagType: TwitterProfileTagType
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("twitter_profile_zone_tags")
      .delete()
      .eq("profile_id", profileId)
      .eq("zone_id", zoneId)
      .eq("tag_type", tagType);

    if (error) throw error;

    logger.info(`Profile tag removed: ${profileId} -> ${tagType}`);
  } catch (error) {
    logger.error("Error removing profile tag:", error);
    throw error;
  }
}

/**
 * Get all tags for a profile in a zone
 */
export async function getProfileTags(
  profileId: string,
  zoneId: string
): Promise<TwitterProfileZoneTag[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_profile_zone_tags")
      .select("*")
      .eq("profile_id", profileId)
      .eq("zone_id", zoneId);

    if (error) throw error;

    return (data as TwitterProfileZoneTag[]) || [];
  } catch (error) {
    logger.error("Error fetching profile tags:", error);
    return [];
  }
}

/**
 * Calculate profile ratios (posts vs replies vs retweets)
 */
export async function getProfileRatios(
  profileId: string,
  zoneId: string
): Promise<TwitterProfileRatios> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_tweets")
      .select("is_reply, raw_data")
      .eq("zone_id", zoneId)
      .eq("author_profile_id", profileId);

    if (error) throw error;

    const total = data?.length || 0;
    const replies = data?.filter((t) => t.is_reply).length || 0;
    const retweets =
      data?.filter((t) =>
        t.raw_data?.referenced_tweets?.some(
          (ref: any) => ref.type === "retweeted"
        )
      ).length || 0;
    const originals = total - replies - retweets;

    return {
      total_posts: total,
      original_posts: originals,
      replies,
      retweets,
      reply_ratio: total > 0 ? replies / total : 0,
      retweet_ratio: total > 0 ? retweets / total : 0,
      original_ratio: total > 0 ? originals / total : 0,
    };
  } catch (error) {
    logger.error("Error calculating profile ratios:", error);
    return {
      total_posts: 0,
      original_posts: 0,
      replies: 0,
      retweets: 0,
      reply_ratio: 0,
      retweet_ratio: 0,
      original_ratio: 0,
    };
  }
}

/**
 * Update profile stats (last_seen, total_tweets_collected)
 */
export async function updateProfileStats(profileId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Count tweets from this profile
    const { count } = await supabase
      .from("twitter_tweets")
      .select("*", { count: "exact", head: true })
      .eq("author_profile_id", profileId);

    // Update profile
    const { error } = await supabase
      .from("twitter_profiles")
      .update({
        total_tweets_collected: count || 0,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (error) throw error;

    logger.debug(`Profile stats updated: ${profileId}`);
  } catch (error) {
    logger.error(`Error updating profile stats ${profileId}:`, error);
  }
}

