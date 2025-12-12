export type ResponseLanguage = "fr" | "en";

function normalize(s: string): string {
  return s.toLowerCase();
}

/**
 * Lightweight language heuristic (no external dependency).
 * We only need FR vs EN to keep briefings consistent.
 */
export function detectResponseLanguage(userText: string): ResponseLanguage {
  const t = normalize(userText || "");

  // Strong French signals (common words + diacritics).
  const frenchSignals = [
    "oui",
    "non",
    "merci",
    "stp",
    "svp",
    " analyse ",
    " tendances",
    " synthèse",
    " synthese",
    " briefing",
    " rapport",
    " risques",
    " sources",
    " que ",
    " quoi",
    " pourquoi",
    " comment",
    " est-ce",
    " selon",
    " derniers",
    " dernières",
    " zone",
  ];

  const hasDiacritics = /[àâäçéèêëîïôöùûüÿœæ]/i.test(userText);
  const hasFrenchWords = frenchSignals.some((w) => t.includes(w.trim()));

  if (hasDiacritics || hasFrenchWords) return "fr";
  return "en";
}

type ChatMessageLike = { role?: unknown; content?: unknown };

/**
 * Detect response language from the full conversation.
 * Best practice: for short/ambiguous replies ("ok", "yes", "oui"), fall back to prior user turns.
 */
export function detectResponseLanguageFromMessages(
  messages: unknown
): ResponseLanguage {
  if (!Array.isArray(messages)) return "en";

  // Look at recent user turns, from latest to oldest.
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as ChatMessageLike;
    if (m?.role !== "user") continue;
    const text = typeof m?.content === "string" ? m.content : "";
    if (!text) continue;

    // If it's very short, keep searching earlier context.
    const normalized = text.trim().toLowerCase();
    const isShort = normalized.length <= 6; // e.g. "oui", "ok", "yes"
    const lang = detectResponseLanguage(text);
    if (!isShort) return lang;

    // If short but clearly French (e.g. "oui"), return immediately.
    if (lang === "fr") return "fr";
  }

  return "en";
}


