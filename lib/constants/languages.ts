/**
 * Centralized language definitions for Gorgone
 * 
 * Used by:
 * - Zone settings (language configuration)
 * - Chat AI (response language)
 * - Opinion Map labeling (cluster labels/descriptions)
 * - UI components (static labels translation)
 */

/**
 * Supported languages with ISO 639-1 codes
 */
export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "pt", "de", "it", "ar"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Language metadata for UI display
 */
export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string; // Emoji flag
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
];

/**
 * Language names for AI prompts (English names for clarity)
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  it: "Italian",
  ar: "Arabic",
};

/**
 * Default language for new zones
 */
export const DEFAULT_ZONE_LANGUAGE: SupportedLanguage = "en";

/**
 * Check if a string is a valid supported language
 */
export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === "string" && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Get language name for display (for supported languages)
 */
export function getLanguageName(code: SupportedLanguage): string {
  return LANGUAGE_NAMES[code] ?? "English";
}

/**
 * Full ISO 639-1 language code to name mapping
 * For displaying language names from tweet/video data
 */
const ISO_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  it: "Italian",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  hi: "Hindi",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  el: "Greek",
  he: "Hebrew",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  uk: "Ukrainian",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
  bg: "Bulgarian",
  hr: "Croatian",
  sk: "Slovak",
  lt: "Lithuanian",
  lv: "Latvian",
  et: "Estonian",
  sl: "Slovenian",
  ca: "Catalan",
  eu: "Basque",
  gl: "Galician",
  fa: "Persian",
  ur: "Urdu",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  sw: "Swahili",
  am: "Amharic",
  und: "Undetermined",
  // Twitter-specific codes
  in: "Indonesian", // Twitter uses 'in' instead of 'id'
  iw: "Hebrew",     // Twitter uses 'iw' instead of 'he'
  tl: "Tagalog",
  ht: "Haitian Creole",
  cy: "Welsh",
  sr: "Serbian",
  // Add more as needed
};

/**
 * Get language display name from any ISO 639-1 code
 * Used for displaying language filters in the UI
 */
export function getISOLanguageName(code: string): string {
  return ISO_LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

/**
 * Get language option by code
 */
export function getLanguageOption(code: SupportedLanguage): LanguageOption | undefined {
  return LANGUAGE_OPTIONS.find((opt) => opt.code === code);
}

// ============================================================================
// UI TRANSLATIONS
// ============================================================================

/**
 * Static UI labels for Opinion Report component
 * Used to translate hardcoded English labels
 */
export const OPINION_REPORT_LABELS: Record<SupportedLanguage, {
  title: string;
  tweetsAnalyzed: string;
  clusters: string;
  period: string;
  representativeTweets: string;
  positive: string;
  neutral: string;
  negative: string;
  sentimentEvolution: string;
}> = {
  en: {
    title: "Opinion Report",
    tweetsAnalyzed: "Tweets Analyzed",
    clusters: "Clusters",
    period: "Period",
    representativeTweets: "Representative Tweets",
    positive: "positive",
    neutral: "neutral",
    negative: "negative",
    sentimentEvolution: "Sentiment Evolution Over Time",
  },
  fr: {
    title: "Rapport d'Opinion",
    tweetsAnalyzed: "Tweets Analysés",
    clusters: "Clusters",
    period: "Période",
    representativeTweets: "Tweets Représentatifs",
    positive: "positif",
    neutral: "neutre",
    negative: "négatif",
    sentimentEvolution: "Évolution du Sentiment",
  },
  es: {
    title: "Informe de Opinión",
    tweetsAnalyzed: "Tweets Analizados",
    clusters: "Clusters",
    period: "Período",
    representativeTweets: "Tweets Representativos",
    positive: "positivo",
    neutral: "neutro",
    negative: "negativo",
    sentimentEvolution: "Evolución del Sentimiento",
  },
  pt: {
    title: "Relatório de Opinião",
    tweetsAnalyzed: "Tweets Analisados",
    clusters: "Clusters",
    period: "Período",
    representativeTweets: "Tweets Representativos",
    positive: "positivo",
    neutral: "neutro",
    negative: "negativo",
    sentimentEvolution: "Evolução do Sentimento",
  },
  de: {
    title: "Meinungsbericht",
    tweetsAnalyzed: "Analysierte Tweets",
    clusters: "Cluster",
    period: "Zeitraum",
    representativeTweets: "Repräsentative Tweets",
    positive: "positiv",
    neutral: "neutral",
    negative: "negativ",
    sentimentEvolution: "Sentiment-Entwicklung",
  },
  it: {
    title: "Rapporto di Opinione",
    tweetsAnalyzed: "Tweet Analizzati",
    clusters: "Cluster",
    period: "Periodo",
    representativeTweets: "Tweet Rappresentativi",
    positive: "positivo",
    neutral: "neutro",
    negative: "negativo",
    sentimentEvolution: "Evoluzione del Sentiment",
  },
  ar: {
    title: "تقرير الآراء",
    tweetsAnalyzed: "التغريدات المحللة",
    clusters: "المجموعات",
    period: "الفترة",
    representativeTweets: "التغريدات التمثيلية",
    positive: "إيجابي",
    neutral: "محايد",
    negative: "سلبي",
    sentimentEvolution: "تطور المشاعر",
  },
};

/**
 * Get translated labels for opinion report
 */
export function getOpinionReportLabels(language: SupportedLanguage) {
  return OPINION_REPORT_LABELS[language] ?? OPINION_REPORT_LABELS.en;
}
