/**
 * TikTok Profiles Data Layer
 * Handles profile tagging and tracking
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type TikTokProfileTagType = 
  | "attila" 
  | "adversary" 
  | "surveillance" 
  | "target" 
  | "ally" 
  | "asset" 
  | "local_team";

export interface TikTokProfileTag {
  id: string;
  zone_id: string;
  username: string;
  tag_type: TikTokProfileTagType;
  notes?: string;
  created_at: string;
  created_by?: string;
}

/**
 * Get all profile tags for a zone
 */
export async function getProfileTagsByZone(zoneId: string): Promise<TikTokProfileTag[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_profile_zone_tags")
      .select("*")
      .eq("zone_id", zoneId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error(`Error fetching TikTok profile tags for zone ${zoneId}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error in getProfileTagsByZone:", error);
    throw error;
  }
}

/**
 * Add a profile tag
 */
export async function addProfileTag(
  zoneId: string,
  username: string,
  tagType: TikTokProfileTagType,
  userId: string,
  notes?: string
): Promise<TikTokProfileTag> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_profile_zone_tags")
      .insert({
        zone_id: zoneId,
        username: username.toLowerCase(),
        tag_type: tagType,
        notes,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error adding TikTok profile tag:", error);
      throw error;
    }

    logger.info(`TikTok profile tagged: @${username} as ${tagType}`);
    return data;
  } catch (error) {
    logger.error("Error in addProfileTag:", error);
    throw error;
  }
}

/**
 * Remove a profile tag
 */
export async function removeProfileTag(
  zoneId: string,
  username: string,
  tagType: TikTokProfileTagType
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("tiktok_profile_zone_tags")
      .delete()
      .eq("zone_id", zoneId)
      .eq("username", username.toLowerCase())
      .eq("tag_type", tagType);

    if (error) {
      logger.error("Error removing TikTok profile tag:", error);
      throw error;
    }

    logger.info(`TikTok profile tag removed: @${username} from ${tagType}`);
  } catch (error) {
    logger.error("Error in removeProfileTag:", error);
    throw error;
  }
}

