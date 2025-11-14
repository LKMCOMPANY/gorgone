/**
 * Twitter Rules API
 * Manages webhook rules for TwitterAPI.io integration
 * 
 * @route POST /api/twitter/rules - Create new rule
 * @route GET /api/twitter/rules - List rules for a zone
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import * as twitterApi from "@/lib/api/twitter/client";
import * as rulesData from "@/lib/data/twitter/rules";
import { generateQuery, validateConfig } from "@/lib/data/twitter/query-builder";
import type { TwitterRule, TwitterQueryBuilderConfig } from "@/types";

/**
 * Validation schema for rule creation
 */
interface CreateRuleRequest {
  zone_id: string;
  rule_name: string;
  query_type: "simple" | "builder";
  query_string?: string; // For simple mode
  query_builder_config?: TwitterQueryBuilderConfig; // For builder mode
  interval: number; // Seconds
}

/**
 * POST /api/twitter/rules
 * Create a new Twitter monitoring rule
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateRuleRequest = await request.json();

    // =====================================================
    // STEP 1: VALIDATION
    // =====================================================

    // Validate required fields
    if (!body.zone_id || !body.rule_name || !body.query_type || !body.interval) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: zone_id, rule_name, query_type, interval" 
        },
        { status: 400 }
      );
    }

    // Validate interval (minimum 60 seconds as per twitterapi.io)
    if (body.interval < 60) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Interval must be at least 60 seconds" 
        },
        { status: 400 }
      );
    }

    // Validate query based on type
    let finalQuery: string;

    if (body.query_type === "simple") {
      // Simple mode: direct query string
      if (!body.query_string || body.query_string.trim() === "") {
        return NextResponse.json(
          { 
            success: false, 
            error: "Query string is required for simple mode" 
          },
          { status: 400 }
        );
      }
      finalQuery = body.query_string.trim();

    } else if (body.query_type === "builder") {
      // Builder mode: generate query from config
      if (!body.query_builder_config) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Query builder config is required for builder mode" 
          },
          { status: 400 }
        );
      }

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
      finalQuery = generateQuery(body.query_builder_config);
      
      if (!finalQuery || finalQuery.trim() === "") {
        return NextResponse.json(
          { 
            success: false, 
            error: "Generated query is empty. Please add at least one filter." 
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid query_type. Must be 'simple' or 'builder'" 
        },
        { status: 400 }
      );
    }

    logger.info(`Creating Twitter rule for zone ${body.zone_id}`, {
      rule_name: body.rule_name,
      query: finalQuery,
      interval: body.interval,
    });

    // =====================================================
    // STEP 2: CREATE RULE IN SUPABASE (LOCAL DB)
    // =====================================================

    const ruleData: Partial<TwitterRule> = {
      zone_id: body.zone_id,
      tag: body.rule_name,
      query: finalQuery,
      query_type: body.query_type,
      interval_seconds: body.interval,
      query_builder_config: body.query_type === "builder" ? body.query_builder_config : null,
      is_active: true,
    };

    const ruleId = await rulesData.createRule(ruleData);

    if (!ruleId) {
      throw new Error("Failed to create rule in database");
    }

    // =====================================================
    // STEP 3: CREATE WEBHOOK RULE IN TWITTERAPI.IO
    // =====================================================

    const webhookUrl = `${env.appUrl}/api/webhooks/twitter`;

    const webhookResult = await twitterApi.addWebhookRule({
      query: finalQuery,
      interval: body.interval,
      webhook_url: webhookUrl,
    });

    if (!webhookResult || !webhookResult.rule_id) {
      // Rollback: Delete local rule since API call failed
      logger.error("Failed to create webhook rule in TwitterAPI.io", {
        query: finalQuery,
        interval: body.interval,
        webhook_url: webhookUrl,
        result: webhookResult,
      });
      await rulesData.deleteRule(ruleId);
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to create webhook rule in TwitterAPI.io. Please check your API key and query syntax." 
        },
        { status: 500 }
      );
    }

    // =====================================================
    // STEP 4: UPDATE LOCAL RULE WITH EXTERNAL ID
    // =====================================================

    await rulesData.updateRule(ruleId, {
      external_rule_id: webhookResult.rule_id,
    });

    logger.info(`Twitter rule created successfully`, {
      local_id: ruleId,
      external_id: webhookResult.rule_id,
      zone_id: body.zone_id,
    });

    // =====================================================
    // STEP 5: FETCH AND RETURN CREATED RULE
    // =====================================================

    const createdRule = await rulesData.getRuleById(ruleId);

    return NextResponse.json({
      success: true,
      message: "Twitter rule created successfully",
      rule: createdRule,
    }, { status: 201 });

  } catch (error) {
    logger.error("Error creating Twitter rule:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error while creating rule" 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/twitter/rules?zone_id=xxx
 * List all rules for a zone
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zone_id");
    const includeInactive = searchParams.get("include_inactive") === "true";

    // Validate zone_id
    if (!zoneId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required parameter: zone_id" 
        },
        { status: 400 }
      );
    }

    logger.debug(`Fetching Twitter rules for zone ${zoneId}`);

    // Fetch rules from database
    const rules = await rulesData.getRulesByZone(zoneId, includeInactive);

    return NextResponse.json({
      success: true,
      rules,
      count: rules.length,
    });

  } catch (error) {
    logger.error("Error fetching Twitter rules:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error while fetching rules" 
      },
      { status: 500 }
    );
  }
}

