import { getCurrentUser } from "@/lib/auth/utils";
import { getConversationsByZone, getConversationsByUser } from "@/lib/data/chat";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * GET /api/chat/conversations
 * Get conversations for the current user
 * 
 * Query params:
 * - zoneId: Optional. Filter by zone
 * - limit: Optional. Max number of conversations (default: 20)
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let conversations;
    if (zoneId) {
      conversations = await getConversationsByZone(zoneId, user.id, limit);
    } else {
      conversations = await getConversationsByUser(user.id, limit);
    }

    return Response.json({ conversations });
  } catch (error) {
    logger.error("[Conversations API] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

