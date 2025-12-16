import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { getCurrentUser } from "@/lib/auth/utils";
import { getZoneById } from "@/lib/data/zones";
import { buildSystemPrompt } from "@/lib/ai/chat/system-prompt";
import { getChatModelSettings } from "@/lib/ai/chat/model-settings";
import { selectActiveTools } from "@/lib/ai/chat/tool-selection";
import { getEffectiveLanguage } from "@/lib/ai/chat/language";
import {
  createConversation,
  getConversationById,
  createMessage,
  getRecentMessages,
  updateConversation,
  trackUsage,
} from "@/lib/data/chat";
import {
  // Sprint 1: Essentials
  getZoneOverviewTool,
  getTopContentTool,
  getTopAccountsTool,
  getTrendingTopicsTool,
  searchContentTool,
  // Sprint 2: Analysis
  analyzeSentimentTool,
  getShareOfVoiceTool,
  // Sprint 3: Advanced
  getOpinionMapSummaryTool,
  analyzeAccountTool,
  detectAnomaliesTool,
  // Sprint 4: Specialized
  getMediaCoverageTool,
  compareAccountsTool,
  generateReportTool,
  // Opinion Analysis
  generateOpinionReportTool,
  // Visualization
  createVisualizationTool,
} from "@/lib/ai/tools";
import type { ToolContext } from "@/lib/ai/types";
import { logger } from "@/lib/logger";

// Use Node.js runtime for Supabase compatibility
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Extract text content from a message (supports both legacy and UIMessage formats)
 */
function extractMessageText(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  
  const msg = message as Record<string, unknown>;
  
  // Legacy format: { role, content: string }
  if (typeof msg.content === "string") return msg.content;
  
  // UIMessage format: { parts: [{ type: "text", text: string }] }
  const parts = Array.isArray(msg.parts) ? msg.parts : [];
  return parts
    .filter((p: any) => p?.type === "text" && typeof p?.text === "string")
    .map((p: any) => p.text)
    .join("");
}

/**
 * Convert stored messages back to UIMessage format for the SDK
 */
