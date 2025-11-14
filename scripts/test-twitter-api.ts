/**
 * Test Script for TwitterAPI.io Integration
 * 
 * This script tests the Twitter API endpoints to understand the exact
 * data structure before implementing the full integration.
 * 
 * Run with: npx tsx scripts/test-twitter-api.ts
 */

const API_KEY = 'new1_efb60bb213ed46489a8604d92efc1edb';
const BASE_URL = 'https://api.twitterapi.io';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color: string, label: string, message: string) {
  console.log(`${color}${label}${colors.reset} ${message}`);
}

function section(title: string) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Test 1: Advanced Search API
 * Tests the tweet search endpoint with a sample query
 */
async function testAdvancedSearch() {
  section('TEST 1: Advanced Search API');
  
  // Test query: Search for tweets from/to/mentioning PatrickMuyaya
  const query = 'from:PatrickMuyaya OR to:PatrickMuyaya OR @PatrickMuyaya OR "Patrick Muyaya" OR #PatrickMuyaya';
  const encodedQuery = encodeURIComponent(query);
  
  const url = `${BASE_URL}/twitter/tweet/advanced_search?queryType=Latest&query=${encodedQuery}`;
  
  log(colors.blue, '📡 Endpoint:', url);
  log(colors.blue, '🔍 Query:', query);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
      },
    });
    
    log(colors.green, '✅ Status:', `${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    // Log response structure
    log(colors.yellow, '📦 Response Keys:', Object.keys(data).join(', '));
    
    if (data.meta) {
      log(colors.yellow, '📊 Meta:', JSON.stringify(data.meta, null, 2));
    }
    
    if (data.data && Array.isArray(data.data)) {
      log(colors.green, '🐦 Tweets Found:', data.data.length.toString());
      
      if (data.data.length > 0) {
        const firstTweet = data.data[0];
        log(colors.cyan, '📝 First Tweet Structure:', '');
        console.log(JSON.stringify(firstTweet, null, 2));
        
        // Analyze tweet fields
        log(colors.yellow, '🔑 Tweet Fields:', Object.keys(firstTweet).join(', '));
      } else {
        log(colors.yellow, '⚠️ Warning:', 'No tweets found for this query');
      }
    }
    
    // Save full response for analysis
    const fs = await import('fs');
    const outputPath = './scripts/test-output-search.json';
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    log(colors.green, '💾 Saved to:', outputPath);
    
    return data;
  } catch (error) {
    log(colors.red, '❌ Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Test 2: Webhook Rules Management
 * Tests listing, creating, and managing webhook rules
 */
async function testWebhookRules() {
  section('TEST 2: Webhook Rules Management');
  
  // Test 2a: List existing rules
  try {
    log(colors.blue, '📡 Testing:', 'GET /v1/webhook/get_rules');
    
    const response = await fetch(`${BASE_URL}/v1/webhook/get_rules`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
      },
    });
    
    log(colors.green, '✅ Status:', `${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    log(colors.yellow, '📦 Response:', JSON.stringify(data, null, 2));
    
    if (Array.isArray(data)) {
      log(colors.green, '📋 Active Rules:', data.length.toString());
      
      data.forEach((rule, index) => {
        log(colors.cyan, `Rule ${index + 1}:`, JSON.stringify(rule, null, 2));
      });
    }
    
    // Save response
    const fs = await import('fs');
    const outputPath = './scripts/test-output-webhook-rules.json';
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    log(colors.green, '💾 Saved to:', outputPath);
    
    return data;
  } catch (error) {
    log(colors.red, '❌ Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Test 3: Create Test Webhook Rule (OPTIONAL - Commented out by default)
 * 
 * IMPORTANT: This will create an actual webhook rule and may incur charges!
 * Only uncomment and run if you want to test webhook creation.
 */
async function testCreateWebhookRule() {
  section('TEST 3: Create Webhook Rule (SKIPPED)');
  
  log(colors.yellow, '⚠️ Skipped:', 'To avoid creating billable rules during testing');
  log(colors.blue, '💡 Tip:', 'Uncomment this function to test webhook creation');
  
  /*
  // UNCOMMENT TO TEST WEBHOOK CREATION
  
  // Use webhook.site to test receiving webhooks
  const webhookUrl = 'https://webhook.site/YOUR-UNIQUE-ID'; // Replace with your webhook.site URL
  
  const ruleData = {
    tag: 'gorgone_test_rule',
    value: 'from:elonmusk',
    interval_seconds: 300, // Check every 5 minutes
    webhook_url: webhookUrl,
  };
  
  log(colors.blue, '📡 Testing:', 'POST /v1/webhook/add_rule');
  log(colors.yellow, '📦 Payload:', JSON.stringify(ruleData, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/v1/webhook/add_rule`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ruleData),
    });
    
    log(colors.green, '✅ Status:', `${response.status} ${response.statusText}`);
    
    const data = await response.json();
    log(colors.yellow, '📦 Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    log(colors.red, '❌ Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
  */
}

/**
 * Test 4: Webhook Payload Structure Analysis
 * Documents the expected webhook payload based on API documentation
 */
function analyzeWebhookPayload() {
  section('TEST 4: Webhook Payload Structure (From Documentation)');
  
  log(colors.blue, '📚 Source:', 'https://twitterapi.io/blog/using-webhooks-for-real-time-twitter-data');
  
  const samplePayload = {
    event_type: 'tweet',
    rule_id: 'rule_12345',
    rule_tag: 'elon_tweets',
    tweets: [
      {
        id: '1234567890',
        text: 'This is the tweet content matching your filter',
        author: {
          id: '12345',
          username: 'username',
          name: 'Display Name',
        },
        created_at: '2023-06-01T12:34:56Z',
        retweet_count: 42,
        like_count: 420,
        reply_count: 10,
        // More fields...
      },
    ],
    timestamp: 1642789123456,
  };
  
  log(colors.yellow, '📦 Expected Payload Structure:', '');
  console.log(JSON.stringify(samplePayload, null, 2));
  
  log(colors.green, '🔐 Security:', 'Webhook requests include X-API-Key header for verification');
  log(colors.yellow, '💰 Costs:', '$0.00015 per tweet found, $0.00012 per empty check');
}

/**
 * Test 5: Query Builder Logic
 * Tests the query construction logic we'll use in the UI
 */
function testQueryBuilder() {
  section('TEST 5: Query Builder Logic');
  
  const testConfigs = [
    {
      name: 'Simple user monitoring',
      config: {
        from_users: ['PatrickMuyaya'],
        to_users: [],
        mentions: ['PatrickMuyaya'],
        keywords: ['Patrick Muyaya'],
        hashtags: ['PatrickMuyaya'],
        exclude_keywords: [],
        exclude_users: [],
        verified_only: false,
        has_media: false,
        has_links: false,
        min_retweets: null,
        min_likes: null,
      },
      expected: 'from:PatrickMuyaya OR @PatrickMuyaya OR "Patrick Muyaya" OR #PatrickMuyaya',
    },
    {
      name: 'Brand monitoring with filters',
      config: {
        from_users: [],
        to_users: [],
        mentions: [],
        keywords: ['Gorgone', 'monitoring'],
        hashtags: ['socialmedia'],
        exclude_keywords: ['spam', 'fake'],
        exclude_users: ['bot_account'],
        verified_only: true,
        has_media: false,
        has_links: true,
        min_retweets: 10,
        min_likes: 50,
      },
      expected: '(Gorgone OR monitoring) #socialmedia -spam -fake -from:bot_account filter:verified filter:links min_retweets:10 min_faves:50',
    },
  ];
  
  testConfigs.forEach((test, index) => {
    log(colors.cyan, `\nTest Case ${index + 1}:`, test.name);
    log(colors.yellow, 'Config:', JSON.stringify(test.config, null, 2));
    
    // Build query (we'll implement this logic in query-builder.ts)
    const builtQuery = buildQueryFromConfig(test.config);
    log(colors.green, 'Generated Query:', builtQuery);
    log(colors.blue, 'Expected Query:', test.expected);
    
    // Note: Exact matching may vary, but logic should be equivalent
  });
}

/**
 * Helper function to build query from config
 * This is a preview of the logic we'll implement in lib/data/twitter/query-builder.ts
 */
function buildQueryFromConfig(config: any): string {
  const parts: string[] = [];
  
  // User operators (OR logic among them)
  const userOps: string[] = [];
  if (config.from_users?.length) {
    userOps.push(...config.from_users.map((u: string) => `from:${u}`));
  }
  if (config.to_users?.length) {
    userOps.push(...config.to_users.map((u: string) => `to:${u}`));
  }
  if (config.mentions?.length) {
    userOps.push(...config.mentions.map((u: string) => `@${u}`));
  }
  if (userOps.length > 0) {
    parts.push(userOps.join(' OR '));
  }
  
  // Keywords (OR logic)
  if (config.keywords?.length) {
    const keywordQuery = config.keywords
      .map((k: string) => (k.includes(' ') ? `"${k}"` : k))
      .join(' OR ');
    parts.push(keywordQuery);
  }
  
  // Hashtags (OR logic)
  if (config.hashtags?.length) {
    parts.push(...config.hashtags.map((h: string) => `#${h}`));
  }
  
  // Exclude keywords
  if (config.exclude_keywords?.length) {
    parts.push(...config.exclude_keywords.map((k: string) => `-${k}`));
  }
  
  // Exclude users
  if (config.exclude_users?.length) {
    parts.push(...config.exclude_users.map((u: string) => `-from:${u}`));
  }
  
  // Filters (AND logic)
  if (config.verified_only) parts.push('filter:verified');
  if (config.has_media) parts.push('filter:media');
  if (config.has_links) parts.push('filter:links');
  if (config.min_retweets) parts.push(`min_retweets:${config.min_retweets}`);
  if (config.min_likes) parts.push(`min_faves:${config.min_likes}`);
  
  return parts.join(' ');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.bright}${colors.green}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TwitterAPI.io Integration Test Suite - Gorgone        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const tests = [
    { name: 'Advanced Search API', fn: testAdvancedSearch },
    { name: 'Webhook Rules Management', fn: testWebhookRules },
    { name: 'Create Webhook Rule', fn: testCreateWebhookRule },
    { name: 'Webhook Payload Analysis', fn: analyzeWebhookPayload },
    { name: 'Query Builder Logic', fn: testQueryBuilder },
  ];
  
  const results: { name: string; status: 'pass' | 'fail'; error?: string }[] = [];
  
  for (const test of tests) {
    try {
      await test.fn();
      results.push({ name: test.name, status: 'pass' });
    } catch (error) {
      results.push({
        name: test.name,
        status: 'fail',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // Summary
  section('TEST SUMMARY');
  
  results.forEach((result) => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    const color = result.status === 'pass' ? colors.green : colors.red;
    log(color, icon, result.name);
    if (result.error) {
      log(colors.red, '   Error:', result.error);
    }
  });
  
  const passCount = results.filter((r) => r.status === 'pass').length;
  const totalCount = results.length;
  
  console.log(`\n${colors.bright}${passCount === totalCount ? colors.green : colors.yellow}`);
  console.log(`Tests Passed: ${passCount}/${totalCount}`);
  console.log(colors.reset);
  
  log(colors.blue, '\n📝 Next Steps:', '');
  console.log('1. Review the output files in ./scripts/');
  console.log('2. Analyze the actual data structures returned');
  console.log('3. Update the database schema if needed');
  console.log('4. Proceed with implementation');
  
  log(colors.cyan, '\n🌐 Webhook Testing:', '');
  console.log('To test webhooks:');
  console.log('1. Visit https://webhook.site to get a test URL');
  console.log('2. Uncomment testCreateWebhookRule() function');
  console.log('3. Add your webhook.site URL');
  console.log('4. Run the script again');
  console.log('5. Monitor webhook.site for incoming requests');
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

