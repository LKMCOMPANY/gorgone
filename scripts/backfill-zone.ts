/**
 * ONE-TIME BACKFILL SCRIPT
 * Fetch historical tweets for a zone and process them through the pipeline
 * 
 * Usage: npx tsx scripts/backfill-zone.ts
 */

import { advancedSearch } from "../lib/api/twitter/client";
import { getRulesByZone } from "../lib/data/twitter/rules";
import { processIncomingTweets } from "../lib/workers/twitter/deduplicator";
import { logger } from "../lib/logger";

// ===================================
// CONFIGURATION
// ===================================
const ZONE_ID = "04b183de-80c7-485c-9a0b-f8f2565467ad"; // Zone IHC
const TWEET_COUNT = 500; // Number of tweets to fetch
const QUERY_TYPE: "Latest" | "Top" = "Latest"; // Latest or Top

async function main() {
  console.log("🚀 Starting backfill for zone:", ZONE_ID);
  console.log("📊 Target:", TWEET_COUNT, "tweets");
  console.log("🔍 Type:", QUERY_TYPE);
  console.log("");

  try {
    // =====================================================
    // STEP 1: Get active rules for the zone
    // =====================================================
    console.log("1️⃣  Fetching active rule for zone...");
    const rules = await getRulesByZone(ZONE_ID);
    const activeRule = rules.find((r) => r.is_active);

    if (!activeRule) {
      throw new Error(
        `No active rule found for zone ${ZONE_ID}. Please create and activate a rule first.`
      );
    }

    console.log(`✅ Found active rule: "${activeRule.tag}"`);
    console.log(`   Query: ${activeRule.query}`);
    console.log("");

    // =====================================================
    // STEP 2: Search historical tweets using the rule's query
    // =====================================================
    console.log("2️⃣  Searching historical tweets via TwitterAPI.io...");
    let allTweets: any[] = [];
    let nextCursor: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = Math.ceil(TWEET_COUNT / 100); // 100 tweets per page

    while (allTweets.length < TWEET_COUNT && pageCount < maxPages) {
      console.log(`   📄 Fetching page ${pageCount + 1}/${maxPages}...`);

      const searchResult = await advancedSearch({
        query: activeRule.query,
        queryType: QUERY_TYPE,
        count: Math.min(100, TWEET_COUNT - allTweets.length),
        cursor: nextCursor,
      });

      if (searchResult.tweets.length === 0) {
        console.log("   ℹ️  No more tweets found");
        break;
      }

      allTweets = [...allTweets, ...searchResult.tweets];
      nextCursor = searchResult.next_cursor;
      pageCount++;

      console.log(`   ✅ Fetched ${searchResult.tweets.length} tweets (total: ${allTweets.length})`);

      // If no more pages, break
      if (!nextCursor) break;

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("");
    console.log(`✅ Total fetched: ${allTweets.length} tweets`);
    console.log("");

    if (allTweets.length === 0) {
      console.log("⚠️  No tweets found for this query");
      return;
    }

    // =====================================================
    // STEP 3: Process tweets through the same pipeline as webhooks
    // =====================================================
    console.log("3️⃣  Processing tweets through pipeline...");
    console.log("   (deduplication, profiles, entities, storage)");
    console.log("");

    const result = await processIncomingTweets(
      allTweets,
      activeRule.external_rule_id
    );

    // =====================================================
    // RESULTS
    // =====================================================
    console.log("");
    console.log("=" .repeat(50));
    console.log("✅ BACKFILL COMPLETE!");
    console.log("=" .repeat(50));
    console.log("");
    console.log("📊 Results:");
    console.log(`   • Fetched: ${allTweets.length} tweets`);
    console.log(`   • Created: ${result.created} new tweets`);
    console.log(`   • Duplicates: ${result.duplicates} (already existed)`);
    console.log(`   • Errors: ${result.errors}`);
    console.log("");
    
    if (result.created > 0) {
      console.log("🎉 Successfully added", result.created, "new tweets to your zone!");
      console.log("");
      console.log("⏱️  Next steps (automatic):");
      console.log("   1. Tweets will be vectorized in ~5 seconds (via QStash)");
      console.log("   2. Engagement tracking will start in ~1 hour");
      console.log("");
      console.log("💡 Check your dashboard to see the new tweets!");
    } else {
      console.log("ℹ️  All tweets were already in your database (no new data)");
    }
    console.log("");
    
  } catch (error: any) {
    console.error("");
    console.error("❌ ERROR:", error.message);
    console.error("");
    if (error.stack) {
      console.error("Stack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();

