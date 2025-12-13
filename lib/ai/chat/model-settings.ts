/**
 * Chat Model Settings
 * Production-ready configuration for OpenAI models via Vercel AI SDK 5.x
 *
 * Best practices:
 * - Use stable model versions for production reliability
 * - Adjust parameters based on request complexity
 * - Keep token limits reasonable for cost control
 */

export type ChatModelSettings = {
  /** OpenAI model identifier */
  modelId: string;
  /** Maximum tokens for response */
  maxOutputTokens: number;
  /** Maximum tool call steps (prevents infinite loops) */
  stepLimit: number;
  /** Temperature for response creativity (0-2, lower = more focused) */
  temperature: number;
};

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
 * Check if user is requesting a formal report/briefing
 */
function looksLikeReportRequest(text: string): boolean {
  const t = normalize(text);
  const reportKeywords = [
    "report",
    "briefing",
    "note",
    "synthese",
    "compte rendu",
    "bulletin",
    "executive summary",
    "rapport",
  ];
  return reportKeywords.some((kw) => t.includes(kw));
}

/**
 * Check if user needs deeper analysis/investigation
 */
function looksLikeDeepInvestigation(text: string): boolean {
  const t = normalize(text);
  const analysisKeywords = [
    "why",
    "pourquoi",
    "root cause",
    "analyse",
    "hypothese",
    "scenario",
    "explain",
    "expliquer",
    "deep dive",
    "investigation",
  ];
  return analysisKeywords.some((kw) => t.includes(kw));
}

/**
 * Get optimized model settings based on request type
 *
 * Strategy:
 * - Quick questions: Fast model, low tokens, minimal steps
 * - Reports/briefings: Full model, high tokens, more steps
 * - Deep analysis: Balanced approach with lower temperature
 */
export function getChatModelSettings(userText: string): ChatModelSettings {
  const wantsReport = looksLikeReportRequest(userText);
  const wantsDeep = looksLikeDeepInvestigation(userText);

  // Production model - stable and reliable
  const modelId = "gpt-4o";

  // Base configuration optimized for interactive monitoring
  let maxOutputTokens = 1600;
  let stepLimit = 5;
  let temperature = 0.3; // Lower = more consistent, factual responses

  if (wantsReport) {
    // Formal reports need more tokens and steps
    maxOutputTokens = 3000;
    stepLimit = 8;
    temperature = 0.2; // Very consistent for official documents
  } else if (wantsDeep) {
    // Deep analysis: balanced
    maxOutputTokens = 2200;
    stepLimit = 6;
    temperature = 0.25;
  }

  return {
    modelId,
    maxOutputTokens,
    stepLimit,
    temperature,
  };
}
