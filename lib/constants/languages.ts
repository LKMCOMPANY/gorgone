/**
 * Language Code Mappings for Gorgone
 * 
 * Twitter & TikTok use ISO 639-1 (2-letter codes)
 * Media uses ISO 639-3 (3-letter codes)
 */

// ISO 639-1 to language name (for Twitter & TikTok)
export const ISO_639_1_LANGUAGES: Record<string, string> = {
  // Common languages
  ar: "Arabic",
  bn: "Bengali",
  ca: "Catalan",
  cs: "Czech",
  cy: "Welsh",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English",
  es: "Spanish",
  et: "Estonian",
  eu: "Basque",
  fa: "Persian",
  fi: "Finnish",
  fr: "French",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  ht: "Haitian Creole",
  hu: "Hungarian",
  id: "Indonesian",
  in: "Indonesian", // Alternative code
  is: "Icelandic",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  lt: "Lithuanian",
  lv: "Latvian",
  mr: "Marathi",
  ms: "Malay",
  nl: "Dutch",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sl: "Slovenian",
  sr: "Serbian",
  sv: "Swedish",
  sw: "Swahili",
  ta: "Tamil",
  te: "Telugu",
  th: "Thai",
  tl: "Tagalog",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  vi: "Vietnamese",
  zh: "Chinese",
  // Twitter-specific codes
  qam: "Amharic (Twitter)",
  qme: "Montenegrin (Twitter)",
  und: "Undetermined",
};

// ISO 639-3 to language name (for Media / Event Registry)
export const ISO_639_3_LANGUAGES: Record<string, string> = {
  // Common languages (3-letter codes)
  ara: "Arabic",
  ben: "Bengali",
  bul: "Bulgarian",
  cat: "Catalan",
  ces: "Czech",
  cym: "Welsh",
  dan: "Danish",
  deu: "German",
  ell: "Greek",
  eng: "English",
  est: "Estonian",
  eus: "Basque",
  fas: "Persian",
  fin: "Finnish",
  fra: "French",
  heb: "Hebrew",
  hin: "Hindi",
  hrv: "Croatian",
  hun: "Hungarian",
  hye: "Armenian",
  ind: "Indonesian",
  isl: "Icelandic",
  ita: "Italian",
  jpn: "Japanese",
  kat: "Georgian",
  kor: "Korean",
  lit: "Lithuanian",
  lav: "Latvian",
  mar: "Marathi",
  msa: "Malay",
  nld: "Dutch",
  nor: "Norwegian",
  pol: "Polish",
  por: "Portuguese",
  ron: "Romanian",
  rus: "Russian",
  slk: "Slovak",
  slv: "Slovenian",
  spa: "Spanish",
  sqi: "Albanian",
  srp: "Serbian",
  swa: "Swahili",
  swe: "Swedish",
  tam: "Tamil",
  tel: "Telugu",
  tha: "Thai",
  tgl: "Tagalog",
  tur: "Turkish",
  ukr: "Ukrainian",
  urd: "Urdu",
  vie: "Vietnamese",
  zho: "Chinese",
};

/**
 * Get language name from ISO 639-1 code (Twitter & TikTok)
 */
export function getLanguageName_639_1(code: string | null | undefined): string {
  if (!code) return "Unknown";
  return ISO_639_1_LANGUAGES[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Get language name from ISO 639-3 code (Media)
 */
export function getLanguageName_639_3(code: string | null | undefined): string {
  if (!code) return "Unknown";
  return ISO_639_3_LANGUAGES[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Get language name for any source (auto-detects format)
 */
export function getLanguageName(
  code: string | null | undefined,
  source: "twitter" | "tiktok" | "media"
): string {
  if (!code) return "Unknown";
  
  if (source === "media") {
    return getLanguageName_639_3(code);
  }
  
  return getLanguageName_639_1(code);
}

/**
 * Get all available languages for a source
 */
export function getAvailableLanguages(
  source: "twitter" | "tiktok" | "media"
): Record<string, string> {
  if (source === "media") {
    return ISO_639_3_LANGUAGES;
  }
  
  return ISO_639_1_LANGUAGES;
}

/**
 * Search languages by name or code
 */
export function searchLanguages(
  query: string,
  source: "twitter" | "tiktok" | "media"
): Array<{ code: string; name: string }> {
  const languages = getAvailableLanguages(source);
  const lowerQuery = query.toLowerCase();
  
  return Object.entries(languages)
    .filter(
      ([code, name]) =>
        code.toLowerCase().includes(lowerQuery) ||
        name.toLowerCase().includes(lowerQuery)
    )
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

