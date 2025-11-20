/**
 * TikTok Rules API Routes - Toggle Active
 * POST /api/tiktok/rules/[id]/toggle - Toggle rule active status
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth/utils";
import { getRuleById, toggleRuleActive } from "@/lib/data/tiktok";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/tiktok/rules/[id]/toggle
 * Toggle rule active status
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { is_active } = body;

    // Validate input
    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "is_active must be a boolean" },
        { status: 400 }
      );
    }

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

    // Toggle active status
    const rule = await toggleRuleActive(id, is_active);

    // Revalidate zone settings page
    revalidatePath(`/dashboard/zones/${rule.zone_id}/settings`);

    return NextResponse.json({ rule });
  } catch (error) {
    logger.error(`Error in POST /api/tiktok/rules/${context.params}/toggle:`, error);
    return NextResponse.json(
      { error: "Failed to toggle rule" },
      { status: 500 }
    );
  }
}

