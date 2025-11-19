/**
 * Media Rule Individual Operations
 * 
 * PATCH  /api/media/rules/[id] - Update a rule
 * DELETE /api/media/rules/[id] - Delete a rule
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { canManageZones } from "@/lib/auth/permissions";
import {
  getRuleById,
  updateRule,
  deleteRule,
  validateRuleQuery,
} from "@/lib/data/media";
import { logger } from "@/lib/logger";

/**
 * PATCH /api/media/rules/[id]
 * Update an existing rule
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Permission check
    if (!canManageZones(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if rule exists
    const existingRule = await getRuleById(id);
    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // If query_config is being updated, validate it
    if (body.query_config) {
      const queryType = body.query_type || existingRule.query_type;
      const validation = validateRuleQuery(queryType, body.query_config);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Validate intervals if provided
    if (body.fetch_interval_minutes !== undefined && body.fetch_interval_minutes < 15) {
      return NextResponse.json(
        { error: "fetch_interval_minutes must be at least 15" },
        { status: 400 }
      );
    }

    if (body.articles_per_fetch !== undefined) {
      if (body.articles_per_fetch < 1 || body.articles_per_fetch > 100) {
        return NextResponse.json(
          { error: "articles_per_fetch must be between 1 and 100" },
          { status: 400 }
        );
      }
    }

    // Update rule
    const rule = await updateRule(id, body);

    if (!rule) {
      return NextResponse.json(
        { error: "Failed to update rule" },
        { status: 500 }
      );
    }

    logger.info("Media rule updated via API", {
      ruleId: id,
      userId: user.id,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    logger.error("Error updating media rule", { error });
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/rules/[id]
 * Delete a rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Permission check
    if (!canManageZones(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if rule exists
    const existingRule = await getRuleById(id);
    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    // Delete rule
    const success = await deleteRule(id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete rule" },
        { status: 500 }
      );
    }

    logger.info("Media rule deleted via API", {
      ruleId: id,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting media rule", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

