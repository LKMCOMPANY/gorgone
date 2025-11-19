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
    // Configure OpenAI with AI Gateway
    const openaiGateway = createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: 'https://ai-gateway.vercel.sh/v1'
    })

    logger.info('[Test Embedding] Testing embedding API', {
      ai_gateway_key_present: !!process.env.AI_GATEWAY_API_KEY,
      openai_key_present: !!process.env.OPENAI_API_KEY,
      using_key: process.env.AI_GATEWAY_API_KEY ? 'AI_GATEWAY_API_KEY' : 'OPENAI_API_KEY'
    })

    // Test embedding
    const testText = "This is a test tweet to verify OpenAI embeddings are working correctly."
    
    const result = await embed({
      model: openaiGateway.embedding('text-embedding-3-small'),
      value: testText
    })

    return NextResponse.json({
      success: true,
      embedding_dimensions: result.embedding.length,
      tokens_used: result.usage?.tokens,
      test_text: testText,
      config: {
        ai_gateway_key_present: !!process.env.AI_GATEWAY_API_KEY,
        openai_key_present: !!process.env.OPENAI_API_KEY,
        using_key: process.env.AI_GATEWAY_API_KEY ? 'AI_GATEWAY_API_KEY' : 'OPENAI_API_KEY'
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

