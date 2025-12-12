import { createOpenAI } from '@ai-sdk/openai'

/**
 * Opinion-map OpenAI provider for cluster labeling.
 *
 * Uses direct OpenAI API (same as chat) for consistency and reliability.
 * GPT-5.2 support requires direct API access.
 */
export function getOpinionMapOpenAIProvider() {
  // Use direct OpenAI API with OPENAI_API_KEY (same as chat route)
  // This ensures GPT-5.2 compatibility and avoids AI Gateway routing issues
  return createOpenAI({ 
    apiKey: process.env.OPENAI_API_KEY
  })
}


