/**
 * Twitter Rule Management API
 * Handles individual rule operations
 * 
 * @route PATCH /api/twitter/rules/[id] - Update rule
 * @route DELETE /api/twitter/rules/[id] - Delete rule
 * @route POST /api/twitter/rules/[id]/toggle - Activate/deactivate rule
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import * as twitterApi from "@/lib/api/twitter/client";
import * as rulesData from "@/lib/data/twitter/rules";
import { generateQuery, validateConfig } from "@/lib/data/twitter/query-builder";
import type { TwitterQueryBuilderConfig } from "@/types";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/twitter/rules/[id]
 * Update an existing Twitter monitoring rule
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ruleId = params.id;
    const body = await request.json();

    logger.info(`Updating Twitter rule ${ruleId}`);

    // =====================================================
    // STEP 1: FETCH EXISTING RULE
    // =====================================================

    const existingRule = await rulesData.getRuleById(ruleId);

    if (!existingRule) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rule not found" 
        },
        { status: 404 }
      );
    }

    // =====================================================
    // STEP 2: VALIDATE AND PREPARE UPDATES
    // =====================================================

    const updates: any = {};
    let queryUpdated = false;
    let intervalUpdated = false;
    let newQuery: string | undefined;

    // Update rule name (tag)
    if (body.rule_name && body.rule_name !== existingRule.tag) {
      updates.tag = body.rule_name;
    }

    // Update interval
    if (body.interval !== undefined && body.interval !== existingRule.interval_seconds) {
      if (body.interval < 60) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Interval must be at least 60 seconds" 
          },
          { status: 400 }
        );
      }
      updates.interval_seconds = body.interval;
      intervalUpdated = true;
    }

    // Update query (if provided)
    if (body.query_type) {
      if (body.query_type === "simple" && body.query_string) {
        newQuery = body.query_string.trim();
        updates.query = newQuery;
        updates.query_type = "simple";
        updates.query_builder_config = null;
        queryUpdated = true;

      } else if (body.query_type === "builder" && body.query_builder_config) {
        // Validate config
        const validation = validateConfig(body.query_builder_config);
        if (!validation.valid) {
          return NextResponse.json(
            { 
              success: false, 
              error: "Invalid query builder config",
              details: validation.errors 
            },
            { status: 400 }
          );
        }

        // Generate query
        newQuery = generateQuery(body.query_builder_config);
        updates.query = newQuery;
        updates.query_type = "builder";
        updates.query_builder_config = body.query_builder_config;
        queryUpdated = true;
      }
    }

    // If no updates, return early
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: true,
        message: "No changes detected",
        rule: existingRule,
      });
    }

    // =====================================================
    // STEP 3: UPDATE RULE IN TWITTERAPI.IO (IF NEEDED)
    // =====================================================

    if ((queryUpdated || intervalUpdated) && existingRule.external_rule_id) {
      const webhookUpdates: any = {};
      
      if (queryUpdated && newQuery) {
        webhookUpdates.query = newQuery;
      }
      
      if (intervalUpdated) {
        webhookUpdates.interval = updates.interval_seconds;
      }

      const success = await twitterApi.updateWebhookRule(
        existingRule.external_rule_id,
        webhookUpdates
      );

      if (!success) {
        logger.error(`Failed to update webhook rule ${existingRule.external_rule_id}`);
        return NextResponse.json(
          { 
            success: false, 
            error: "Failed to update rule in TwitterAPI.io" 
          },
          { status: 500 }
        );
      }
    }

    // =====================================================
    // STEP 4: UPDATE LOCAL DATABASE
    // =====================================================

    await rulesData.updateRule(ruleId, updates);

    logger.info(`Twitter rule updated successfully: ${ruleId}`);

    // =====================================================
    // STEP 5: FETCH AND RETURN UPDATED RULE
    // =====================================================

    const updatedRule = await rulesData.getRuleById(ruleId);

    return NextResponse.json({
      success: true,
      message: "Rule updated successfully",
      rule: updatedRule,
    });

  } catch (error) {
    logger.error("Error updating Twitter rule:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error while updating rule" 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/twitter/rules/[id]
 * Delete a Twitter monitoring rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ruleId = params.id;

    logger.info(`Deleting Twitter rule ${ruleId}`);

    // =====================================================
    // STEP 1: FETCH EXISTING RULE
    // =====================================================

    const existingRule = await rulesData.getRuleById(ruleId);

    if (!existingRule) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rule not found" 
        },
        { status: 404 }
      );
    }

    // =====================================================
    // STEP 2: DELETE FROM TWITTERAPI.IO (IF EXTERNAL ID EXISTS)
    // =====================================================

    if (existingRule.external_rule_id) {
      const success = await twitterApi.deleteWebhookRule(existingRule.external_rule_id);

      if (!success) {
        logger.warn(`Failed to delete webhook rule ${existingRule.external_rule_id} from TwitterAPI.io, proceeding with local deletion`);
        // Continue anyway - we still want to delete locally
      }
    }

    // =====================================================
    // STEP 3: DELETE FROM LOCAL DATABASE
    // =====================================================

    await rulesData.deleteRule(ruleId);

    logger.info(`Twitter rule deleted successfully: ${ruleId}`);

    return NextResponse.json({
      success: true,
      message: "Rule deleted successfully",
    });

  } catch (error) {
    logger.error("Error deleting Twitter rule:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error while deleting rule" 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/twitter/rules/[id]/toggle
 * Activate or deactivate a rule
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ruleId = params.id;
    const body = await request.json();

    logger.info(`Toggling Twitter rule ${ruleId}`);

    // Validate is_active field
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing or invalid field: is_active (must be boolean)" 
        },
        { status: 400 }
      );
    }

    // =====================================================
    // STEP 1: FETCH EXISTING RULE
    // =====================================================

    const existingRule = await rulesData.getRuleById(ruleId);

    if (!existingRule) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rule not found" 
        },
        { status: 404 }
      );
    }

    // =====================================================
    // STEP 2: UPDATE STATUS
    // =====================================================

    await rulesData.toggleRule(ruleId, body.is_active);

    logger.info(`Twitter rule ${body.is_active ? "activated" : "deactivated"}: ${ruleId}`);

    // =====================================================
    // STEP 3: RETURN UPDATED RULE
    // =====================================================

    const updatedRule = await rulesData.getRuleById(ruleId);

    return NextResponse.json({
      success: true,
      message: `Rule ${body.is_active ? "activated" : "deactivated"} successfully`,
      rule: updatedRule,
    });

  } catch (error) {
    logger.error("Error toggling Twitter rule:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error while toggling rule" 
      },
      { status: 500 }
    );
  }
}

