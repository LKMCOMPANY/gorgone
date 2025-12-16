/**
 * Data layer for chat conversations
 * Handles CRUD operations and persistence for AI chat sessions
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatConversation {
  id: string;
  zone_id: string;
  client_id: string;
  user_id: string;
  title: string | null;
  last_response_id: string | null;
  metadata: Record<string, unknown>;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls: unknown | null;
  tool_results: unknown | null;
  response_id: string | null;
  parts: unknown | null;
  reasoning_tokens: number | null;
  created_at: string;
}

export interface CreateConversationInput {
  zoneId: string;
  clientId: string;
  userId: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateMessageInput {
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: unknown;
  toolResults?: unknown;
  responseId?: string;
  parts?: unknown;
  reasoningTokens?: number;
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

/**
 * Create a new conversation
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<ChatConversation> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      zone_id: input.zoneId,
      client_id: input.clientId,
      user_id: input.userId,
      title: input.title || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    logger.error("[Chat] Failed to create conversation", { error, input });
    throw error;
  }

  logger.info("[Chat] Conversation created", { id: data.id });
  return data as ChatConversation;
}

/**
 * Get a conversation by ID
 */
export async function getConversationById(
  id: string
): Promise<ChatConversation | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    logger.error("[Chat] Failed to get conversation", { error, id });
    throw error;
  }

  return data as ChatConversation;
}

/**
 * Get conversations for a zone (most recent first)
 */
export async function getConversationsByZone(
  zoneId: string,
  userId: string,
  limit = 20
): Promise<ChatConversation[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("zone_id", zoneId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("[Chat] Failed to get conversations", { error, zoneId });
    throw error;
  }

  return (data as ChatConversation[]) || [];
}

/**
 * Get all conversations for a user across all zones
 */
export async function getConversationsByUser(
  userId: string,
  limit = 50
): Promise<ChatConversation[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("[Chat] Failed to get user conversations", { error, userId });
    throw error;
  }

  return (data as ChatConversation[]) || [];
}

/**
 * Update conversation metadata (title, last_response_id, etc.)
 */
export async function updateConversation(
  id: string,
  updates: {
    title?: string;
    last_response_id?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ChatConversation> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_conversations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("[Chat] Failed to update conversation", { error, id });
    throw error;
  }

  return data as ChatConversation;
}

/**
 * Delete a conversation (cascades to messages)
 */
export async function deleteConversation(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("[Chat] Failed to delete conversation", { error, id });
    throw error;
  }

  logger.info("[Chat] Conversation deleted", { id });
}

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * Add a message to a conversation
 */
export async function createMessage(
  input: CreateMessageInput
): Promise<ChatMessage> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      tool_calls: input.toolCalls || null,
      tool_results: input.toolResults || null,
      response_id: input.responseId || null,
      parts: input.parts || null,
      reasoning_tokens: input.reasoningTokens || null,
    })
    .select()
    .single();

  if (error) {
    logger.error("[Chat] Failed to create message", { error, input });
    throw error;
  }

  return data as ChatMessage;
}

/**
 * Get all messages for a conversation (chronological order)
 */
export async function getMessagesByConversation(
  conversationId: string
): Promise<ChatMessage[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("[Chat] Failed to get messages", { error, conversationId });
    throw error;
  }

  return (data as ChatMessage[]) || [];
}

/**
 * Get the last N messages for a conversation (for context window)
 */
export async function getRecentMessages(
  conversationId: string,
  limit = 20
): Promise<ChatMessage[]> {
  const supabase = createAdminClient();

  // Get last N messages, then reverse for chronological order
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("[Chat] Failed to get recent messages", {
      error,
      conversationId,
    });
    throw error;
  }

  // Reverse to get chronological order
  return ((data as ChatMessage[]) || []).reverse();
}

/**
 * Bulk insert messages (for restoring a conversation)
 */
export async function createMessages(
  messages: CreateMessageInput[]
): Promise<ChatMessage[]> {
  if (messages.length === 0) return [];

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_messages")
    .insert(
      messages.map((m) => ({
        conversation_id: m.conversationId,
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls || null,
        tool_results: m.toolResults || null,
        response_id: m.responseId || null,
        parts: m.parts || null,
        reasoning_tokens: m.reasoningTokens || null,
      }))
    )
    .select();

  if (error) {
    logger.error("[Chat] Failed to create messages", { error });
    throw error;
  }

  return (data as ChatMessage[]) || [];
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

export interface CreateUsageInput {
  conversationId?: string;
  messageId?: string;
  zoneId: string;
  clientId: string;
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens?: number;
  costUsd?: number;
  requestMetadata?: Record<string, unknown>;
}

/**
 * Track token usage for billing and analytics
 */
export async function trackUsage(input: CreateUsageInput): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("chat_usage").insert({
    conversation_id: input.conversationId || null,
    message_id: input.messageId || null,
    zone_id: input.zoneId,
    client_id: input.clientId,
    user_id: input.userId,
    model: input.model,
    prompt_tokens: input.promptTokens,
    completion_tokens: input.completionTokens,
    reasoning_tokens: input.reasoningTokens || 0,
    cost_usd: input.costUsd || null,
    request_metadata: input.requestMetadata || {},
  });

  if (error) {
    // Don't throw - usage tracking shouldn't break the chat
    logger.error("[Chat] Failed to track usage", { error, input });
  }
}

/**
 * Get usage statistics for a client (for billing dashboard)
 */
export async function getUsageByClient(
  clientId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  total_tokens: number;
  total_cost: number;
  request_count: number;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_usage")
    .select("prompt_tokens, completion_tokens, reasoning_tokens, cost_usd")
    .eq("client_id", clientId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (error) {
    logger.error("[Chat] Failed to get usage stats", { error, clientId });
    throw error;
  }

  type UsageRecord = {
    prompt_tokens: number | null;
    completion_tokens: number | null;
    reasoning_tokens: number | null;
    cost_usd: number | null;
  };
  
  const records: UsageRecord[] = data || [];
  return {
    total_tokens: records.reduce(
      (sum: number, r: UsageRecord) =>
        sum +
        (r.prompt_tokens || 0) +
        (r.completion_tokens || 0) +
        (r.reasoning_tokens || 0),
      0
    ),
    total_cost: records.reduce(
      (sum: number, r: UsageRecord) => sum + (r.cost_usd || 0),
      0
    ),
    request_count: records.length,
  };
}
