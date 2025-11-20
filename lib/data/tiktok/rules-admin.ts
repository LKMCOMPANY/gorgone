/**
 * TikTok Rules Data Layer (Admin)
 * Functions that bypass RLS for workers
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { TikTokRule } from "./rules";

/**
 * Get rules due for polling (admin - bypasses RLS)
 */
export async function getRulesDueForPollingAdmin(): Promise<TikTokRule[]> {
  try {
    const supabase = createAdminClient();

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("tiktok_rules")
      .select("*")
      .eq("is_active", true)
      .or(`next_poll_at.is.null,next_poll_at.lte.${now}`)
      .order("next_poll_at", { ascending: true, nullsFirst: true });

    if (error) {
      logger.error("Error fetching rules due for polling:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error in getRulesDueForPollingAdmin:", error);
    throw error;
  }
}

/**
 * Update rule polling stats (admin - bypasses RLS)
 */
export async function updateRulePollingStatsAdmin(
  ruleId: string,
  videoCount: number
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Get current rule
    const { data: rule } = await supabase
      .from("tiktok_rules")
      .select("interval_minutes, total_videos_collected")
      .eq("id", ruleId)
      .single();

    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    // Calculate next poll time
    const nextPollAt = new Date();
    nextPollAt.setMinutes(nextPollAt.getMinutes() + rule.interval_minutes);

    const { error } = await supabase
      .from("tiktok_rules")
      .update({
        last_polled_at: new Date().toISOString(),
        next_poll_at: nextPollAt.toISOString(),
        last_video_count: videoCount,
        total_videos_collected: (rule.total_videos_collected || 0) + videoCount,
      })
      .eq("id", ruleId);

    if (error) {
      logger.error(`Error updating TikTok rule polling stats ${ruleId}:`, error);
      throw error;
    }

    logger.info(`Updated rule ${ruleId}: ${videoCount} new videos, next poll at ${nextPollAt.toISOString()}`);
  } catch (error) {
    logger.error("Error in updateRulePollingStatsAdmin:", error);
    throw error;
  }
}

