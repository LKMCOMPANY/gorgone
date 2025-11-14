# Twitter API Test Scripts

This directory contains test scripts for validating the TwitterAPI.io integration before implementing the full system.

## Running the Tests

### Prerequisites

```bash
npm install -D tsx
```

### Run All Tests

```bash
npx tsx scripts/test-twitter-api.ts
```

## What Gets Tested

1. **Advanced Search API** - Tests tweet search with real queries
2. **Webhook Rules Management** - Lists existing webhook rules
3. **Create Webhook Rule** - (Optional) Creates a test webhook rule
4. **Webhook Payload Analysis** - Documents expected webhook format
5. **Query Builder Logic** - Tests query construction

## Output Files

Test results are saved to:
- `scripts/test-output-search.json` - Search API response
- `scripts/test-output-webhook-rules.json` - Webhook rules list

## Testing Webhooks

To test actual webhook delivery:

1. Visit [webhook.site](https://webhook.site) to get a temporary webhook URL
2. Open `test-twitter-api.ts`
3. Uncomment the `testCreateWebhookRule()` function
4. Replace `YOUR-UNIQUE-ID` with your webhook.site ID
5. Run the script
6. Monitor webhook.site for incoming POST requests

## Important Notes

⚠️ **Creating webhook rules incurs API charges!**
- $0.00015 per tweet found
- $0.00012 per check with no tweets

💡 **Deactivate test rules** after testing to avoid ongoing charges.

## Expected Results

After running tests, you should see:
- ✅ Successful API connections
- 📦 Actual data structure from Twitter API
- 🔍 Understanding of webhook payload format
- 📝 Query builder logic validation

## Next Steps

1. Review the JSON output files
2. Compare with database schema in `TWITTER_INTEGRATION_ANALYSIS.md`
3. Adjust schema if needed based on actual API responses
4. Proceed with implementation

