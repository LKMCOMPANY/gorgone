/**
 * Chat Conversations Data Layer
 * Handles CRUD operations for chat conversations
 */

import { createClient } from "@/lib/supabase/server";
import type { ChatConversation, ChatMessage } from "@/types";

/**
 * Get active conversation for a zone (or create new one)
 */
export async function getOrCreateConversation(
  zoneId: string,
  userId: string,
  clientId: string
): Promise<ChatConversation> {
  const supabase = await createClient();

  // Try to get most recent active conversation
  const { data: existing, error: fetchError } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("zone_id", zoneId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (existing && !fetchError) {
    return existing;
  }

  // Create new conversation
  const { data: newConversation, error: createError } = await supabase
    .from("chat_conversations")
    .insert({
      zone_id: zoneId,
      client_id: clientId,
      user_id: userId,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create conversation: ${createError.message}`);
  }

  return newConversation;
}

/**
 * Get conversation by ID
 */
export async function getConversationById(
  conversationId: string
): Promise<ChatConversation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get conversations for a zone
 */
export async function getConversationsByZone(
  zoneId: string,
  limit = 10
): Promise<ChatConversation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("zone_id", zoneId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  return data || [];
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a message
 */
export async function createMessage(
  conversationId: string,
  role: "user" | "assistant" | "system" | "tool",
  content: string,
  toolCalls?: Record<string, unknown>,
  toolResults?: Record<string, unknown>
): Promise<ChatMessage> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tool_calls: toolCalls,
      tool_results: toolResults,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create message: ${error.message}`);
  }

  return data;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_conversations")
    .update({ title })
    .eq("id", conversationId);

  if (error) {
    throw new Error(`Failed to update conversation title: ${error.message}`);
  }
}

/**
 * Delete conversation
 */
export async function deleteConversation(
  conversationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId);

  if (error) {
    throw new Error(`Failed to delete conversation: ${error.message}`);
  }
}

/**
 * Track token usage
 */
export async function trackUsage(
  conversationId: string,
  zoneId: string,
  clientId: string,
  userId: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): Promise<void> {
  const supabase = await createClient();

  // Calculate cost based on model
  let costUsd = 0;
  if (model.includes("gpt-4o-mini")) {
    // $0.15/1M input, $0.60/1M output
    costUsd = (promptTokens * 0.15 + completionTokens * 0.6) / 1_000_000;
  } else if (model.includes("gpt-4o")) {
    // $2.50/1M input, $10.00/1M output
    costUsd = (promptTokens * 2.5 + completionTokens * 10.0) / 1_000_000;
  }

  const { error } = await supabase.from("chat_usage").insert({
    conversation_id: conversationId,
    zone_id: zoneId,
    client_id: clientId,
    user_id: userId,
    model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    cost_usd: costUsd,
  });

  if (error) {
    console.error("Failed to track usage:", error);
  }
}

