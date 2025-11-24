/**
 * API Route: Language & Location Filter Options
 * Returns available languages and locations for a zone and source
 */

import { NextRequest, NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/data/filters/language-location";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/filters/language-location
 * Query params:
 *  - zoneId: UUID of the zone
 *  - source: twitter | tiktok | media
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId");
    const source = searchParams.get("source");

    // Validation
    if (!zoneId) {
      return NextResponse.json(
        { error: "Missing required parameter: zoneId" },
        { status: 400 }
      );
    }

    if (!source || !["twitter", "tiktok", "media"].includes(source)) {
      return NextResponse.json(
        { error: "Invalid source. Must be twitter, tiktok, or media" },
        { status: 400 }
      );
    }

    // Fetch filter options
    const options = await getFilterOptions(
      zoneId,
      source as "twitter" | "tiktok" | "media"
    );

    return NextResponse.json(options, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    logger.error("Error in language-location filter API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

