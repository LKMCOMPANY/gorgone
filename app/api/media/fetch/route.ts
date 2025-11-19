/**
 * Media Fetch API Route
 * 
 * POST /api/media/fetch - Manually trigger article fetch for a specific rule
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { canManageZones } from "@/lib/auth/permissions";
import { fetchArticlesForSpecificRule } from "@/lib/workers/media/article-fetcher";
import { logger } from "@/lib/logger";

/**
 * POST /api/media/fetch
 * Manually trigger article fetch for a rule
 * 
 * Body:
 * - ruleId: string (required)
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
    const { ruleId } = body;

    if (!ruleId) {
      return NextResponse.json(
        { error: "ruleId is required" },
        { status: 400 }
      );
    }

    logger.info("Manual fetch triggered", {
      ruleId,
      userId: user.id,
    });

    // Fetch articles
    const result = await fetchArticlesForSpecificRule(ruleId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch articles" },
        { status: 500 }
      );
    }

    logger.info("Manual fetch completed", {
      ruleId,
      articlesCollected: result.articlesCollected,
    });

    return NextResponse.json({
      success: true,
      articlesCollected: result.articlesCollected,
      message: result.articlesCollected === 0
        ? "No new articles found"
        : `Successfully collected ${result.articlesCollected} article${result.articlesCollected !== 1 ? "s" : ""}`,
    });
  } catch (error) {
    logger.error("Error in manual fetch", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

