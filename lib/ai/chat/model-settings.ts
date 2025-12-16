/**
 * Chat Model Settings
 * Production-ready configuration for OpenAI models via Vercel AI SDK 5.x
 *
 * Model Selection Strategy:
 * - gpt-4o: Default for most interactions (fast, capable, cost-effective)
 * - gpt-4.1: For complex analysis requiring better reasoning
 * - o3-mini: For deep reasoning tasks (when available)
 */

export type ReasoningEffort = "low" | "medium" | "high";

export type ChatModelSettings = {
  /** OpenAI model identifier */
  modelId: string;
  /** Maximum tokens for response */
  maxOutputTokens: number;
  /** Maximum tool call steps (prevents infinite loops) */
  stepLimit: number;
  /** Temperature for response creativity (0-2, lower = more focused) */
  temperature: number;
  /** Reasoning effort for o-series models */
  reasoningEffort?: ReasoningEffort;
  /** Whether this is a reasoning model */
  isReasoningModel: boolean;
};

/**
 * Model profiles with their characteristics
 */
interface ModelProfile {
  modelId: string;
  isReasoningModel: boolean;
  defaultTemp: number;
  maxTokens: { quick: number; standard: number; deep: number };
  stepLimits: { quick: number; standard: number; deep: number };
  reasoningEffort?: ReasoningEffort;
}

const MODEL_PROFILES: Record<string, ModelProfile> = {
  // Default production model - fast and capable
  "gpt-4o": {
    modelId: "gpt-4o",
    isReasoningModel: false,
    defaultTemp: 0.7, // Higher for richer, more detailed responses
    maxTokens: { quick: 4000, standard: 8000, deep: 16000 },
    stepLimits: { quick: 5, standard: 8, deep: 12 },
  },
  // Enhanced model for complex tasks
  "gpt-4.1": {
    modelId: "gpt-4.1",
    isReasoningModel: false,
    defaultTemp: 0.6,
    maxTokens: { quick: 5000, standard: 10000, deep: 16000 },
    stepLimits: { quick: 6, standard: 10, deep: 15 },
  },
  // Reasoning model for deep analysis (when needed)
  "o3-mini": {
    modelId: "o3-mini",
    isReasoningModel: true,
    defaultTemp: 1, // Reasoning models typically use temperature 1
    maxTokens: { quick: 8000, standard: 16000, deep: 24000 },
    stepLimits: { quick: 4, standard: 8, deep: 12 },
    reasoningEffort: "medium",
  },
};

type ModelKey = "gpt-4o" | "gpt-4.1" | "o3-mini";

/**
 * Request complexity levels
 */
type ComplexityLevel = "quick" | "standard" | "deep";

/**
 * Normalize text for keyword detection
 */
function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents
}

/**
 * Analyze request complexity based on content
 */
function analyzeComplexity(text: string): {
  level: ComplexityLevel;
  needsReasoning: boolean;
} {
  const t = normalize(text);

  // Deep analysis triggers
  const deepTriggers = [
    "why",
    "pourquoi",
    "root cause",
    "cause profonde",
    "explain",
    "expliquer",
    "hypothesis",
    "hypothese",
    "scenario",
    "strategic",
    "strategique",
    "comprehensive",
    "complet",
    "complete",
    "detailed analysis",
    "analyse detaillee",
    "in-depth",
    "approfondi",
    "full report",
    "rapport complet",
    "generate a complete",
    "genere un rapport",
  ];

  // Report triggers (standard+ complexity)
  const reportTriggers = [
    "report",
    "rapport",
    "briefing",
    "note",
    "synthese",
    "synthesis",
    "executive summary",
    "bulletin",
    "compte rendu",
    "overview",
    "resume",
    "parle de quoi",
    "quoi de neuf",
    "what's happening",
    "que se passe",
    "aujourd'hui",
    "activity",
    "activite",
    "situation",
    "point sur",
    "etat des lieux",
    "top tweets",
    "top content",
    "meilleurs tweets",
    "plus d'engagement",
    "most engagement",
    "show top",
    "affiche",
    "montre",
  ];

  // Quick response triggers
  const quickTriggers = [
    "quick",
    "rapide",
    "just",
    "simple",
    "how many",
    "combien",
    "what is",
    "c'est quoi",
    "qui est",
    "who is",
  ];

  // Reasoning-heavy requests
  const reasoningTriggers = [
    "analyze trends",
    "predict",
    "forecast",
    "correlation",
    "cause and effect",
    "impact analysis",
    "what if",
    "compare multiple",
    "complex",
    "multi-factor",
  ];

  const needsReasoning = reasoningTriggers.some((trigger) =>
    t.includes(trigger)
  );

  // Determine complexity level
  if (deepTriggers.some((trigger) => t.includes(trigger))) {
    return { level: "deep", needsReasoning };
  }

  if (reportTriggers.some((trigger) => t.includes(trigger))) {
    return { level: "standard", needsReasoning };
  }

  if (quickTriggers.some((trigger) => t.includes(trigger))) {
    return { level: "quick", needsReasoning: false };
  }

  // Default to standard
  return { level: "standard", needsReasoning };
}

