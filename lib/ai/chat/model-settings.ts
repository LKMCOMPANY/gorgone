export type ChatModelSettings = {
  modelId: string;
  maxOutputTokens: number;
  stepLimit: number;
  providerOptions: {
    openai: {
      reasoningEffort: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
      textVerbosity: "low" | "medium" | "high";
    };
  };
};

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

function looksLikeReportRequest(text: string): boolean {
  const t = normalize(text);
  return (
    t.includes("report") ||
    t.includes("briefing") ||
    t.includes("note") ||
    t.includes("synthese") ||
    t.includes("synthèse") ||
    t.includes("compte rendu") ||
    t.includes("bulletin")
  );
}

function looksLikeDeepInvestigation(text: string): boolean {
  const t = normalize(text);
  return (
    t.includes("why") ||
    t.includes("pourquoi") ||
    t.includes("root cause") ||
    t.includes("analyse") ||
    t.includes("hypothese") ||
    t.includes("hypothèse") ||
    t.includes("scenario") ||
    t.includes("scénario")
  );
}

/**
 * GPT-5.2 best practices:
 * - Pin reasoning effort explicitly (avoid hidden defaults).
 * - Pin verbosity explicitly for consistent latency/cost/UX.
 * - Avoid temperature/top_p unless reasoningEffort === "none".
 */
export function getChatModelSettings(userText: string): ChatModelSettings {
  const wantsReport = looksLikeReportRequest(userText);
  const wantsDeep = looksLikeDeepInvestigation(userText);

  // Default: fast, interactive monitoring UX.
  let reasoningEffort: ChatModelSettings["providerOptions"]["openai"]["reasoningEffort"] =
    "none";
  let textVerbosity: ChatModelSettings["providerOptions"]["openai"]["textVerbosity"] =
    "medium";

  // Escalate when user asks for a formal report or deep investigation.
  if (wantsReport) {
    reasoningEffort = "medium";
    textVerbosity = "high";
  } else if (wantsDeep) {
    reasoningEffort = "low";
    textVerbosity = "medium";
  }

  return {
    modelId: "gpt-5.2",
    maxOutputTokens: wantsReport ? 2800 : 1600,
    stepLimit: wantsReport ? 6 : 5,
    providerOptions: {
      openai: {
        reasoningEffort,
        textVerbosity,
      },
    },
  };
}



