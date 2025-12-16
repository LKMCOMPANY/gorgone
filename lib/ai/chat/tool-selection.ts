/**
 * Dynamic tool selection for AI chat
 * 
 * Philosophy: Let the model decide which tools to use, but:
 * 1. Gate tools based on available data sources
 * 2. Prioritize relevant tools based on query intent (for better model guidance)
 * 3. No hard caps - the model should manage its own tool usage
 */

export type DataSources = {
  twitter: boolean;
  tiktok: boolean;
  media: boolean;
};

export type ToolName =
  | "get_zone_overview"
  | "get_top_content"
  | "get_top_accounts"
  | "get_trending_topics"
  | "search_content"
  | "analyze_sentiment"
  | "get_share_of_voice"
  | "get_opinion_map_summary"
  | "analyze_account"
  | "detect_anomalies"
  | "get_media_coverage"
  | "compare_accounts"
  | "generate_report"
  | "generate_opinion_report"
  | "create_visualization"
  | "web_search";

// Tool metadata for intelligent selection
interface ToolMetadata {
  name: ToolName;
  /** Data sources this tool requires */
  requires: ("twitter" | "tiktok" | "media")[];
  /** Keywords that suggest this tool (for prioritization, not gating) */
  keywords: string[];
  /** Tool priority (1 = highest, always include if source available) */
  priority: 1 | 2 | 3;
}

const TOOL_REGISTRY: ToolMetadata[] = [
  // Priority 1: Core tools - always available
  {
    name: "get_zone_overview",
    requires: [], // Works with any source
    keywords: ["overview", "aperçu", "résumé", "summary", "situation", "état", "quoi de neuf", "what's new"],
    priority: 1,
  },
  {
    name: "search_content",
    requires: [], // Works with any source
    keywords: ["search", "cherche", "find", "trouve", "mention", "about", "sur", "concernant"],
    priority: 1,
  },
  
  // Priority 2: Analysis tools - require specific sources
  {
    name: "get_trending_topics",
    requires: ["twitter"],
    keywords: ["trend", "tendance", "hashtag", "viral", "buzz", "populaire"],
    priority: 2,
  },
  {
    name: "get_top_content",
    requires: ["twitter"],
    keywords: ["top", "best", "meilleur", "populaire", "engagement", "viral", "performing"],
    priority: 2,
  },
  {
    name: "get_top_accounts",
    requires: ["twitter"],
    keywords: ["account", "compte", "influencer", "influenceur", "profil", "user", "utilisateur", "who"],
    priority: 2,
  },
  {
    name: "analyze_sentiment",
    requires: ["twitter"],
    keywords: ["sentiment", "mood", "ton", "feeling", "perception", "positif", "négatif"],
    priority: 2,
  },
  {
    name: "detect_anomalies",
    requires: ["twitter"],
    keywords: ["anomaly", "anomalie", "spike", "pic", "unusual", "inhabituel", "alerte", "alert"],
    priority: 2,
  },
  {
    name: "get_media_coverage",
    requires: ["media"],
    keywords: ["media", "press", "presse", "article", "news", "coverage", "couverture", "journal"],
    priority: 2,
  },
  
  // Priority 3: Advanced/specialized tools
  {
    name: "get_share_of_voice",
    requires: ["twitter"],
    keywords: ["share of voice", "sov", "part de voix", "répartition", "distribution"],
    priority: 3,
  },
  {
    name: "get_opinion_map_summary",
    requires: ["twitter"],
    keywords: ["opinion", "cluster", "polarisation", "groupes", "narratives"],
    priority: 3,
  },
  {
    name: "generate_opinion_report",
    requires: ["twitter"],
    keywords: ["opinion report", "rapport opinion", "analyse opinion", "cartographie", "carto", "map"],
    priority: 3,
  },
  {
    name: "analyze_account",
    requires: ["twitter"],
    keywords: ["@", "profile", "profil", "account", "compte", "analyze", "analyse", "deep dive"],
    priority: 3,
  },
  {
    name: "compare_accounts",
    requires: ["twitter"],
    keywords: ["compare", "versus", "vs", "comparison", "comparaison", "différence"],
    priority: 3,
  },
  {
    name: "create_visualization",
    requires: [], // Can work with any data
    keywords: ["chart", "graph", "graphe", "courbe", "visualization", "visual", "plot"],
    priority: 3,
  },
  {
    name: "generate_report",
    requires: [], // Aggregates from available sources
    keywords: ["report", "rapport", "briefing", "note", "synthèse", "synthesis", "executive"],
    priority: 3,
  },
  {
    name: "web_search",
    requires: [], // No data source required
    keywords: ["search web", "google", "news", "actualité", "context", "background", "who is", "what is", "external", "latest"],
    priority: 3,
  },
];

/**
 * Normalize text for keyword matching
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim();
}

/**
 * Check if text contains any of the keywords
 */
function matchesKeywords(text: string, keywords: string[]): boolean {
  const normalizedText = normalize(text);
  return keywords.some((k) => normalizedText.includes(normalize(k)));
}

/**
 * Select active tools based on:
 * 1. Available data sources (hard filter)
 * 2. Query intent (soft prioritization)
 * 
 * Returns ALL relevant tools - let the model decide which to actually use.
 */
export function selectActiveTools(args: {
  userText: string;
  dataSources: DataSources;
}): ToolName[] {
  const { userText, dataSources } = args;

  // Filter tools based on data source availability
  const availableTools = TOOL_REGISTRY.filter((tool) => {
    // If tool requires specific sources, check if at least one is available
    if (tool.requires.length === 0) return true;
    return tool.requires.some((source) => dataSources[source]);
  });

  // Score and sort tools by relevance to the query
  const scoredTools = availableTools.map((tool) => {
    let score = 0;
    
    // Base score by priority
    score += (4 - tool.priority) * 10; // Priority 1 = 30, 2 = 20, 3 = 10
    
    // Bonus for keyword match
    if (matchesKeywords(userText, tool.keywords)) {
      score += 50;
    }
    
    return { tool, score };
  });

  // Sort by score (highest first) and extract tool names
  scoredTools.sort((a, b) => b.score - a.score);
  
  return scoredTools.map(({ tool }) => tool.name);
}

/**
 * Get tools that are specifically relevant to the user's query
 * Useful for determining if a tool should be emphasized in the prompt
 */
export function getRelevantTools(args: {
  userText: string;
  dataSources: DataSources;
}): ToolName[] {
  const { userText, dataSources } = args;

  return TOOL_REGISTRY
    .filter((tool) => {
      // Must have required data sources
      if (tool.requires.length > 0) {
        const hasRequiredSource = tool.requires.some((source) => dataSources[source]);
        if (!hasRequiredSource) return false;
      }
      
      // Must match query keywords
      return matchesKeywords(userText, tool.keywords);
    })
    .map((tool) => tool.name);
}

/**
 * Check if a specific tool is available given the data sources
 */
export function isToolAvailable(toolName: ToolName, dataSources: DataSources): boolean {
  const tool = TOOL_REGISTRY.find((t) => t.name === toolName);
  if (!tool) return false;
  
  if (tool.requires.length === 0) return true;
  return tool.requires.some((source) => dataSources[source]);
}
