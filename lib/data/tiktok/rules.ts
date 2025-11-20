/**
 * TikTok Rules Data Layer
 * Handles CRUD operations for TikTok monitoring rules
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export interface TikTokRule {
  id: string;
  zone_id: string;
  rule_type: "keyword" | "hashtag" | "user" | "combined";
  rule_name: string;
  query?: string;
  hashtag?: string;
  username?: string;
  sec_uid?: string;
  country?: string;
  interval_minutes: 60 | 180 | 360;
  is_active: boolean;
  last_polled_at?: string;
  next_poll_at?: string;
  total_videos_collected: number;
  last_video_count: number;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface CreateTikTokRuleInput {
  zone_id: string;
  rule_type: "keyword" | "hashtag" | "user" | "combined";
  rule_name: string;
  query?: string;
  hashtag?: string;
  username?: string;
  sec_uid?: string;
  country?: string;
  interval_minutes: 60 | 180 | 360;
}

export interface UpdateTikTokRuleInput {
  rule_name?: string;
  query?: string;
  hashtag?: string;
  username?: string;
  sec_uid?: string;
  country?: string;
  interval_minutes?: 60 | 180 | 360;
  is_active?: boolean;
}

/**
 * Get all rules for a zone
 */
export async function getRulesByZone(zoneId: string): Promise<TikTokRule[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_rules")
      .select("*")
      .eq("zone_id", zoneId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error(`Error fetching TikTok rules for zone ${zoneId}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error in getRulesByZone:", error);
    throw error;
  }
}

/**
 * Get active rules for a zone
 */
export async function getActiveRulesByZone(zoneId: string): Promise<TikTokRule[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_rules")
      .select("*")
      .eq("zone_id", zoneId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error(`Error fetching active TikTok rules for zone ${zoneId}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error("Error in getActiveRulesByZone:", error);
    throw error;
  }
}

/**
 * Get rule by ID
 */
export async function getRuleById(ruleId: string): Promise<TikTokRule | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      logger.error(`Error fetching TikTok rule ${ruleId}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error("Error in getRuleById:", error);
    throw error;
  }
}

/**
 * Create a new rule
 */
export async function createRule(
  input: CreateTikTokRuleInput,
  userId: string
): Promise<TikTokRule> {
  try {
    const supabase = await createClient();

    // Calculate next_poll_at based on interval
    const nextPollAt = new Date();
    nextPollAt.setMinutes(nextPollAt.getMinutes() + input.interval_minutes);

    const { data, error } = await supabase
      .from("tiktok_rules")
      .insert({
        ...input,
        created_by: userId,
        next_poll_at: nextPollAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating TikTok rule:", error);
      throw error;
    }

    logger.info(`TikTok rule created: ${data.id} (${data.rule_name})`);
    return data;
  } catch (error) {
    logger.error("Error in createRule:", error);
    throw error;
  }
}

/**
 * Update a rule
 */
export async function updateRule(
  ruleId: string,
  updates: UpdateTikTokRuleInput
): Promise<TikTokRule> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tiktok_rules")
      .update(updates)
      .eq("id", ruleId)
      .select()
      .single();

    if (error) {
      logger.error(`Error updating TikTok rule ${ruleId}:`, error);
      throw error;
    }

    logger.info(`TikTok rule updated: ${ruleId}`);
    return data;
  } catch (error) {
    logger.error("Error in updateRule:", error);
    throw error;
  }
}

/**
 * Delete a rule
 */
export async function deleteRule(ruleId: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("tiktok_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      logger.error(`Error deleting TikTok rule ${ruleId}:`, error);
      throw error;
    }

    logger.info(`TikTok rule deleted: ${ruleId}`);
  } catch (error) {
    logger.error("Error in deleteRule:", error);
    throw error;
  }
}

/**
 * Toggle rule active status
 */
export async function toggleRuleActive(
  ruleId: string,
  isActive: boolean
): Promise<TikTokRule> {
  try {
    const supabase = await createClient();

    const updates: Record<string, any> = { is_active: isActive };

    // If activating, set next poll time
    if (isActive) {
      const rule = await getRuleById(ruleId);
      if (rule) {
        const nextPollAt = new Date();
        nextPollAt.setMinutes(nextPollAt.getMinutes() + rule.interval_minutes);
        updates.next_poll_at = nextPollAt.toISOString();
      }
    }

    const { data, error } = await supabase
      .from("tiktok_rules")
      .update(updates)
      .eq("id", ruleId)
      .select()
      .single();

    if (error) {
      logger.error(`Error toggling TikTok rule ${ruleId}:`, error);
      throw error;
    }

    logger.info(`TikTok rule ${isActive ? "activated" : "deactivated"}: ${ruleId}`);
    return data;
  } catch (error) {
    logger.error("Error in toggleRuleActive:", error);
    throw error;
  }
}

/**
 * Update rule polling stats
 */
export async function updateRulePollingStats(
  ruleId: string,
  videoCount: number
): Promise<void> {
  try {
    const supabase = await createClient();

    const rule = await getRuleById(ruleId);
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
        total_videos_collected: rule.total_videos_collected + videoCount,
      })
      .eq("id", ruleId);

    if (error) {
      logger.error(`Error updating TikTok rule polling stats ${ruleId}:`, error);
      throw error;
    }
  } catch (error) {
    logger.error("Error in updateRulePollingStats:", error);
    throw error;
  }
}

/**
 * Get rules that need to be polled
 * Uses admin client to bypass RLS (needed for cron jobs)
 */
export async function getRulesDueForPolling(): Promise<TikTokRule[]> {
  try {
    const supabase = createAdminClient();

    const now = new Date().toISOString();

    // First, check all active rules for debugging
    const { data: allActiveRules } = supabase
      .from("tiktok_rules")
      .select("id, rule_name, is_active, next_poll_at, last_polled_at")
      .eq("is_active", true);

    logger.info(`[Polling Check] Current time: ${now}`);
    logger.info(`[Polling Check] Found ${allActiveRules?.length || 0} active rules`);
    
    if (allActiveRules && allActiveRules.length > 0) {
      allActiveRules.forEach(rule => {
        logger.info(`[Polling Check] Rule "${rule.rule_name}": next_poll_at=${rule.next_poll_at}, last_polled_at=${rule.last_polled_at}`);
      });
    }

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

    logger.info(`[Polling Check] ${data?.length || 0} rules are due for polling`);

    return data || [];
  } catch (error) {
    logger.error("Error in getRulesDueForPolling:", error);
    throw error;
  }
}

