/**
 * Media Rule Toggle Active Status
 * 
 * POST /api/media/rules/[id]/toggle - Toggle rule active/inactive
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { canManageZones } from "@/lib/auth/permissions";
import { getRuleById, toggleRuleActive } from "@/lib/data/media";
import { logger } from "@/lib/logger";

/**
 * POST /api/media/rules/[id]/toggle
 * Toggle rule active status
 */
export async function POST(
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
    const { is_active } = body;

    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "is_active must be a boolean" },
        { status: 400 }
      );
    }

    // Toggle rule
    const rule = await toggleRuleActive(id, is_active);

    if (!rule) {
      return NextResponse.json(
        { error: "Failed to toggle rule" },
        { status: 500 }
      );
    }

    logger.info(`Media rule ${is_active ? "activated" : "deactivated"} via API`, {
      ruleId: id,
      userId: user.id,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    logger.error("Error toggling media rule", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

