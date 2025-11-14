/**
 * Twitter Rules Data Layer
 * Handles webhook rule management and configuration
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { TwitterRule, TwitterQueryBuilderConfig } from "@/types";

/**
 * Create a new Twitter rule
 */
export async function createRule(
  rule: Partial<TwitterRule>
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_rules")
      .insert(rule)
      .select("id")
      .single();

    if (error) throw error;

    logger.info(`Twitter rule created: ${data.id}`);
    return data.id;
  } catch (error) {
    logger.error("Error creating Twitter rule:", error);
    return null;
  }
}

/**
 * Get rule by ID
 */
export async function getRuleById(
  ruleId: string
): Promise<TwitterRule | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as TwitterRule;
  } catch (error) {
    logger.error(`Error fetching rule ${ruleId}:`, error);
    return null;
  }
}

/**
 * Get rules by zone
 */
export async function getRulesByZone(
  zoneId: string,
  includeInactive = false
): Promise<TwitterRule[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("twitter_rules")
      .select("*")
      .eq("zone_id", zoneId)
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as TwitterRule[]) || [];
  } catch (error) {
    logger.error(`Error fetching rules for zone ${zoneId}:`, error);
    return [];
  }
}

/**
 * Get rule by external API ID
 */
export async function getRuleByApiId(
  apiRuleId: string
): Promise<TwitterRule | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_rules")
      .select("*")
      .eq("api_rule_id", apiRuleId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as TwitterRule;
  } catch (error) {
    logger.error(`Error fetching rule by API ID ${apiRuleId}:`, error);
    return null;
  }
}

/**
 * Update rule
 */
export async function updateRule(
  ruleId: string,
  updates: Partial<TwitterRule>
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("twitter_rules")
      .update(updates)
      .eq("id", ruleId);

    if (error) throw error;

    logger.info(`Twitter rule updated: ${ruleId}`);
  } catch (error) {
    logger.error(`Error updating rule ${ruleId}:`, error);
  }
}

/**
 * Update rule API ID (after creating in TwitterAPI.io)
 */
export async function updateRuleApiId(
  ruleId: string,
  apiRuleId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("twitter_rules")
      .update({
        api_rule_id: apiRuleId,
      })
      .eq("id", ruleId);

    if (error) throw error;

    logger.info(`Rule API ID updated: ${ruleId} -> ${apiRuleId}`);
  } catch (error) {
    logger.error(`Error updating rule API ID for ${ruleId}:`, error);
  }
}

/**
 * Update rule last triggered timestamp
 */
export async function updateRuleLastTriggered(
  ruleId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("twitter_rules")
      .update({
        last_triggered_at: new Date().toISOString(),
      })
      .eq("id", ruleId);

    if (error) throw error;

    logger.debug(`Rule last triggered updated: ${ruleId}`);
  } catch (error) {
    logger.error(`Error updating rule last triggered for ${ruleId}:`, error);
  }
}

/**
 * Activate/deactivate rule
 */
export async function toggleRule(
  ruleId: string,
  isActive: boolean
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("twitter_rules")
      .update({
        is_active: isActive,
      })
      .eq("id", ruleId);

    if (error) throw error;

    logger.info(`Rule ${isActive ? "activated" : "deactivated"}: ${ruleId}`);
  } catch (error) {
    logger.error(`Error toggling rule ${ruleId}:`, error);
  }
}

/**
 * Delete rule
 */
export async function deleteRule(ruleId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("twitter_rules")
      .delete()
      .eq("id", ruleId);

    if (error) throw error;

    logger.info(`Twitter rule deleted: ${ruleId}`);
  } catch (error) {
    logger.error(`Error deleting rule ${ruleId}:`, error);
  }
}

/**
 * Get all active rules (for cron/worker)
 */
export async function getActiveRules(): Promise<TwitterRule[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("twitter_rules")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data as TwitterRule[]) || [];
  } catch (error) {
    logger.error("Error fetching active rules:", error);
    return [];
  }
}

/**
 * Count rules for a zone
 */
export async function countRules(
  zoneId: string,
  activeOnly = false
): Promise<number> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("twitter_rules")
      .select("*", { count: "exact", head: true })
      .eq("zone_id", zoneId);

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  } catch (error) {
    logger.error(`Error counting rules for zone ${zoneId}:`, error);
    return 0;
  }
}

/**
 * Validate query builder config
 */
export function validateQueryBuilderConfig(
  config: TwitterQueryBuilderConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if at least one query operator is provided
  const hasQueryOperators =
    config.from_users.length > 0 ||
    config.to_users.length > 0 ||
    config.mentions.length > 0 ||
    config.keywords.length > 0 ||
    config.hashtags.length > 0;

  if (!hasQueryOperators) {
    errors.push(
      "At least one query operator is required (from_users, to_users, mentions, keywords, or hashtags)"
    );
  }

  // Validate interval
  if (config.interval && config.interval < 60) {
    errors.push("Interval must be at least 60 seconds");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

