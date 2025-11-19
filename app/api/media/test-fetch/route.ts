/**
 * Media Test Fetch Route (DEBUG ONLY)
 * 
 * GET /api/media/test-fetch?ruleId=xxx
 * Manual test endpoint to debug article fetching
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { fetchArticlesForSpecificRule } from "@/lib/workers/media/article-fetcher";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const ruleId = searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json({ error: "ruleId required" }, { status: 400 });
    }

    console.log("🚀 TEST: Fetching articles for rule", ruleId);

    // Run the full worker
    const result = await fetchArticlesForSpecificRule(ruleId);

    console.log("✅ TEST: Complete", result);

    return NextResponse.json({
      success: result.success,
      articlesCollected: result.articlesCollected,
      error: result.error,
      message: result.success 
        ? `Successfully collected ${result.articlesCollected} articles`
        : `Failed: ${result.error}`,
    });
  } catch (error) {
    console.error("Test fetch error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

