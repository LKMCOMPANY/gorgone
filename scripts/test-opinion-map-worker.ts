/**
 * Test script for Opinion Map Worker (Local Development)
 * 
 * Usage:
 *   npx tsx scripts/test-opinion-map-worker.ts <session_id>
 * 
 * This bypasses QStash and calls the worker directly.
 */

async function testWorker(sessionId: string) {
  console.log('🚀 Testing Opinion Map Worker locally...')
  console.log(`Session ID: ${sessionId}`)
  
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/qstash/opinion-map-worker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use Bearer token for local testing (bypasses QStash signature check)
        'Authorization': `Bearer ${process.env.TWITTER_API_KEY}`
      },
      body: JSON.stringify({
        session_id: sessionId
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Worker completed successfully!')
      console.log(data)
    } else {
      console.error('❌ Worker failed:', data)
    }
  } catch (error) {
    console.error('❌ Error calling worker:', error)
  }
}

// Get session_id from command line
const sessionId = process.argv[2]

if (!sessionId) {
  console.error('❌ Please provide a session_id')
  console.log('Usage: npx tsx scripts/test-opinion-map-worker.ts <session_id>')
  process.exit(1)
}

testWorker(sessionId)

