/**
 * Media Rules Data Layer
 * 
 * Handles monitoring rule configuration and management.
 * Rules define what articles to fetch from Event Registry API.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { MediaRule, MediaRuleWithStats } from "@/types";

/**
 * Get all rules for a zone
 * 
 * @param zoneId - Zone ID
 * @param includeInactive - Whether to include inactive rules
 * @returns Array of media rules
 */
export async function getRulesByZone(
  zoneId: string,
  includeInactive = true
): Promise<MediaRule[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("media_rules")
      .select("*")
      .eq("zone_id", zoneId)
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as MediaRule[]) || [];
  } catch (error) {
    logger.error(`Failed to fetch rules for zone ${zoneId}`, { error });
    return [];
  }
}

/**
 * Get rule by ID
 * 
 * @param ruleId - Rule ID
 * @returns Media rule or null
 */
export async function getRuleById(
  ruleId: string
): Promise<MediaRule | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as MediaRule;
  } catch (error) {
    logger.error(`Failed to fetch rule ${ruleId}`, { error });
    return null;
  }
}

/**
 * Get rules with statistics
 * Includes recent article counts for each rule
 * 
 * @param zoneId - Zone ID
 * @returns Array of rules with stats
 */
export async function getRulesWithStats(
  zoneId: string
): Promise<MediaRuleWithStats[]> {
  try {
    const rules = await getRulesByZone(zoneId);

    // TODO: In future, optimize with a single query using RPC
    // For now, we'll just return rules without stats
    // Stats can be added later via aggregation query
    
    return rules;
  } catch (error) {
    logger.error(`Failed to fetch rules with stats for zone ${zoneId}`, { error });
    return [];
  }
}

/**
 * Create a new monitoring rule
 * 
 * @param rule - Rule data to insert
 * @returns Created rule
 */
export async function createRule(
  rule: Omit<MediaRule, "id" | "created_at" | "updated_at" | "last_fetched_at" | "last_fetch_status" | "last_fetch_error" | "articles_collected">
): Promise<MediaRule | null> {
  try {
    const supabase = createAdminClient();

    // Validate: Check if rule with same name already exists in zone
    const { data: existing } = await supabase
      .from("media_rules")
      .select("id")
      .eq("zone_id", rule.zone_id)
      .eq("name", rule.name)
      .single();

    if (existing) {
      throw new Error(`Rule with name "${rule.name}" already exists in this zone`);
    }

    const { data, error } = await supabase
      .from("media_rules")
      .insert([{
        ...rule,
        articles_collected: 0,
      }])
      .select()
      .single();

    if (error) throw error;

    logger.info("Media rule created", { 
      ruleId: data.id, 
      zonId: rule.zone_id,
      name: rule.name 
    });

    return data as MediaRule;
  } catch (error) {
    logger.error("Failed to create media rule", { 
      zonId: rule.zone_id,
      name: rule.name,
      error 
    });
    return null;
  }
}

/**
 * Update an existing rule
 * 
 * @param ruleId - Rule ID
 * @param updates - Fields to update
 * @returns Updated rule
 */
export async function updateRule(
  ruleId: string,
  updates: Partial<Omit<MediaRule, "id" | "zone_id" | "created_at" | "created_by">>
): Promise<MediaRule | null> {
  try {
    const supabase = createAdminClient();

    // If updating name, check uniqueness
    if (updates.name) {
      const rule = await getRuleById(ruleId);
      if (!rule) return null;

      const { data: existing } = await supabase
        .from("media_rules")
        .select("id")
        .eq("zone_id", rule.zone_id)
        .eq("name", updates.name)
        .neq("id", ruleId)
        .single();

      if (existing) {
        throw new Error(`Rule with name "${updates.name}" already exists in this zone`);
      }
    }

    const { data, error } = await supabase
      .from("media_rules")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .select()
      .single();

    if (error) throw error;

    logger.info("Media rule updated", { ruleId });

    return data as MediaRule;
  } catch (error) {
    logger.error(`Failed to update rule ${ruleId}`, { error });
    return null;
  }
}

/**
 * Delete a rule
 * 
 * @param ruleId - Rule ID
 * @returns Success boolean
 */
