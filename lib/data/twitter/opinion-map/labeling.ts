/**
 * AI-powered cluster labeling - Enhanced with Context & Descriptions
 * 
 * Labels are ALWAYS generated in English (reference language for storage).
 * The Chat AI translates them dynamically based on user's language.
 * 
 * This approach ensures:
 * - Consistent storage format
 * - No language detection complexity
 * - Dynamic translation via chat (FR, ES, DE, etc.)
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

  // Build enhanced prompt with operational context
  const contextSection = operationalContext 
    ? `\n\nOperational Context:\n${operationalContext}\n\nUse this context to better understand the significance of the posts and provide more relevant analysis.`
    : ''

  // Labels are ALWAYS in English (reference language)
  // The Chat AI translates dynamically based on user's language
  const prompt = `You are an expert analyst identifying opinion clusters in social media data for a government-grade monitoring platform.

Analyze these ${sampledTweets.length} social media posts and provide a detailed, operational analysis.${contextSection}

Posts to analyze:
${sampledTweets.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Detected keywords: ${keywords.join(', ')}

REQUIRED OUTPUT - You MUST provide ALL fields with substantial content:

1. **label** (REQUIRED): A punchy, specific title in 2-5 words. 
   - BAD examples: "Discussion", "Various Topics", "Mixed Opinions", "General Discourse"
   - GOOD examples: "Pro-Government Rally", "Media Criticism Wave", "DRC Tensions Spike", "Anti-Sanctions Campaign"
   - Be specific: WHO is saying WHAT or WHAT is happening

2. **description** (REQUIRED, 2-4 sentences): A detailed operational briefing explaining:
   - The core narrative/opinion that unites these posts
   - The type of voices involved (supporters, critics, journalists, officials, activists, bots, etc.)
   - The significance for monitoring (emerging threat, viral campaign, coordinated action, etc.)
   - Any notable patterns (hashtags, shared media, timing, etc.)

3. **sentiment** (REQUIRED): A score from -1.0 to +1.0
   - -1.0 = strongly negative (attacks, accusations, outrage)
   - 0.0 = neutral (factual, balanced)
   - +1.0 = strongly positive (praise, support, celebration)

IMPORTANT: Output MUST be in English (reference language for storage).

Respond with ONLY a valid JSON object (no markdown, no explanation):
{"label": "Specific Punchy Title", "description": "Detailed 2-4 sentence operational briefing about this cluster...", "sentiment": 0.0}`

  // Retry with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { text } = await generateText({
        model: openaiProvider(LABELING_MODEL_ID),
        prompt,
        temperature: 0.5, // Higher for more creative/varied descriptions (GPT-5.2 is already disciplined)
        maxOutputTokens: 500, // More room for quality descriptions
        providerOptions: {
          openai: {
            reasoningEffort: 'medium' // GPT-5.2: enable deeper analysis for better labels
          }
        }
      })

    // Parse response
      const parsed = parseAIResponse(text)

      // Description goes into reasoning field (that's what the UI displays)
      const description = parsed.description || parsed.reasoning || ''

      logger.info('[Opinion Map] Cluster labeled successfully', {
        cluster_id: clusterId,
        label: parsed.label,
        sentiment: parsed.sentiment,
        description_length: description.length
      })

      return {
        label: parsed.label,
        keywords,
        sentiment: parsed.sentiment,
        confidence: 0.8,
        reasoning: description // UI displays this as "Analysis"
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

  // Fallback: keyword-based label (always English)
  logger.warn('[Opinion Map] Using fallback label', { cluster_id: clusterId })

  const fallbackLabel = keywords.length > 0
    ? keywords.slice(0, 3).join(', ')
    : `Cluster ${clusterId}`

  const fallbackDescription = keywords.length > 0
    ? `This cluster discusses topics related to ${keywords.slice(0, 5).join(', ')}. Generated from keyword analysis.`
    : 'Cluster analysis unavailable.'

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

