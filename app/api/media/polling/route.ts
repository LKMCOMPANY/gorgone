/**
 * Media Polling Worker
 * Vercel Cron endpoint to fetch articles from Event Registry API
 * Called every 3 hours (articles update less frequently than social media)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { fetchArticlesForDueRules } from "@/lib/workers/media/article-fetcher";

/**
 * GET /api/media/polling
 * Poll Event Registry API for new articles based on active rules
 */
export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // SECURITY: Verify request is from Vercel Cron
    // =====================================================
    
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      logger.warn("[Media Polling] Unauthorized: Invalid or missing cron secret");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.info("[Media Polling] Worker started");

    // Fetch articles for all rules that are due
    const result = await fetchArticlesForDueRules();

    if (result.rulesProcessed === 0) {
      logger.info("[Media Polling] No rules due for fetch");
      return NextResponse.json({
        success: true,
        message: "No rules to fetch",
        rulesProcessed: 0,
        articlesCollected: 0,
      });
    }

    logger.info("[Media Polling] Completed", {
      rulesProcessed: result.rulesProcessed,
      articlesCollected: result.articlesCollected,
      errors: result.errors,
    });

    return NextResponse.json({
      success: result.success,
      rulesProcessed: result.rulesProcessed,
      articlesCollected: result.articlesCollected,
      errors: result.errors,
    });

  } catch (error) {
    logger.error("[Media Polling] Worker failed", { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Polling failed",
      },
      { status: 500 }
    );
  }
}

