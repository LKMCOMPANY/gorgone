# Chat Intelligence - Production Test Guide

**Date**: November 21, 2025  
**Purpose**: Systematic testing of all 14 AI tools before production deployment  
**Tester**: QA Team / Product Owner

---

## 🎯 Test Strategy

### Test Order
1. **Sprint 1 tools** (essentials) - Most used
2. **Visualization tool** - Visual feedback
3. **Sprint 2-4 tools** (advanced) - Complex features

### Success Criteria
- ✅ Tool is called correctly by GPT-4o
- ✅ Data is fetched from Supabase
- ✅ Response is formatted properly
- ✅ No errors in console
- ✅ Performance < 5s per tool call

---

## 📋 Test Checklist

### Sprint 1: Essential Tools

#### Test 1.1: get_zone_overview
**Question**: `"Give me a complete overview of the zone activity"`

**Expected Behavior**:
- Tool called: `get_zone_overview`
- Returns data from: Twitter + TikTok + Media
- Shows: Top profiles, trending hashtags, article count, sentiment

**Validation**:
- [ ] Tool appears in console logs: `[AI Tool] get_zone_overview called`
- [ ] Response includes Twitter section (if enabled)
- [ ] Response includes TikTok section (if enabled)
- [ ] Response includes Media section (if enabled)
- [ ] No null/undefined errors
- [ ] Response time < 3s

**Sample Response Format**:
```markdown
## Zone Overview - Last 24 Hours

### Twitter
- Top Profiles: ...
- Trending: ...

### TikTok
- Trending Hashtags: #kinshasa, #congo, ...

### Media
- Total Articles: 5
- Avg Sentiment: +0.14
- Top Sources: ACP (3), ...
```

---

#### Test 1.2: get_top_content
**Question**: `"Show me the top 5 posts by engagement"`

**Expected Behavior**:
- Tool called: `get_top_content`
- Parameters: platform="all", period="24h", limit=5
- Returns: Sorted list of tweets + videos

**Validation**:
- [ ] Tool called with correct params
- [ ] Content sorted by engagement (descending)
- [ ] Includes author info (username, verified)
- [ ] Includes engagement stats (likes, RT, etc.)
- [ ] Includes URLs to original content
- [ ] Cross-platform merge works correctly

**Sample Response**:
```markdown
Top 5 posts by engagement:

1. **TikTok Video** by @voiceofkinshasa
   - 234,431 total engagement
   - 217K views, 14K likes
   - [View →](https://tiktok.com/...)

2. **Tweet** by @user
   - 15,234 total engagement
   - [View →](https://x.com/...)
```

---

#### Test 1.3: get_top_accounts
**Question**: `"Top 10 accounts by engagement on all platforms"`

**Expected Behavior**:
- Tool called: `get_top_accounts`
- Parameters: platform="all", period="24h", limit=10
- Returns: Profiles with stats

**Validation**:
- [ ] Both Twitter and TikTok profiles included
- [ ] Sorted by total engagement
- [ ] Shows followers, verified status
- [ ] Shows engagement metrics per platform
- [ ] No duplicate profiles

---

#### Test 1.4: get_trending_topics
**Question**: `"What are the trending hashtags?"`

**Expected Behavior**:
- Tool called: `get_trending_topics`
- Merges hashtags from Twitter + TikTok
- Returns: Sorted by total count

