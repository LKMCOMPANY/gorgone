/**
 * Event Registry API Test Script
 * 
 * This script tests the Event Registry API endpoints to understand
 * the data structures and available features for media monitoring.
 * 
 * Run: npx tsx scripts/test-event-registry-api.ts
 */

const EVENT_REGISTRY_API_KEY = "e24c638f-5455-4a33-b2db-14822dab498b";
const BASE_URL = "https://eventregistry.org/api/v1";

interface EventRegistryArticle {
  uri: string;
  url: string;
  title: string;
  body: string;
  source: {
    uri: string;
    title: string;
    location?: {
      country?: {
        label: string;
      };
    };
  };
  authors?: Array<{
    name: string;
    uri: string;
  }>;
  date: string;
  time: string;
  dateTime: string;
  sentiment?: number;
  lang: string;
  image?: string;
  eventUri?: string;
  categories?: Array<{
    label: string;
    uri: string;
  }>;
  concepts?: Array<{
    label: {
      eng: string;
    };
    uri: string;
    score?: number;
  }>;
  shares?: {
    facebook?: number;
    twitter?: number;
  };
}

interface EventRegistryResponse {
  articles?: {
    results: EventRegistryArticle[];
    totalResults: number;
    page: number;
    count: number;
    pages: number;
  };
}

/**
 * Test 1: Search articles by keyword
 */
async function testArticleSearch() {
  console.log("\n🔍 Test 1: Article Search by Keyword\n");

  try {
    const query = {
      action: "getArticles",
      keyword: "artificial intelligence",
      articlesCount: 5,
      articlesSortBy: "date",
      lang: "eng",
      isDuplicateFilter: "skipDuplicates",
      apiKey: EVENT_REGISTRY_API_KEY,
    };

    const params = new URLSearchParams(query as any);
    const response = await fetch(`${BASE_URL}/article/getArticles?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: EventRegistryResponse = await response.json();

    console.log("✅ API Response successful");
    console.log(`📊 Total results: ${data.articles?.totalResults || 0}`);
    console.log(`📄 Articles returned: ${data.articles?.results.length || 0}\n`);

    if (data.articles?.results && data.articles.results.length > 0) {
      const article = data.articles.results[0];
      console.log("📰 Sample Article Structure:");
      console.log(JSON.stringify(article, null, 2));
    }

    return data;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

/**
 * Test 2: Search articles by source
 */
async function testSourceSearch() {
  console.log("\n🔍 Test 2: Article Search by Source\n");

  try {
    const query = {
      action: "getArticles",
      sourceUri: "bbc.com",
      articlesCount: 5,
      articlesSortBy: "date",
      apiKey: EVENT_REGISTRY_API_KEY,
    };

    const params = new URLSearchParams(query as any);
    const response = await fetch(`${BASE_URL}/article/getArticles?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: EventRegistryResponse = await response.json();

    console.log("✅ Source search successful");
    console.log(`📊 Total results: ${data.articles?.totalResults || 0}`);
    console.log(`📄 Articles returned: ${data.articles?.results.length || 0}\n`);

    return data;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

/**
 * Test 3: Complex query with multiple filters
 */
async function testComplexQuery() {
  console.log("\n🔍 Test 3: Complex Query (Keyword + Date Range + Language)\n");

  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const query = {
      action: "getArticles",
      keyword: "climate change",
      dateStart: formatDate(sevenDaysAgo),
      dateEnd: formatDate(today),
      lang: "eng",
      articlesCount: 5,
      articlesSortBy: "socialScore",
      apiKey: EVENT_REGISTRY_API_KEY,
    };

    const params = new URLSearchParams(query as any);
    const response = await fetch(`${BASE_URL}/article/getArticles?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: EventRegistryResponse = await response.json();

    console.log("✅ Complex query successful");
    console.log(`📊 Total results: ${data.articles?.totalResults || 0}`);
    console.log(`📄 Articles returned: ${data.articles?.results.length || 0}\n`);

    if (data.articles?.results && data.articles.results.length > 0) {
      console.log("📰 Top Articles by Social Score:");
      data.articles.results.forEach((article, idx) => {
        console.log(`\n${idx + 1}. ${article.title}`);
        console.log(`   Source: ${article.source.title}`);
        console.log(`   Date: ${article.date}`);
        console.log(`   URL: ${article.url}`);
        console.log(`   Sentiment: ${article.sentiment || "N/A"}`);
        if (article.shares) {
          console.log(`   Shares: FB=${article.shares.facebook || 0}, Twitter=${article.shares.twitter || 0}`);
        }
      });
    }

    return data;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

/**
 * Test 4: Get source information
 */
async function testGetSources() {
  console.log("\n🔍 Test 4: Get News Sources\n");

  try {
    const query = {
      action: "getSourceInfo",
      sourceUri: "bbc.com",
      apiKey: EVENT_REGISTRY_API_KEY,
    };

    const params = new URLSearchParams(query as any);
    const response = await fetch(`${BASE_URL}/source/getSourceInfo?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log("✅ Source info retrieved");
    console.log("📰 Source Details:");
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

/**
 * Test 5: Search sources
 */
async function testSearchSources() {
  console.log("\n🔍 Test 5: Search News Sources\n");

  try {
    const query = {
      action: "getSources",
      sourceGroupUri: "paywall/free",
      lang: "eng",
      count: 10,
      apiKey: EVENT_REGISTRY_API_KEY,
    };

    const params = new URLSearchParams(query as any);
    const response = await fetch(`${BASE_URL}/source/getSources?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log("✅ Sources retrieved");
    console.log(`📊 Sources count: ${data.sources?.length || 0}\n`);

    if (data.sources && data.sources.length > 0) {
      console.log("📰 Sample Sources:");
      data.sources.slice(0, 5).forEach((source: any, idx: number) => {
        console.log(`\n${idx + 1}. ${source.title || source.uri}`);
        console.log(`   URI: ${source.uri}`);
        if (source.location) {
          console.log(`   Location: ${source.location.country?.label || "Unknown"}`);
        }
      });
    }

    return data;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("🚀 Event Registry API Testing Suite");
  console.log("=====================================");
  console.log(`API Key: ${EVENT_REGISTRY_API_KEY.substring(0, 8)}...`);
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Run all tests
    await testArticleSearch();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting

    await testSourceSearch();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testComplexQuery();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testGetSources();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testSearchSources();

    console.log("\n✅ All tests completed successfully!");
    console.log("\n📋 Summary:");
    console.log("- Article search by keyword: ✓");
    console.log("- Article search by source: ✓");
    console.log("- Complex filtered queries: ✓");
    console.log("- Source information retrieval: ✓");
    console.log("- Source search: ✓");

  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  main();
}

export { testArticleSearch, testSourceSearch, testComplexQuery, testGetSources, testSearchSources };

