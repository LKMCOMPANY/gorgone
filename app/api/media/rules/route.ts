/**
 * Media Rules API Routes
 * 
 * GET    /api/media/rules?zoneId=xxx - List rules for a zone
 * POST   /api/media/rules              - Create a new rule
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { canManageZones } from "@/lib/auth/permissions";
import {
  getRulesByZone,
  createRule,
  validateRuleQuery,
} from "@/lib/data/media";
import { logger } from "@/lib/logger";

/**
 * GET /api/media/rules
 * List all rules for a zone
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get zoneId from query params
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zoneId");

    if (!zoneId) {
      return NextResponse.json(
        { error: "zoneId is required" },
        { status: 400 }
      );
    }

    // Fetch rules
    const rules = await getRulesByZone(zoneId);

    return NextResponse.json({ rules });
  } catch (error) {
    logger.error("Error fetching media rules", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media/rules
 * Create a new monitoring rule
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const {
      zone_id,
      name,
      description,
      query_type,
      query_config,
      fetch_interval_minutes = 60,
      articles_per_fetch = 100,
      sort_by = "date",
      sort_asc = false,
      data_types = ["news"],
      force_max_data_time_window,
      duplicate_filter = "skipDuplicates",
      event_filter = "keepAll",
      include_body = true,
      include_social_score = true,
      include_sentiment = true,
      include_concepts = false,
      include_categories = false,
      include_authors = true,
      include_videos = false,
      include_links = false,
    } = body;

    // Validation
    if (!zone_id || !name || !query_type || !query_config) {
      return NextResponse.json(
        { error: "Missing required fields: zone_id, name, query_type, query_config" },
        { status: 400 }
      );
    }

    // Validate query configuration
    const validation = validateRuleQuery(query_type, query_config);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Validate intervals
    if (fetch_interval_minutes < 15) {
      return NextResponse.json(
        { error: "fetch_interval_minutes must be at least 15" },
        { status: 400 }
      );
    }

    if (articles_per_fetch < 1 || articles_per_fetch > 100) {
      return NextResponse.json(
        { error: "articles_per_fetch must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Create rule
    const rule = await createRule({
      zone_id,
      name,
      description: description || null,
      query_type,
      query_config,
      fetch_interval_minutes,
      articles_per_fetch,
      sort_by,
      sort_asc,
      data_types,
      force_max_data_time_window: force_max_data_time_window || null,
      duplicate_filter,
      event_filter,
      include_body,
      include_social_score,
      include_sentiment,
      include_concepts,
      include_categories,
      include_authors,
      include_videos,
      include_links,
      is_active: true,
      created_by: user.id,
    });

    if (!rule) {
      return NextResponse.json(
        { error: "Failed to create rule" },
        { status: 500 }
      );
    }

    logger.info("Media rule created via API", {
      ruleId: rule.id,
      zoneId: zone_id,
      userId: user.id,
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    logger.error("Error creating media rule", { error });
    
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

