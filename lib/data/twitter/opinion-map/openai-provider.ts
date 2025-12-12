import { createOpenAI } from '@ai-sdk/openai'

const AI_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'

/**
 * Opinion-map (carto) provider selection.
 *
 * Best practice:
 * - Prefer Vercel AI Gateway via OIDC in preview/prod (VERCEL_OIDC_TOKEN provided by Vercel)
 * - Allow local dev with an explicit AI Gateway key
 * - Fallback to direct OpenAI when running locally without Gateway
 */
export function getOpinionMapOpenAIProvider() {
  if (process.env.VERCEL_OIDC_TOKEN) {
    return createOpenAI({ baseURL: AI_GATEWAY_BASE_URL })
  }

  if (process.env.AI_GATEWAY_API_KEY) {
    return createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: AI_GATEWAY_BASE_URL,
    })
  }

  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
}


