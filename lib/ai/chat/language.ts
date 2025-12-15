/**
 * Language Detection and Configuration for Chat AI
 * 
 * Priority for response language:
 * 1. Zone configured language (settings.language)
 * 2. Detected language from user messages (heuristics)
 * 3. Default to English
 */

import {
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  DEFAULT_ZONE_LANGUAGE,
} from "@/lib/constants/languages";
import type { Zone } from "@/types";

// Re-export for backward compatibility
export type { SupportedLanguage };

// Legacy alias - keeping for backward compatibility with existing code
export type ResponseLanguage = SupportedLanguage;

/**
 * Extract the configured language from a zone's settings
 * Falls back to default if not configured or invalid
 */
export function getZoneLanguage(zone: Zone | null | undefined): SupportedLanguage {
  if (!zone?.settings?.language) {
    return DEFAULT_ZONE_LANGUAGE;
  }
  
  const lang = zone.settings.language;
  return isSupportedLanguage(lang) ? lang : DEFAULT_ZONE_LANGUAGE;
}

function normalize(s: string): string {
  return s.toLowerCase();
}

/**
 * Language detection signals by language
 */
const LANGUAGE_SIGNALS: Record<SupportedLanguage, {
  words: string[];
  diacritics?: RegExp;
}> = {
  fr: {
    words: [
      "oui", "non", "merci", "stp", "svp", " analyse ", " tendances",
      " synthèse", " synthese", " briefing", " rapport", " risques",
      " sources", " que ", " quoi", " pourquoi", " comment", " est-ce",
      " selon", " derniers", " dernières", " zone", " avec", " pour",
      " dans", " cette", " celui", " celle", " nous", " vous",
    ],
    diacritics: /[àâäçéèêëîïôöùûüÿœæ]/i,
  },
  es: {
    words: [
      " que ", " qué ", " cómo ", " como ", " donde ", " dónde ",
      " cuando ", " cuándo ", " por qué ", " porque ", " ahora ",
      " informe ", " análisis ", " tendencias ", " resumen ",
      " para ", " sobre ", " según ", " zona ", " últimos ",
      " esta ", " esto ", " estos ", " estas ", " nosotros ",
      " ustedes ", " hola ", " gracias ", " sí ", " no ",
    ],
    diacritics: /[áéíóúüñ¿¡]/i,
  },
  pt: {
    words: [
      " que ", " como ", " onde ", " quando ", " por que ", " porque ",
      " agora ", " relatório ", " análise ", " tendências ", " resumo ",
      " para ", " sobre ", " segundo ", " zona ", " últimos ",
      " esta ", " isto ", " estes ", " estas ", " nós ", " vocês ",
      " olá ", " obrigado ", " obrigada ", " sim ", " não ",
    ],
    diacritics: /[áàâãéêíóôõúüç]/i,
  },
  de: {
    words: [
      " was ", " wie ", " wo ", " wann ", " warum ", " weil ",
      " bericht ", " analyse ", " trends ", " zusammenfassung ",
      " für ", " über ", " nach ", " zone ", " letzte ",
      " diese ", " dieser ", " dieses ", " wir ", " sie ",
      " hallo ", " danke ", " ja ", " nein ", " bitte ",
    ],
    diacritics: /[äöüß]/i,
  },
  it: {
    words: [
      " che ", " come ", " dove ", " quando ", " perché ", " perche ",
      " adesso ", " rapporto ", " analisi ", " tendenze ", " riepilogo ",
      " per ", " su ", " secondo ", " zona ", " ultimi ",
      " questa ", " questo ", " questi ", " queste ", " noi ", " voi ",
      " ciao ", " grazie ", " sì ", " no ", " prego ",
    ],
    diacritics: /[àèéìíòóùú]/i,
  },
  ar: {
    words: [
      "تحليل", "تقرير", "اتجاهات", "ملخص", "منطقة",
      "الآن", "من فضلك", "شكرا", "نعم", "لا",
    ],
    diacritics: /[\u0600-\u06FF]/,
  },
  en: {
    words: [
      " the ", " what ", " how ", " where ", " when ", " why ",
      " report ", " analysis ", " trends ", " summary ", " zone ",
      " please ", " thanks ", " yes ", " no ", " now ",
    ],
  },
};

/**
 * Detect language from text using word signals and diacritics
 */
export function detectLanguage(text: string): SupportedLanguage {
  const t = normalize(text || "");
  
  // Check each language for signals (except English, which is default)
  for (const lang of SUPPORTED_LANGUAGES.filter(l => l !== "en")) {
    const signals = LANGUAGE_SIGNALS[lang];
    
    // Check diacritics first (strong signal)
    if (signals.diacritics?.test(text)) {
      // Verify with at least one word signal to avoid false positives
      if (signals.words.some(w => t.includes(w.trim()))) {
        return lang;
      }
      // For strong diacritic patterns (like Arabic script), return immediately
      if (lang === "ar" && signals.diacritics.test(text)) {
        return lang;
      }
    }
    
    // Check word signals
    const wordMatches = signals.words.filter(w => t.includes(w.trim())).length;
    if (wordMatches >= 2) {
      return lang;
    }
  }
  
  return "en";
}

// Legacy alias for backward compatibility
export const detectResponseLanguage = detectLanguage;

type ChatMessageLike = { role?: unknown; content?: unknown };

/**
 * Detect response language from the full conversation.
 * Best practice: for short/ambiguous replies ("ok", "yes", "oui"), fall back to prior user turns.
 */
export function detectResponseLanguageFromMessages(
  messages: unknown
): SupportedLanguage {
  if (!Array.isArray(messages)) return "en";

  // Look at recent user turns, from latest to oldest.
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as ChatMessageLike;
    if (m?.role !== "user") continue;
    const text = typeof m?.content === "string" ? m.content : "";
    if (!text) continue;

    // If it's very short, keep searching earlier context.
    const normalized = text.trim().toLowerCase();
    const isShort = normalized.length <= 6; // e.g. "oui", "ok", "yes", "sí"
    const lang = detectLanguage(text);
    
    if (!isShort) return lang;

    // If short but clearly non-English, return immediately.
    if (lang !== "en") return lang;
  }

  return "en";
}

/**
 * Determine the effective language for chat responses
 * 
 * Priority:
 * 1. Zone configured language (if set)
 * 2. Detected language from messages
 * 3. Default to English
 */
export function getEffectiveLanguage(
  zone: Zone | null | undefined,
  messages: unknown
): SupportedLanguage {
  // If zone has a configured language, use it as the base
  const zoneLanguage = getZoneLanguage(zone);
  
  // If zone language is explicitly set (not default), prioritize it
  if (zone?.settings?.language && isSupportedLanguage(zone.settings.language)) {
    return zone.settings.language;
  }
  
  // Otherwise, detect from messages
  const detectedLanguage = detectResponseLanguageFromMessages(messages);
  
  // If we detected a non-English language, use it
  if (detectedLanguage !== "en") {
    return detectedLanguage;
  }
  
  // Fall back to zone language or English
  return zoneLanguage;
}
