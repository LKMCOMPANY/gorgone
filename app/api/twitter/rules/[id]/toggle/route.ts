/**
 * Twitter Rule Toggle API
 * Activate/deactivate a monitoring rule
 * 
 * @route POST /api/twitter/rules/[id]/toggle
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import * as twitterApi from "@/lib/api/twitter/client";
import * as rulesData from "@/lib/data/twitter/rules";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
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
    const { id: ruleId } = await params;
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
    // STEP 2: UPDATE STATUS IN TWITTERAPI.IO
    // =====================================================

    if (existingRule.external_rule_id) {
      const success = await twitterApi.updateWebhookRule(
        existingRule.external_rule_id,
        {
          tag: existingRule.tag,
          value: existingRule.query,
          interval_seconds: existingRule.interval_seconds,
          is_effect: body.is_active ? 1 : 0,
        }
      );

      if (!success) {
        logger.error(`Failed to toggle webhook rule ${existingRule.external_rule_id}`);
        return NextResponse.json(
          { 
            success: false, 
            error: "Failed to toggle rule in TwitterAPI.io" 
          },
          { status: 500 }
        );
      }
    }

    // =====================================================
    // STEP 3: UPDATE LOCAL DATABASE
    // =====================================================

    await rulesData.toggleRule(ruleId, body.is_active);

    logger.info(`Twitter rule ${body.is_active ? "activated" : "deactivated"}: ${ruleId}`);

    // =====================================================
    // STEP 4: RETURN UPDATED RULE
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