export async function deleteRule(ruleId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("media_rules")
      .delete()
      .eq("id", ruleId);

    if (error) throw error;

    logger.info("Media rule deleted", { ruleId });

    return true;
  } catch (error) {
    logger.error(`Failed to delete rule ${ruleId}`, { error });
    return false;
  }
}

/**
 * Toggle rule active status
 * 
 * @param ruleId - Rule ID
 * @param isActive - New active status
 * @returns Updated rule
 */
export async function toggleRuleActive(
  ruleId: string,
  isActive: boolean
): Promise<MediaRule | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_rules")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Media rule ${isActive ? "activated" : "deactivated"}`, { ruleId });

    return data as MediaRule;
  } catch (error) {
    logger.error(`Failed to toggle rule ${ruleId}`, { error });
    return null;
  }
}

/**
 * Update rule fetch status after a fetch attempt
 * 
 * @param ruleId - Rule ID
 * @param status - Fetch status
 * @param articlesAdded - Number of articles added
 * @param error - Optional error message
 * @returns Updated rule
 */
export async function updateRuleFetchStatus(
  ruleId: string,
  status: "success" | "error" | "rate_limited",
  articlesAdded: number = 0,
  error?: string
): Promise<MediaRule | null> {
  try {
    const supabase = createAdminClient();

    const rule = await getRuleById(ruleId);
    if (!rule) return null;

    const { data, error: updateError } = await supabase
      .from("media_rules")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_fetch_status: status,
        last_fetch_error: error || null,
        articles_collected: rule.articles_collected + articlesAdded,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .select()
      .single();

    if (updateError) throw updateError;

    logger.info("Rule fetch status updated", { 
      ruleId, 
      status, 
      articlesAdded 
    });

    return data as MediaRule;
  } catch (error) {
    logger.error(`Failed to update fetch status for rule ${ruleId}`, { error });
    return null;
  }
}

/**
 * Get rules that need to be fetched
 * Returns rules where:
 * - is_active = true
 * - last_fetched_at is null OR (now - last_fetched_at) >= fetch_interval_minutes
 * 
 * @returns Array of rules ready to fetch
 */
export async function getRulesDueForFetch(): Promise<MediaRule[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("media_rules")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    // Filter rules that are due for fetch
    const now = new Date();
    const dueRules = (data as MediaRule[])?.filter(rule => {
      if (!rule.last_fetched_at) return true;

      const lastFetch = new Date(rule.last_fetched_at);
      const minutesSinceLastFetch = 
        (now.getTime() - lastFetch.getTime()) / (1000 * 60);

      return minutesSinceLastFetch >= rule.fetch_interval_minutes;
    }) || [];

    logger.info("Rules due for fetch", { count: dueRules.length });

    return dueRules;
  } catch (error) {
    logger.error("Failed to get rules due for fetch", { error });
    return [];
  }
}

/**
 * Get active rules count for a zone
 * 
 * @param zoneId - Zone ID
 * @returns Number of active rules
 */
export async function getActiveRulesCount(zoneId: string): Promise<number> {
  try {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from("media_rules")
      .select("*", { count: "exact", head: true })
      .eq("zone_id", zoneId)
      .eq("is_active", true);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    logger.error(`Failed to count active rules for zone ${zoneId}`, { error });
    return 0;
  }
}

/**
 * Validate rule query configuration
 * Ensures required fields are present based on query type
 * 
 * @param queryType - Type of query
 * @param queryConfig - Query configuration object
 * @returns Validation result
 */
export function validateRuleQuery(
  queryType: "simple" | "advanced",
  queryConfig: Record<string, any>
): { valid: boolean; error?: string } {
  if (queryType === "simple") {
    // Simple query requires at least keyword or sourceUri
    if (!queryConfig.keyword && !queryConfig.sourceUri) {
      return {
        valid: false,
        error: "Simple query requires either keyword or sourceUri",
      };
    }
  } else if (queryType === "advanced") {
    // Advanced query is flexible but should have at least one search parameter
    const hasSearchParam = 
      queryConfig.keyword ||
      queryConfig.sourceUri ||
      queryConfig.conceptUri ||
      queryConfig.categoryUri;

    if (!hasSearchParam) {
      return {
        valid: false,
        error: "Advanced query requires at least one search parameter",
      };
    }
  }

  return { valid: true };
}

