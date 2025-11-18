/**
 * AI-powered cluster labeling
 * Generates descriptive labels using GPT-4o-mini
 */

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { logger } from '@/lib/logger'
import type { OpinionLabelingResult } from '@/types'

const MAX_TWEETS_FOR_LABELING = 50
const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 5000

/**
 * Generate a descriptive label for a cluster using AI
 *
 * @param tweets - Array of tweet texts from the cluster
 * @param clusterId - Cluster identifier
 * @returns Label, keywords, and sentiment analysis
 */
export async function generateClusterLabel(
  tweets: string[],
  clusterId: number
): Promise<OpinionLabelingResult> {
  logger.info('[Opinion Map] Generating cluster label', {
    cluster_id: clusterId,
    tweet_count: tweets.length
  })

  // Sample tweets if too many
  const sampledTweets = sampleTweets(tweets, MAX_TWEETS_FOR_LABELING)

  // Extract keywords for context
  const keywords = extractKeywords(sampledTweets, 10)

  // Build prompt
  const prompt = `Analyze these ${sampledTweets.length} social media posts and provide:
1. A concise descriptive label (2-4 words) capturing the main theme
2. Overall sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
3. Brief reasoning for the label

Posts:
${sampledTweets.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Top keywords: ${keywords.join(', ')}

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no additional text.

{
  "label": "short descriptive label",
  "sentiment": 0.5,
  "reasoning": "brief explanation"
}`

  // Retry with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
    const { text } = await generateText({
        model: openai('gpt-4o-mini'),
      prompt,
        temperature: 0.3,
        maxTokens: 200
      })

    // Parse response
      const parsed = parseAIResponse(text)

      logger.info('[Opinion Map] Cluster labeled successfully', {
        cluster_id: clusterId,
      label: parsed.label,
        sentiment: parsed.sentiment
      })

    return {
        label: parsed.label,
      keywords,
        sentiment: parsed.sentiment,
      confidence: 0.8,
        reasoning: parsed.reasoning
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

    return {
      label: fallbackLabel,
      keywords,
      sentiment: 0,
      confidence: 0.3,
    reasoning: 'Generated from keywords (AI unavailable)'
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
  // Stop words (English)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'rt',
    'https', 'http', 'com', 'www'
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
