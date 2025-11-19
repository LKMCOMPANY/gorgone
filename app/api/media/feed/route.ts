/**
 * Media Feed API Route
 * 
 * GET /api/media/feed - Fetch articles for a zone with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { getArticlesByZone, getArticlesCountByZone } from "@/lib/data/media";
import { logger } from "@/lib/logger";

/**
 * GET /api/media/feed
 * Fetch articles with pagination and filters
 * 
 * Query params:
 * - zoneId: string (required)
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - lang: comma-separated language codes (e.g., "eng,fra")
 * - sourceUri: comma-separated source URIs (e.g., "bbc.com,cnn.com")
 * - minSentiment: number (-1 to 1)
 * - maxSentiment: number (-1 to 1)
 * - search: text search query
 * - sortBy: "published_at" | "social_score" | "sentiment"
 * - sortAsc: "true" | "false"
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const zoneId = searchParams.get("zoneId");

    if (!zoneId) {
      return NextResponse.json(
        { error: "zoneId is required" },
        { status: 400 }
      );
    }

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50"),
      100
    );
    const offset = (page - 1) * limit;

    // Date filters
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    // Language filter
    const lang = searchParams.get("lang")
      ? searchParams.get("lang")!.split(",")
      : undefined;

    // Source filter
    const sourceUri = searchParams.get("sourceUri")
      ? searchParams.get("sourceUri")!.split(",")
      : undefined;

    // Sentiment filters
    const minSentiment = searchParams.get("minSentiment")
      ? parseFloat(searchParams.get("minSentiment")!)
      : undefined;
    const maxSentiment = searchParams.get("maxSentiment")
      ? parseFloat(searchParams.get("maxSentiment")!)
      : undefined;

    // Search
    const searchText = searchParams.get("search") || undefined;

    // Sorting
    const sortBy = (searchParams.get("sortBy") || "published_at") as 
      "published_at" | "social_score" | "sentiment";
    const sortAsc = searchParams.get("sortAsc") === "true";

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { error: "startDate must be before endDate" },
        { status: 400 }
      );
    }

    // Validate sentiment range
    if (
      (minSentiment !== undefined && (minSentiment < -1 || minSentiment > 1)) ||
      (maxSentiment !== undefined && (maxSentiment < -1 || maxSentiment > 1))
    ) {
      return NextResponse.json(
        { error: "Sentiment values must be between -1 and 1" },
        { status: 400 }
      );
    }

    // Fetch articles
    const articles = await getArticlesByZone(zoneId, {
      limit,
      offset,
      startDate,
      endDate,
      lang,
      sourceUri,
      minSentiment,
      maxSentiment,
      searchText,
      sortBy,
      sortAsc,
    });

    // Get total count for pagination
    const totalCount = await getArticlesCountByZone(zoneId, {
      startDate,
      endDate,
      lang,
      sourceUri,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    logger.error("Error fetching media feed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

