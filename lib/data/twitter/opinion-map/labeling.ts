/**
 * AI-powered cluster labeling - Enhanced with Context & Descriptions
 * Generates descriptive labels using a small, deterministic JSON-only prompt
 * (used during opinion-map generation; output is stored and displayed in the UI)
 */

import { generateText } from 'ai'
import { logger } from '@/lib/logger'
import type { OpinionLabelingResult } from '@/types'
import { getOpinionMapOpenAIProvider } from './openai-provider'

const openaiProvider = getOpinionMapOpenAIProvider()

const MAX_TWEETS_FOR_LABELING = 50
const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 5000
const LABELING_MODEL_ID = 'gpt-5.2'

/**
 * Generate a descriptive label for a cluster using AI with operational context
 *
 * @param tweets - Array of tweet texts from the cluster
 * @param clusterId - Cluster identifier
 * @param operationalContext - Optional operational context for better analysis
 * @returns Label, keywords, sentiment analysis, and description
 */
export async function generateClusterLabel(
  tweets: string[],
  clusterId: number,
  operationalContext?: string | null
): Promise<OpinionLabelingResult> {
  logger.info('[Opinion Map] Generating cluster label', {
    cluster_id: clusterId,
    tweet_count: tweets.length,
    has_context: Boolean(operationalContext)
  })

  // Sample tweets if too many
  const sampledTweets = sampleTweets(tweets, MAX_TWEETS_FOR_LABELING)

  // Extract keywords for context
  const keywords = extractKeywords(sampledTweets, 10)

  const outputLanguage = detectOutputLanguage(sampledTweets, operationalContext)

  // Build enhanced prompt with operational context
  const contextSection = operationalContext 
    ? `\n\nOperational Context:\n${operationalContext}\n\nUse this context to better understand the significance of the posts and provide more relevant analysis.`
    : ''

  const prompt = `You are analyzing social media posts to identify opinion clusters for a government-grade monitoring application.

Analyze these ${sampledTweets.length} social media posts and provide:
1. A concise descriptive label (2-4 words) capturing the main theme
2. A detailed description (1-2 sentences) explaining:
   - The main opinion or subject discussed
   - The type of accounts involved (supporters, critics, influencers, etc.)
   - The significance in the given context
3. Overall sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
4. Brief reasoning for the label${contextSection}

Output language: ${outputLanguage === 'fr' ? 'French' : 'English'} (label, description, reasoning must follow this).

Posts:
${sampledTweets.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Top keywords: ${keywords.join(', ')}

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no additional text. Be professional and objective.

{
  "label": "short descriptive label",
  "description": "Detailed 1-2 sentence description of the cluster's opinion, subjects, and account types",
  "sentiment": 0.5,
  "reasoning": "brief explanation of why this label fits"
}`

  // Retry with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { text } = await generateText({
        model: openaiProvider(LABELING_MODEL_ID),
        prompt,
        temperature: 0.2,
        maxOutputTokens: 350
      })

    // Parse response
      const parsed = parseAIResponse(text)

      logger.info('[Opinion Map] Cluster labeled successfully', {
        cluster_id: clusterId,
      label: parsed.label,
        sentiment: parsed.sentiment,
        has_description: Boolean(parsed.description)
      })

    return {
        label: parsed.label,
      keywords,
        sentiment: parsed.sentiment,
      confidence: 0.8,
        reasoning: parsed.description || parsed.reasoning // Use description if available, fallback to reasoning
      }

  } catch (error) {
      const isRateLimit = error instanceof Error && (
        error.message.includes('rate limit') ||
        error.message.includes('429')
      )

      if (isRateLimit && attempt < MAX_RETRIES - 1) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt)
        logger.warn('[Opinion Map] Rate limit hit, retrying', {
          cluster_id: clusterId,
          attempt: attempt + 1,
          delay_ms: delay
        })
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      logger.error('[Opinion Map] AI labeling failed', {
        cluster_id: clusterId,
        attempt: attempt + 1,
        error: error instanceof Error ? error.message : String(error)
      })

      // Use fallback on final attempt
      if (attempt === MAX_RETRIES - 1) {
        break
      }
    }
  }

  // Fallback: keyword-based label
  logger.warn('[Opinion Map] Using fallback label', { cluster_id: clusterId })

  const fallbackLabel = keywords.length > 0
    ? keywords.slice(0, 3).join(', ')
    : `Cluster ${clusterId}`

  const fallbackDescription = keywords.length > 0
    ? `This cluster discusses topics related to ${keywords.slice(0, 5).join(', ')}. Generated from keyword analysis due to AI unavailability.`
    : 'Cluster analysis unavailable at this time.'

    return {
      label: fallbackLabel,
      keywords,
      sentiment: 0,
      confidence: 0.3,
    reasoning: fallbackDescription
  }
}

