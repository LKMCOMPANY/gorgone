/**
 * Hook for managing chat conversation persistence
 * Handles loading/saving conversations and syncing with the API
 */

import { useState, useCallback, useEffect } from "react";
import type { ChatConversation, ChatMessage } from "@/lib/data/chat";

interface UseChatPersistenceOptions {
  zoneId: string;
  enabled?: boolean;
}

interface ConversationListItem {
  id: string;
  title: string | null;
  message_count: number;
  updated_at: string;
}

export function useChatPersistence({ zoneId, enabled = true }: UseChatPersistenceOptions) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch conversations for the current zone
   */
  const fetchConversations = useCallback(async () => {
    if (!enabled || !zoneId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/chat/conversations?zoneId=${zoneId}&limit=50`);
      if (!response.ok) throw new Error("Failed to fetch conversations");
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [zoneId, enabled]);

  /**
   * Load a specific conversation with its messages
   */
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!enabled) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`);
      if (!response.ok) throw new Error("Failed to load conversation");
      
      const data = await response.json();
      setCurrentConversationId(conversationId);
      return data as { conversation: ChatConversation; messages: ChatMessage[] };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  /**
   * Start a new conversation (clears current)
   */
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  /**
   * Update conversation ID from response header
   * Called after a chat API response to track the conversation
   */
  const handleConversationIdFromResponse = useCallback((response: Response) => {
    const conversationId = response.headers.get("X-Conversation-Id");
    if (conversationId && conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId);
      // Refresh conversation list to include new conversation
      fetchConversations();
    }
  }, [currentConversationId, fetchConversations]);

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete conversation");
      
      // Update local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // Clear current if deleted
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    }
  }, [currentConversationId]);

  /**
   * Rename a conversation
   */
  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) throw new Error("Failed to rename conversation");
      
      // Update local state
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, title } : c
      ));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    }
  }, []);

  // Load conversations on mount and when zone changes
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    // State
    conversations,
    currentConversationId,
    isLoading,
    error,
    
    // Actions
    fetchConversations,
    loadConversation,
    startNewConversation,
    handleConversationIdFromResponse,
    deleteConversation,
    renameConversation,
    setCurrentConversationId,
  };
}

