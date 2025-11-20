/**
 * TikTok Rules API Routes
 * POST /api/tiktok/rules - Create rule
 * GET /api/tiktok/rules - List rules for zone
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/auth/utils";
import { createRule, getRulesByZone } from "@/lib/data/tiktok";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

/**
 * GET /api/tiktok/rules?zone_id=xxx
 * Get all rules for a zone
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zone_id");

    if (!zoneId) {
      return NextResponse.json(
        { error: "zone_id is required" },
        { status: 400 }
      );
    }

    // Get user profile for permissions
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get rules
    const rules = await getRulesByZone(zoneId);

    return NextResponse.json({ rules });
  } catch (error) {
    logger.error("Error in GET /api/tiktok/rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tiktok/rules
 * Create a new rule
 */
export async function POST(request: NextRequest) {
  try {
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

    // Validate input
    const {
      zone_id,
      rule_type,
      rule_name,
      query,
      hashtag,
      username,
      sec_uid,
      country,
      interval_minutes,
    } = body;

    if (!zone_id || !rule_type || !rule_name || !interval_minutes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate rule_type
    if (!["keyword", "hashtag", "user", "combined"].includes(rule_type)) {
      return NextResponse.json(
        { error: "Invalid rule_type" },
        { status: 400 }
      );
    }

    // Validate interval_minutes
    if (![60, 180, 360].includes(interval_minutes)) {
      return NextResponse.json(
        { error: "interval_minutes must be 60, 180, or 360" },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (rule_type === "keyword" && !query) {
      return NextResponse.json(
        { error: "query is required for keyword type" },
        { status: 400 }
      );
    }
    if (rule_type === "hashtag" && !hashtag) {
      return NextResponse.json(
        { error: "hashtag is required for hashtag type" },
        { status: 400 }
      );
    }
    if (rule_type === "user" && !username) {
      return NextResponse.json(
        { error: "username is required for user type" },
        { status: 400 }
      );
    }
    if (rule_type === "combined" && !query) {
      return NextResponse.json(
        { error: "query is required for combined type" },
        { status: 400 }
      );
    }

    // Create rule
    const rule = await createRule(
      {
        zone_id,
        rule_type,
        rule_name,
        query,
        hashtag,
        username,
        sec_uid,
        country,
        interval_minutes,
      },
      profile.id
    );

    // ✅ AUTO-TRIGGER: Collect videos immediately after creating rule
    try {
      logger.info(`Auto-triggering polling for new rule: ${rule.id}`);
      
      // Trigger polling in background (don't await)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tiktok/test-polling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id, rule_id: rule.id }),
      }).catch(error => {
        logger.error('Failed to auto-trigger polling:', error);
      });
    } catch (error) {
      logger.error('Error auto-triggering polling:', error);
      // Don't fail rule creation if polling fails
    }

    // Revalidate zone settings page
    revalidatePath(`/dashboard/zones/${zone_id}/settings`);

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error: any) {
    logger.error("Error in POST /api/tiktok/rules:", error);

    // Check for unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A rule with this name already exists in this zone" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}