**Validation**:
- [ ] Cross-platform merge works (#congo appears once, not twice)
- [ ] Shows platform breakdown
- [ ] Sorted by total count
- [ ] Includes unique user count (Twitter)

**Sample Response**:
```markdown
Trending Hashtags (last 24h):

1. **#kinshasa** - 45 total mentions
   - TikTok: 45 videos
   
2. **#congo** - 32 total mentions
   - TikTok: 18 videos
   - Twitter: 14 tweets
```

---

#### Test 1.5: search_content
**Question**: `"Find content about Patrick Muyaya"`

**Expected Behavior**:
- Tool called: `search_content`
- Searches: tweets, videos, articles
- Returns: Relevant content across platforms

**Validation**:
- [ ] Full-text search works
- [ ] Results from all 3 platforms
- [ ] Sorted by relevance/engagement
- [ ] Includes excerpts/descriptions

---

### Visualization Tool

#### Test 2.1: create_visualization
**Question**: `"Show me a chart of volume trends over 24 hours"`

**Expected Behavior**:
- Tool called: `create_visualization`
- Parameters: chart_type="line", data_type="volume", period="24h"
- Returns: Chart data structure with _type="visualization"

**Validation**:
- [ ] Chart is rendered in UI
- [ ] Data points are visible
- [ ] Tooltip works on hover
- [ ] Chart uses design system colors
- [ ] Responsive (adapts to width)
- [ ] Data comes from `getHourlyVolumeTrend`
- [ ] Shows actual tweet/video counts

**Visual Check**:
- [ ] Line is smooth
- [ ] Grid is subtle
- [ ] Axes are labeled
- [ ] No data errors displayed

---

### Sprint 2: Analysis Tools

#### Test 3.1: analyze_sentiment
**Question**: `"What is the overall sentiment in the zone?"`

**Expected Behavior**:
- Tool called: `analyze_sentiment`
- Analyzes: Media articles (sentiment scores)
- Returns: Positive/Negative/Neutral breakdown

**Validation**:
- [ ] Media sentiment calculated correctly
- [ ] Percentages add up to 100%
- [ ] Most positive/negative examples shown
- [ ] Twitter/TikTok engagement-based heuristics included

---

#### Test 3.2: get_share_of_voice
**Question**: `"Show share of voice between allies and adversaries"`

**Expected Behavior**:
- Tool called: `get_share_of_voice`
- Queries: Tagged profiles from both platforms
- Returns: Volume & engagement % per tag type

**Validation**:
- [ ] Only shows tags that have profiles assigned
- [ ] Percentages calculated correctly
- [ ] Sorted by volume (descending)
- [ ] If no tags: Clear message shown

**Note**: Requires tagged profiles in Settings > Tracked Profiles

---

### Sprint 3: Advanced Tools

#### Test 4.1: get_opinion_map_summary
**Question**: `"What are the dominant opinions?"`

**Expected Behavior**:
- Tool called: `get_opinion_map_summary`
- Checks: Latest completed session
- Returns: Cluster labels, sizes, keywords

**Validation**:
- [ ] If no session: Clear message
- [ ] If in progress: Shows status & progress
- [ ] If completed: Shows clusters sorted by size
- [ ] Dominant cluster highlighted
- [ ] Keywords listed per cluster

**Note**: Requires generated opinion map from Analysis page

---

#### Test 4.2: analyze_account
**Question**: `"Analyze the account @voiceofkinshasa on TikTok"`

**Expected Behavior**:
- Tool called: `analyze_account`
- Parameters: username="voiceofkinshasa", platform="tiktok"
- Returns: Profile + stats + top content + tags

**Validation**:
- [ ] Profile found and displayed
- [ ] Follower count, verified status shown
- [ ] Activity stats (video count, engagement)
- [ ] Top 5 videos by engagement
- [ ] Profile tags shown (if any)
- [ ] If not found: Clear message

---

#### Test 4.3: detect_anomalies
**Question**: `"Detect any unusual activity or spikes"`

**Expected Behavior**:
- Tool called: `detect_anomalies`
- Analyzes: Volume patterns, viral content
- Returns: Detected anomalies with severity

**Validation**:
- [ ] Volume spike detection works (compares to baseline)
- [ ] Viral content identified (> avg engagement × threshold)
- [ ] Severity levels assigned (high/medium)
- [ ] If no anomalies: Clear message

---

### Sprint 4: Specialized Tools

#### Test 5.1: get_media_coverage
**Question**: `"Analyze media coverage on elections"`

**Expected Behavior**:
- Tool called: `get_media_coverage`
- Parameters: topic="elections"
- Returns: Articles, sources, sentiment breakdown

**Validation**:
- [ ] Search works in titles and bodies
- [ ] Sentiment breakdown calculated
- [ ] Top sources listed
- [ ] Top articles by social score
- [ ] URLs included

---

#### Test 5.2: compare_accounts
**Question**: `"Compare @user1 and @user2 on Twitter"`

**Expected Behavior**:
- Tool called: `compare_accounts`
- Parameters: usernames=["user1", "user2"], platform="twitter"
- Returns: Side-by-side stats

**Validation**:
- [ ] Both profiles found
- [ ] Stats shown for same period
- [ ] Winner determined
- [ ] Engagement rates calculated
- [ ] If profile not found: Marked as not found

---

#### Test 5.3: generate_report
**Question**: `"Generate a comprehensive report of the last 24 hours"`

**Expected Behavior**:
- Tool called: `generate_report`
- Executes: Multiple tools in parallel (7 sections)
- Returns: Complete report structure

**Validation**:
- [ ] Multiple tools called in parallel (check console)
- [ ] All sections included: overview, top_content, top_accounts, trending, sentiment, share_of_voice, anomalies
- [ ] Report marker: `_type: "report"`
- [ ] Failed sections listed (if any)
- [ ] Response is well-structured markdown

**Performance**:
- [ ] Parallel execution < 5s total (not sequential 15s+)

---

## 🔍 Data Source Verification

### Check Each Data Layer is Used

#### Twitter Data (2,553 tweets)
- [ ] `twitter_tweets` - Used by: search, top_content, volume charts ✅
- [ ] `twitter_profiles` - Used by: top_accounts, analyze_account ✅
- [ ] `twitter_entities` - Used by: trending_topics ✅
- [ ] `twitter_profile_zone_tags` - Used by: share_of_voice ✅
- [ ] `twitter_opinion_sessions` - Used by: opinion_map_summary ✅
- [ ] `twitter_opinion_clusters` - Used by: opinion_map_summary ✅

#### TikTok Data (178 videos)
- [ ] `tiktok_videos` - Used by: search, top_content, volume charts ✅
- [ ] `tiktok_profiles` - Used by: top_accounts, analyze_account ✅
- [ ] `tiktok_entities` - Used by: trending_topics ✅
- [ ] `tiktok_profile_zone_tags` - Used by: share_of_voice ✅

#### Media Data (407 articles)
- [ ] `media_articles` - Used by: search, media_coverage, sentiment ✅
- [ ] `media_sources` - Used by: media_coverage (top sources) ✅

**Result**: ✅ All data sources are utilized optimally

---

## 🚨 Error Handling Verification

### Check Each Tool Handles Errors

For each tool, verify:
- [ ] Try/catch around main execution
- [ ] Logger.error on failures
- [ ] Meaningful error messages
- [ ] Graceful degradation (returns empty array, not crash)
- [ ] No undefined/null access without checks

**Automated Check**:
```bash
# Search for tools without try/catch
grep -L "try {" lib/ai/tools/*.ts

# Should return empty (all tools have try/catch)
```

---

## 🏃 Performance Benchmarks

### Tool Response Times (Target)

| Tool | Target | Acceptable | Notes |
|------|--------|------------|-------|
| get_zone_overview | < 2s | < 3s | 3 parallel queries |
| get_top_content | < 1s | < 2s | Uses indexes |
| get_top_accounts | < 1s | < 2s | Direct query |
| get_trending_topics | < 1s | < 2s | Entity aggregation |
| search_content | < 2s | < 3s | Full-text search |
| analyze_sentiment | < 1s | < 2s | Simple aggregation |
| get_share_of_voice | < 2s | < 3s | Multiple queries |
| get_opinion_map_summary | < 500ms | < 1s | Already computed |
| analyze_account | < 1s | < 2s | Single profile |
| detect_anomalies | < 2s | < 3s | Statistical calc |
| get_media_coverage | < 2s | < 3s | Article search |
| compare_accounts | < 2s | < 3s | 2-5 profiles |
| generate_report | < 5s | < 8s | Parallel execution |
| create_visualization | < 2s | < 3s | Volume aggregation |

---

## 🧹 Code Quality Checks

### Run Before Deployment

```bash
# 1. Type checking
npm run type-check

# 2. Linting
npm run lint

# 3. Format check
npm run format:check

# 4. Build test
npm run build
```

### Expected Results
- ✅ 0 TypeScript errors
- ✅ 0 ESLint warnings
- ✅ All files formatted
- ✅ Build succeeds

---

## 📊 Manual Test Scenarios

### Scenario 1: First-Time User
1. Open chat (never used before)
2. See quick actions
3. Click "Zone overview"
4. Receive formatted response
5. Click "Generate report"
6. See comprehensive analysis

**Expected**: Smooth onboarding, clear responses

---

### Scenario 2: Power User
1. Ask: "Compare top 3 TikTok accounts"
2. GPT identifies accounts automatically
3. Ask follow-up: "Show me charts"
4. Charts appear inline
5. Ask: "Focus on @username"
6. Deep analysis shown

**Expected**: Multi-turn conversation flows naturally

---

### Scenario 3: Mobile User
1. Open on iPhone
2. Click chat → Full screen sheet
3. Select quick action
4. Scroll through response
5. Charts are responsive
6. Links are touch-friendly

**Expected**: Perfect mobile experience

---

### Scenario 4: Zone Switching
1. On Zone A, open chat
2. Ask question about Zone A
3. Navigate to Zone B
4. Chat auto-switches to Zone B context
5. New question uses Zone B data

**Expected**: Seamless zone switching

---

### Scenario 5: Error Recovery
1. Ask question requiring data that doesn't exist
2. GPT handles gracefully
3. Suggests alternative questions
4. No crash, no undefined errors

**Expected**: Graceful error handling

---

## 🔒 Security Checklist

### Verify Before Production

- [ ] RLS policies enforced on all chat tables
- [ ] Zone access verified in API route
- [ ] Client_id isolation working
- [ ] No SQL injection possible (parameterized queries)
- [ ] User can only see own zones' data
- [ ] Super admin can't access other clients' chats
- [ ] API key (OpenAI) not exposed to client

---

## 💰 Cost Monitoring

### Track in First Week

**Metrics to Monitor**:
- Total conversations/day
- Average tokens per conversation
- Cost per conversation
- Peak usage hours
- Most used tools

**Alert Thresholds**:
- If cost > $50/day → Investigate
- If average > 20K tokens/conv → Optimize
- If errors > 5% → Debug

---

## 📱 Cross-Browser Testing

### Test On

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Check
- [ ] Markdown renders correctly
- [ ] Charts display properly
- [ ] Copy button works
- [ ] Sidebar animations smooth
- [ ] No console errors

---

## 🎯 User Acceptance Testing

### Give to 3 Stakeholders

**Test Questions**:
1. "Is the chat easy to find and open?"
2. "Are the quick actions helpful?"
3. "Are the responses clear and actionable?"
4. "Do the charts add value?"
5. "Any features missing?"

**Expected Feedback**:
- 90%+ satisfaction
- < 2 minutes to understand interface
- Able to complete tasks without help

---

## 📝 Production Readiness Checklist

### Before Go-Live

#### Database
- [x] Migration applied: `20251121_chat_tables.sql`
- [ ] RLS policies tested
- [ ] Indexes verified (no slow queries)

#### Environment
- [ ] `OPENAI_API_KEY` configured in Vercel
- [ ] All Supabase vars confirmed
- [ ] `NEXT_PUBLIC_APP_URL` correct

#### Code
- [ ] No console.log in production (or logger.info only)
- [ ] Error boundaries in place
- [ ] Loading states everywhere
- [ ] No hardcoded values

#### Monitoring
- [ ] Vercel Analytics enabled
- [ ] Supabase logs accessible
- [ ] Error tracking (Sentry recommended)
- [ ] Cost alerts configured

#### Documentation
- [ ] User guide created
- [ ] Admin guide for tool management
- [ ] Troubleshooting doc
- [ ] API cost expectations communicated

---

## 🚀 Deployment Steps

### 1. Pre-Deployment
```bash
# Final checks
npm run type-check
npm run lint
npm run build

# If all pass:
git add .
git commit -m "feat: Add AL-IA chat intelligence with 14 AI tools"
```

### 2. Deploy to Vercel
```bash
git push origin main

# Or via Vercel CLI:
vercel --prod
```

### 3. Post-Deployment
- [ ] Test on production URL
- [ ] Verify all tools work
- [ ] Check Vercel logs
- [ ] Monitor costs (OpenAI dashboard)

### 4. Communication
- [ ] Announce to users
- [ ] Share quick start guide
- [ ] Collect feedback
- [ ] Iterate based on usage

---

## 🔄 Continuous Improvement

### Week 1: Monitor
- Usage patterns
- Popular tools
- Error rates
- Performance

### Week 2: Optimize
- Cache frequently asked questions
- Add more quick actions based on usage
- Optimize slow tools
- Improve prompts based on feedback

### Month 1: Enhance
- Add missing tools users request
- Improve visualizations
- Add conversation history
- Export to PDF

---

## ✅ Sign-Off

**Tested By**: _______________  
**Date**: _______________  
**Status**: [ ] Ready for Production  
**Notes**: _______________

---

**Use this guide systematically** - Don't skip tests! 🎯