/**
 * Select the appropriate model based on request characteristics
 */
function selectModel(
  complexity: ComplexityLevel,
  needsReasoning: boolean
): ModelKey {
  // For now, use gpt-4o for everything
  // Enable o3-mini when reasoning is critical and available
  if (needsReasoning && complexity === "deep") {
    // TODO: Enable when o3-mini is stable and cost-effective
    // return "o3-mini";
    return "gpt-4o";
  }

  // Use gpt-4.1 for deep non-reasoning tasks
  if (complexity === "deep") {
    return "gpt-4.1";
  }

  return "gpt-4o";
}

/**
 * Get optimized model settings based on request type
 *
 * Strategy:
 * - Quick questions: Fast responses, minimal tokens
 * - Standard requests: Balanced approach
 * - Deep analysis: More tokens, potentially reasoning model
 */
export function getChatModelSettings(userText: string): ChatModelSettings {
  const { level, needsReasoning } = analyzeComplexity(userText);
  const modelKey = selectModel(level, needsReasoning);
  const profile = MODEL_PROFILES[modelKey];

  // Temperature adjustment
  // Lower = more consistent/factual, higher = more creative
  let temperature = profile.defaultTemp;
  if (level === "quick") {
    temperature = Math.max(0.1, profile.defaultTemp - 0.1);
  } else if (level === "deep") {
    temperature = profile.isReasoningModel ? 1 : profile.defaultTemp;
  }

  const settings: ChatModelSettings = {
    modelId: profile.modelId,
    maxOutputTokens: profile.maxTokens[level],
    stepLimit: profile.stepLimits[level],
    temperature,
    isReasoningModel: profile.isReasoningModel,
  };

  // Add reasoning effort for reasoning models
  if (profile.isReasoningModel && "reasoningEffort" in profile) {
    settings.reasoningEffort =
      level === "deep" ? "high" : level === "quick" ? "low" : "medium";
  }

  return settings;
}

/**
 * Get model settings for a specific model (for testing/override)
 */
export function getModelSettingsForModel(
  modelKey: ModelKey,
  complexity: ComplexityLevel = "standard"
): ChatModelSettings {
  const profile = MODEL_PROFILES[modelKey];

  return {
    modelId: profile.modelId,
    maxOutputTokens: profile.maxTokens[complexity],
    stepLimit: profile.stepLimits[complexity],
    temperature: profile.defaultTemp,
    isReasoningModel: profile.isReasoningModel,
    ...(profile.isReasoningModel &&
      "reasoningEffort" in profile && {
        reasoningEffort: profile.reasoningEffort,
      }),
  };
}

/**
 * Calculate estimated cost for a request (for monitoring)
 * Prices are approximate and may change
 */
export function estimateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
  reasoningTokens = 0
): number {
  // Prices per 1M tokens (as of late 2024)
  const prices: Record<string, { input: number; output: number; reasoning?: number }> = {
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4.1": { input: 2, output: 8 },
    "o3-mini": { input: 1.1, output: 4.4, reasoning: 4.4 },
  };

  const price = prices[modelId] || prices["gpt-4o"];
  
  let cost = 0;
  cost += (promptTokens / 1_000_000) * price.input;
  cost += (completionTokens / 1_000_000) * price.output;
  if (price.reasoning && reasoningTokens > 0) {
    cost += (reasoningTokens / 1_000_000) * price.reasoning;
  }

  return cost;
}
