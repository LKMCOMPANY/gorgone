/**
 * TikTok Rules API Routes - Single Rule
 * PATCH /api/tiktok/rules/[id] - Update rule
 * DELETE /api/tiktok/rules/[id] - Delete rule
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth/utils";
import { getRuleById, updateRule, deleteRule } from "@/lib/data/tiktok";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/tiktok/rules/[id]
 * Update a rule
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Get user profile for permissions
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission (manager or super_admin)
    if (!["super_admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing rule
    const existingRule = await getRuleById(id);
    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Validate interval_minutes if provided
    if (
      body.interval_minutes &&
      ![60, 180, 360].includes(body.interval_minutes)
    ) {
      return NextResponse.json(
        { error: "interval_minutes must be 60, 180, or 360" },
        { status: 400 }
      );
    }

    // Update rule
    const rule = await updateRule(id, body);

    // Revalidate zone settings page
    revalidatePath(`/dashboard/zones/${rule.zone_id}/settings`);

    return NextResponse.json({ rule });
  } catch (error: any) {
    logger.error(`Error in PATCH /api/tiktok/rules/${context.params}:`, error);

    // Check for unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A rule with this name already exists in this zone" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tiktok/rules/[id]
 * Delete a rule
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get user profile for permissions
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission (manager or super_admin)
    if (!["super_admin", "manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing rule (for zone_id revalidation)
    const existingRule = await getRuleById(id);
    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Delete rule
    await deleteRule(id);

    // Revalidate zone settings page
    revalidatePath(`/dashboard/zones/${existingRule.zone_id}/settings`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Error in DELETE /api/tiktok/rules/${context.params}:`, error);
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
}

