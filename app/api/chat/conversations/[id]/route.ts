import { getCurrentUser } from "@/lib/auth/utils";
import {
  getConversationById,
  getMessagesByConversation,
  deleteConversation,
  updateConversation,
} from "@/lib/data/chat";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/chat/conversations/[id]
 * Get a conversation with its messages
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const conversation = await getConversationById(id);

    if (!conversation) {
      return new Response("Not found", { status: 404 });
    }

    // Verify ownership
    if (conversation.user_id !== user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const messages = await getMessagesByConversation(id);

    return Response.json({ conversation, messages });
  } catch (error) {
    logger.error("[Conversation API] GET Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * PATCH /api/chat/conversations/[id]
 * Update conversation (e.g., rename)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const conversation = await getConversationById(id);

    if (!conversation) {
      return new Response("Not found", { status: 404 });
    }

    if (conversation.user_id !== user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const body = await request.json();
    const updated = await updateConversation(id, {
      title: body.title,
    });

    return Response.json({ conversation: updated });
  } catch (error) {
    logger.error("[Conversation API] PATCH Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * DELETE /api/chat/conversations/[id]
 * Delete a conversation
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const conversation = await getConversationById(id);

    if (!conversation) {
      return new Response("Not found", { status: 404 });
    }

    if (conversation.user_id !== user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    await deleteConversation(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    logger.error("[Conversation API] DELETE Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