function storedMessagesToUIMessages(storedMessages: Array<{
  role: string;
  content: string;
  parts: unknown;
}>): UIMessage[] {
  return storedMessages.map((m) => ({
    id: crypto.randomUUID(),
    role: m.role as UIMessage["role"],
    content: m.content,
    parts: (m.parts as UIMessage["parts"]) || [{ type: "text", text: m.content }],
  }));
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const isDev = process.env.NODE_ENV !== "production";
    const debugLog = (...args: unknown[]) => {
      if (isDev) logger.info("[Chat API]", ...args);
    };

    debugLog("Request received");
    const body = await request.json();
    
    // Extract parameters from request
    const zoneId: string | undefined =
      body?.zoneId ?? body?.body?.zoneId ?? body?.zone_id ?? undefined;
    const conversationId: string | undefined =
      body?.conversationId ?? body?.conversation_id ?? undefined;
    const rawMessages: unknown[] = body?.messages ?? body?.body?.messages ?? [];

    debugLog("Zone ID:", zoneId, "Conversation ID:", conversationId || "new");
    debugLog("Messages count:", Array.isArray(rawMessages) ? rawMessages.length : 0);

    // ========================================================================
    // AUTHENTICATION
    // ========================================================================
    const user = await getCurrentUser();
    if (!user) {
      debugLog("No user found");
      return new Response("Unauthorized", { status: 401 });
    }
    debugLog("User authenticated:", user.id);

    if (!zoneId) {
      debugLog("Missing zoneId");
      return new Response("Bad Request: missing zoneId", { status: 400 });
    }

    // ========================================================================
    // ZONE VALIDATION
    // ========================================================================
    const zone = await getZoneById(zoneId);
    if (!zone) {
      debugLog("Zone not found:", zoneId);
      return new Response("Zone not found", { status: 404 });
    }

    if (user.client_id !== zone.client_id) {
      debugLog("Access denied - client mismatch");
      return new Response("Forbidden", { status: 403 });
    }
    debugLog("Zone access granted:", zone.name);

    // ========================================================================
    // CONVERSATION PERSISTENCE
    // ========================================================================
    let activeConversationId = conversationId;
    let existingMessages: Array<{
      role: string;
      content: string;
      parts: unknown;
    }> = [];

    // If conversation ID provided, load existing messages
    if (conversationId) {
      const conversation = await getConversationById(conversationId);
      if (conversation) {
        // Verify user owns this conversation
        if (conversation.user_id !== user.id) {
          return new Response("Forbidden: not your conversation", { status: 403 });
        }
        
        // Load recent messages for context
        existingMessages = await getRecentMessages(conversationId, 50);
        debugLog("Loaded", existingMessages.length, "existing messages");
      } else {
        // Conversation not found, will create new one
        activeConversationId = undefined;
      }
    }

    // Create new conversation if needed
    if (!activeConversationId) {
      const latestUserText = extractMessageText(rawMessages[rawMessages.length - 1]);
      const newConversation = await createConversation({
        zoneId: zone.id,
        clientId: zone.client_id,
        userId: user.id,
        title: latestUserText.slice(0, 60) || "New conversation",
      });
      activeConversationId = newConversation.id;
      debugLog("Created new conversation:", activeConversationId);
    }

    // ========================================================================
    // MESSAGE PREPARATION
    // ========================================================================
    // Get the latest user message from the request
    const latestUserMessage = rawMessages[rawMessages.length - 1];
    const latestUserText = extractMessageText(latestUserMessage);

    // Save the user message to database
    if (latestUserText && activeConversationId) {
      await createMessage({
        conversationId: activeConversationId,
        role: "user",
        content: latestUserText,
        parts: (latestUserMessage as any)?.parts || [{ type: "text", text: latestUserText }],
      });
      debugLog("Saved user message");
    }

    // Build the complete message history
    // Combine stored messages with the incoming messages (avoiding duplicates)
    const storedUIMessages = storedMessagesToUIMessages(existingMessages);
    
    // The incoming rawMessages should only contain the new message(s)
    // If the frontend is sending the full history, we use that directly
    const allMessages = rawMessages.length > 1 
      ? rawMessages  // Frontend sent full history
      : [...storedUIMessages, ...rawMessages]; // Append new message to stored history

    // Convert to core messages format
    const coreMessages = (() => {
      try {
        return convertToCoreMessages(allMessages as UIMessage[]);
      } catch {
        return Array.isArray(allMessages) ? allMessages : [];
      }
    })();

    debugLog("Total messages for context:", coreMessages.length);

    // ========================================================================
    // SYSTEM PROMPT & MODEL CONFIGURATION
    // ========================================================================
    const dataSources = zone.data_sources as {
      twitter?: boolean;
      tiktok?: boolean;
      media?: boolean;
    };
    const activeSources = Object.entries(dataSources)
      .filter(([, enabled]) => enabled)
      .map(([source]) => source)
      .join(", ");

    const responseLanguage = getEffectiveLanguage(zone, rawMessages);

    const systemPrompt = buildSystemPrompt({
      zoneName: zone.name,
      zoneId: zone.id,
      clientId: zone.client_id,
      activeSourcesLabel: activeSources || "None",
      userRole: user.role,
      responseLanguage,
      operationalContext: zone.operational_context,
    });
    
    debugLog("Operational context:", zone.operational_context ? "Present" : "None");

    const toolContext: ToolContext = {
      zoneId: zone.id,
      dataSources: {
        twitter: dataSources.twitter ?? false,
        tiktok: dataSources.tiktok ?? false,
        media: dataSources.media ?? false,
      },
    };

    // ========================================================================
    // TOOLS CONFIGURATION
    // ========================================================================
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {
      // Sprint 1: Essentials
      get_zone_overview: getZoneOverviewTool,
      get_top_content: getTopContentTool,
      get_top_accounts: getTopAccountsTool,
      get_trending_topics: getTrendingTopicsTool,
      search_content: searchContentTool,
      // Sprint 2: Analysis
      analyze_sentiment: analyzeSentimentTool,
      get_share_of_voice: getShareOfVoiceTool,
      // Sprint 3: Advanced
      get_opinion_map_summary: getOpinionMapSummaryTool,
      analyze_account: analyzeAccountTool,
      detect_anomalies: detectAnomaliesTool,
      // Sprint 4: Specialized
      get_media_coverage: getMediaCoverageTool,
      compare_accounts: compareAccountsTool,
      generate_report: generateReportTool,
      // Opinion Analysis
      generate_opinion_report: generateOpinionReportTool,
      // Visualization
      create_visualization: createVisualizationTool,
    };

    const modelSettings = getChatModelSettings(latestUserText);
    const activeTools = selectActiveTools({
      userText: latestUserText,
      dataSources: toolContext.dataSources,
    });

    // ========================================================================
    // STREAMING RESPONSE
    // ========================================================================
    debugLog("Starting streamText with model:", modelSettings.modelId);

    // Track variables for usage and persistence
    let assistantContent = "";
    let assistantParts: unknown[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let reasoningTokens = 0;
    const toolsUsed: string[] = [];
    
    const result = streamText({
      model: openai(modelSettings.modelId),
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...(coreMessages as any),
      ],
      tools,
      activeTools,
      maxOutputTokens: modelSettings.maxOutputTokens,
      stopWhen: stepCountIs(modelSettings.stepLimit),
      experimental_context: toolContext,
      temperature: modelSettings.temperature,
      onChunk: ({ chunk }) => {
        // Accumulate text content
        if (chunk.type === "text-delta") {
          assistantContent += (chunk as { type: "text-delta"; text: string }).text;
        }
      },
      onStepFinish: ({ finishReason, toolCalls, usage }) => {
        debugLog("Step finished:", finishReason);
        if (toolCalls && toolCalls.length > 0) {
          const toolNames = toolCalls.map((t) => t.toolName);
          debugLog("Tool calls:", toolNames);
          toolsUsed.push(...toolNames);
          // Track tool calls as parts
          assistantParts.push(...toolCalls.map(tc => ({
            type: "tool-invocation",
            toolName: tc.toolName,
            args: (tc as unknown as { args: Record<string, unknown> }).args,
          })));
        }
        // Accumulate token usage (including reasoning tokens for o-series models)
        if (usage) {
          const usageObj = usage as unknown as { promptTokens?: number; completionTokens?: number };
          promptTokens += usageObj.promptTokens || 0;
          completionTokens += usageObj.completionTokens || 0;
          // Reasoning tokens are part of completion tokens in o-series models
          // They're tracked separately in the usage object when available
          const usageAny = usage as Record<string, unknown>;
          if (typeof usageAny.reasoningTokens === "number") {
            reasoningTokens += usageAny.reasoningTokens;
          }
        }
      },
      onFinish: async ({ response }) => {
        // Save assistant message to database
        if (activeConversationId && assistantContent) {
          try {
            const messageId = await createMessage({
              conversationId: activeConversationId,
              role: "assistant",
              content: assistantContent,
              parts: assistantParts.length > 0 
                ? [{ type: "text", text: assistantContent }, ...assistantParts]
                : [{ type: "text", text: assistantContent }],
              responseId: response?.id,
            });
            
            // Update conversation with last response ID
            await updateConversation(activeConversationId, {
              last_response_id: response?.id,
            });
            
            // Track usage
            await trackUsage({
              conversationId: activeConversationId,
              messageId: messageId.id,
              zoneId: zone.id,
              clientId: zone.client_id,
              userId: user.id,
              model: modelSettings.modelId,
              promptTokens,
              completionTokens,
              reasoningTokens: reasoningTokens > 0 ? reasoningTokens : undefined,
              requestMetadata: {
                tools_available: activeTools,
                tools_used: toolsUsed,
                response_time_ms: Date.now() - startTime,
                is_reasoning_model: modelSettings.isReasoningModel,
              },
            });
            
            debugLog("Saved assistant response, tokens:", promptTokens + completionTokens);
          } catch (error) {
            logger.error("[Chat API] Failed to save assistant message:", error);
            // Don't throw - the response has already been sent
          }
        }
      },
    });

    debugLog("Streaming response...");
    
    // Include conversation ID in response headers for client to track
    const response = result.toUIMessageStreamResponse();
    
    // Add conversation ID header
    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-Conversation-Id", activeConversationId || "");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
    
  } catch (error) {
    logger.error("[Chat API] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
