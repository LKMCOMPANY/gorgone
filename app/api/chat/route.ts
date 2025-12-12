import { openai } from "@ai-sdk/openai";
import { streamText, stepCountIs } from "ai";
import { getCurrentUser } from "@/lib/auth/utils";
import { getZoneById } from "@/lib/data/zones";
import { buildSystemPrompt } from "@/lib/ai/chat/system-prompt";
import { getChatModelSettings } from "@/lib/ai/chat/model-settings";
import { selectActiveTools } from "@/lib/ai/chat/tool-selection";
import { detectResponseLanguageFromMessages } from "@/lib/ai/chat/language";
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
  // Visualization
  createVisualizationTool,
} from "@/lib/ai/tools";
import type { ToolContext } from "@/lib/ai/types";

// Use Node.js runtime for Supabase compatibility
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== "production";
    const debugLog = (...args: unknown[]) => {
      if (isDev) console.log(...args);
    };

    debugLog("[Chat API] Request received");
    const { messages, zoneId } = await request.json();
    debugLog("[Chat API] Zone ID:", zoneId);
    debugLog("[Chat API] Messages count:", messages.length);

    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      debugLog("[Chat API] No user found");
      return new Response("Unauthorized", { status: 401 });
    }
    debugLog("[Chat API] User authenticated");

    // Get zone details
    const zone = await getZoneById(zoneId);
    if (!zone) {
      debugLog("[Chat API] Zone not found:", zoneId);
      return new Response("Zone not found", { status: 404 });
    }
    debugLog("[Chat API] Zone found");

    // Verify user has access to this zone
    if (user.client_id !== zone.client_id) {
      debugLog("[Chat API] Access denied - client mismatch");
      return new Response("Forbidden", { status: 403 });
    }
    debugLog("[Chat API] Access granted");

    // Get zone data sources
    const dataSources = zone.data_sources as {
      twitter?: boolean;
      tiktok?: boolean;
      media?: boolean;
    };
    const activeSources = Object.entries(dataSources)
      .filter(([, enabled]) => enabled)
      .map(([source]) => source)
      .join(", ");

    const latestUserText: string =
      Array.isArray(messages) && messages.length > 0
        ? String(messages[messages.length - 1]?.content ?? "")
        : "";

    const responseLanguage = detectResponseLanguageFromMessages(messages);

    const systemPrompt = buildSystemPrompt({
      zoneName: zone.name,
      zoneId: zone.id,
      clientId: zone.client_id,
      activeSourcesLabel: activeSources || "None",
      userRole: user.role,
      responseLanguage,
    });

    // Prepare context for tools (passed via experimental_context)
    const toolContext: ToolContext = {
      zoneId: zone.id,
      dataSources: {
        twitter: dataSources.twitter ?? false,
        tiktok: dataSources.tiktok ?? false,
        media: dataSources.media ?? false,
      },
    };

    debugLog("[Chat API] Starting streamText with tools...");
    debugLog("[Chat API] Context:", toolContext);

    // All tools - SDK 5.x handles context via experimental_context
    const tools = {
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
      // Visualization
      create_visualization: createVisualizationTool,
    };

    const modelSettings = getChatModelSettings(latestUserText);

    const activeTools = selectActiveTools({
      userText: latestUserText,
      dataSources: toolContext.dataSources,
    });

    const result = streamText({
      model: openai(modelSettings.modelId),
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages,
      ],
      tools,
      // Allowed tools (smaller tool universe => more predictable + cheaper)
      activeTools,
      maxOutputTokens: modelSettings.maxOutputTokens,
      stopWhen: stepCountIs(modelSettings.stepLimit),
      // Pass context to tools via experimental_context (SDK 5.x)
      experimental_context: toolContext,
      providerOptions: modelSettings.providerOptions,
      onStepFinish: ({ finishReason, toolCalls }) => {
        debugLog("[Chat API] Step finished:", finishReason);
        if (toolCalls && toolCalls.length > 0) {
          debugLog("[Chat API] Tool calls:", toolCalls.map((t) => t.toolName));
        }
      },
    });

    debugLog("[Chat API] Streaming response with tools...");
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
