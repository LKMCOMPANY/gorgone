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
  | "create_visualization";

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

function includesAny(t: string, needles: string[]): boolean {
  return needles.some((n) => t.includes(n));
}

/**
 * Restrict the tool universe (GPT‑5.2 best practice):
 * - smaller allowed set => more predictable + cheaper + less drift.
 * - also prevents calling tools for disabled data sources.
 */
export function selectActiveTools(args: {
  userText: string;
  dataSources: DataSources;
}): ToolName[] {
  const t = normalize(args.userText);

  // Always allow a minimal baseline for monitoring.
  const tools = new Set<ToolName>([
    "get_zone_overview",
    "search_content",
    "detect_anomalies",
  ]);

  // Trends/top content.
  if (
    includesAny(t, ["trend", "trending", "tendance", "overview", "quoi", "what"])
  ) {
    tools.add("get_trending_topics");
    tools.add("get_top_content");
    tools.add("get_top_accounts");
  }

  // Sentiment / SOV.
  if (includesAny(t, ["sentiment", "mood", "ton", "opinion", "sov", "share"])) {
    tools.add("analyze_sentiment");
    tools.add("get_share_of_voice");
  }

  // Opinion map.
  if (includesAny(t, ["opinion map", "cluster", "clustering", "polarisation", "polarisation"])) {
    tools.add("get_opinion_map_summary");
  }

  // Opinion report (full analysis with examples).
  if (includesAny(t, ["rapport d'opinion", "opinion report", "analyse des opinions", "cartographie", "narratives", "carto"])) {
    tools.add("generate_opinion_report");
    tools.add("create_visualization");
  }

  // Account deep-dive / comparison.
  if (includesAny(t, ["@", "account", "profile", "compte"])) {
    tools.add("analyze_account");
  }
  if (includesAny(t, ["compare", "versus", "vs", "compar"])) {
    tools.add("compare_accounts");
  }

  // Report/briefing.
  if (includesAny(t, ["report", "briefing", "note", "synthese", "synthèse"])) {
    tools.add("generate_report");
  }

  // Visualization (only when user asks explicitly for chart/graph/visualize).
  if (includesAny(t, ["chart", "graph", "plot", "visual", "courbe", "graphe"])) {
    tools.add("create_visualization");
  }

  // Platform gating
  if (!args.dataSources.twitter) {
    tools.delete("get_trending_topics");
    tools.delete("get_top_content");
    tools.delete("get_top_accounts");
    tools.delete("get_opinion_map_summary");
    tools.delete("generate_opinion_report");
    tools.delete("get_share_of_voice");
    tools.delete("analyze_account");
    tools.delete("detect_anomalies");
    tools.delete("analyze_sentiment");
  }

  if (!args.dataSources.media) {
    tools.delete("get_media_coverage");
  } else if (includesAny(t, ["media", "press", "article", "coverage"])) {
    tools.add("get_media_coverage");
  }

  if (!args.dataSources.tiktok) {
    // No TikTok-specific tools today, but keep structure for future.
  }

  // Hard cap to keep calls predictable.
  const orderedUniverse = [
    "get_zone_overview",
    "get_trending_topics",
    "get_top_content",
    "get_top_accounts",
    "analyze_sentiment",
    "detect_anomalies",
    "get_opinion_map_summary",
    "generate_opinion_report",
    "search_content",
    "analyze_account",
    "compare_accounts",
    "get_share_of_voice",
    "get_media_coverage",
    "create_visualization",
    "generate_report",
  ] as const satisfies readonly ToolName[];

  const ordered = orderedUniverse.filter((name): name is ToolName => tools.has(name));

  return ordered.slice(0, 6);
}


