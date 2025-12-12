/**
 * Test Embedding API
 * Quick endpoint to test if OpenAI embeddings work
 */

import { NextResponse } from 'next/server'
import { embed } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const usingGatewayOidc = !!process.env.VERCEL_OIDC_TOKEN
    const usingGatewayKey = !!process.env.AI_GATEWAY_API_KEY

    const provider =
      usingGatewayOidc
        ? createOpenAI({ baseURL: 'https://ai-gateway.vercel.sh/v1' })
        : usingGatewayKey
          ? createOpenAI({
              apiKey: process.env.AI_GATEWAY_API_KEY,
              baseURL: 'https://ai-gateway.vercel.sh/v1',
            })
          : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

    logger.info('[Test Embedding] Testing embedding API', {
      vercel_oidc_token_present: !!process.env.VERCEL_OIDC_TOKEN,
      ai_gateway_key_present: !!process.env.AI_GATEWAY_API_KEY,
      openai_key_present: !!process.env.OPENAI_API_KEY,
    })

    // Test embedding
    const testText = "This is a test tweet to verify OpenAI embeddings are working correctly."
    
    const result = await embed({
      model: provider.embedding('text-embedding-3-small'),
      value: testText
    })

    return NextResponse.json({
      success: true,
      embedding_dimensions: result.embedding.length,
      tokens_used: result.usage?.tokens,
      test_text: testText,
      config: {
        vercel_oidc_token_present: !!process.env.VERCEL_OIDC_TOKEN,
        ai_gateway_key_present: !!process.env.AI_GATEWAY_API_KEY,
        openai_key_present: !!process.env.OPENAI_API_KEY,
      }
    })

  } catch (error) {
    logger.error('[Test Embedding] Failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          ai_gateway_key_present: !!process.env.AI_GATEWAY_API_KEY,
          openai_key_present: !!process.env.OPENAI_API_KEY
        }
      },
      { status: 500 }
    )
  }
}