/**
 * Parse AI response with robust error handling
 * Handles markdown, arrays, and malformed JSON
 */
function parseAIResponse(text: string): {
  label: string
  sentiment: number
  reasoning?: string
  description?: string
} {
  let jsonText = text.trim()

  // Remove markdown code blocks
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  // Extract JSON object
  const objectMatch = jsonText.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    jsonText = objectMatch[0]
  }

  // Clean up
  jsonText = jsonText
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control chars
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .trim()

  // Parse
  let parsed = JSON.parse(jsonText)

  // Handle array responses (take first element)
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new Error('Empty array in response')
    }
    parsed = parsed[0]
  }

  // Validate
  if (!parsed.label || typeof parsed.sentiment !== 'number') {
    throw new Error(`Invalid response format: ${JSON.stringify(parsed)}`)
  }

  // Normalize + clamp sentiment to [-1, 1]
  if (!Number.isFinite(parsed.sentiment)) {
    throw new Error(`Invalid sentiment (non-finite): ${JSON.stringify(parsed)}`)
  }
  parsed.sentiment = Math.max(-1, Math.min(1, parsed.sentiment))

  // Basic label hygiene (keep it short & UI-friendly)
  if (typeof parsed.label !== 'string' || parsed.label.trim().length < 2) {
    throw new Error(`Invalid label: ${JSON.stringify(parsed)}`)
  }
  parsed.label = parsed.label.trim().slice(0, 80)

  if (parsed.description && typeof parsed.description === 'string') {
    parsed.description = parsed.description.trim().slice(0, 350)
  }
  if (parsed.reasoning && typeof parsed.reasoning === 'string') {
    parsed.reasoning = parsed.reasoning.trim().slice(0, 350)
  }

  return parsed
}

/**
 * Sample tweets evenly from cluster
 */
function sampleTweets(tweets: string[], sampleSize: number): string[] {
  if (tweets.length <= sampleSize) return tweets

  const step = tweets.length / sampleSize
  const sampled: string[] = []

  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(i * step)
    sampled.push(tweets[idx])
  }

  return sampled
}

/**
 * Extract top keywords using frequency analysis
 * Filters stop words and returns most common terms
 */
export function extractKeywords(tweets: string[], topN: number): string[] {
  // Stop words (English + French)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'rt',
    'https', 'http', 'com', 'www'
    ,
    // FR (minimal but high-signal)
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'et', 'ou', 'mais',
    'en', 'dans', 'sur', 'au', 'aux', 'pour', 'par', 'avec', 'sans', 'ce', 'cet',
    'cette', 'ces', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
    'est', 'sont', 'été', 'etre', 'être', 'a', 'as', 'ai', 'ont', 'avoir', 'fait',
    'plus', 'moins', 'très', 'tres', 'ici', 'là', 'la', 'pas', 'ne'
  ])

  // Count word frequencies
  const wordFreq = new Map<string, number>()

  tweets.forEach(tweet => {
    const words = tweet
      .toLowerCase()
      .replace(/[^\w\s#@]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w))

    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    })
  })

  // Sort by frequency and return top N
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word)
}

function detectOutputLanguage(tweets: string[], operationalContext?: string | null): 'fr' | 'en' {
  // Heuristic: count common FR vs EN function words (robust to short texts)
  const frHits = countHits(tweets, [
    ' le ', ' la ', ' les ', ' de ', ' des ', ' du ', ' et ', ' pour ', ' sur ', ' dans ', ' avec ', " d'", ' est ', ' sont '
  ])
  const enHits = countHits(tweets, [
    ' the ', ' and ', ' of ', ' to ', ' in ', ' on ', ' for ', ' with ', ' is ', ' are '
  ])

  // Context can break ties (many zones will have FR operational context)
  const ctx = (operationalContext || '').toLowerCase()
  const ctxLooksFr = /[àâçéèêëîïôùûüÿœ]/.test(ctx) || /\b(zone|contexte|opérationnel|sécurité|risque|narratif)\b/.test(ctx)

  if (frHits === 0 && enHits === 0) {
    return ctxLooksFr ? 'fr' : 'en'
  }

  return frHits >= enHits ? 'fr' : 'en'
}

function countHits(texts: string[], needles: string[]): number {
  let hits = 0
  for (const t of texts) {
    const s = ` ${String(t).toLowerCase()} `
    for (const n of needles) {
      if (s.includes(n)) hits++
    }
  }
  return hits
}
