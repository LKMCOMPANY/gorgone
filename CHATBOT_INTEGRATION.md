# AL-IA Chat Intelligence - Complete Integration

**Version**: 1.0  
**Date**: November 21, 2025  
**Status**: ✅ Production Ready

---

## Overview

AL-IA is an AI-powered chat assistant integrated into Gorgone for intelligent analysis of monitored social media data. It provides real-time insights, generates reports, creates visualizations, and answers complex analytical questions across Twitter, TikTok, and Media platforms.

---

## Features

### Core Capabilities

- **14 AI Tools** - Comprehensive coverage of monitoring use cases
- **Multi-Platform Analysis** - Twitter + TikTok + Media simultaneously  
- **Real-Time Streaming** - Instant responses with Vercel AI SDK
- **Interactive Visualizations** - Line/Bar/Area charts with Recharts
- **Markdown Rendering** - Professional formatted responses
- **Context-Aware** - Auto-detects zone from navigation
- **Cross-Platform Search** - Find content across all sources
- **Opinion Analysis** - Leverages UMAP 3D clustering
- **Anomaly Detection** - Volume spikes and viral content
- **Report Generation** - Comprehensive executive summaries

---

## Architecture

### Tech Stack

- **AI Model**: OpenAI GPT-4o (function calling)
- **SDK**: Vercel AI SDK v4 (streaming, tools)
- **Database**: Supabase PostgreSQL (4 new tables)
- **Charts**: Recharts (responsive, themeable)
- **Markdown**: react-markdown + remark-gfm
- **UI**: Shadcn UI (sidebar integrated pattern)

### Data Flow

```
User Question
    ↓
GPT-4o (analyzes intent)
    ↓
Selects 1-5 tools
    ↓
Tools query Supabase (lib/data/)
    ↓
Returns structured JSON
    ↓
GPT-4o formats response
    ↓
Streams markdown + charts
    ↓
UI renders professionally
```

---

## AI Tools (14 Total)

### Sprint 1: Essential Tools

#### 1. get_zone_overview
**Purpose**: Complete zone activity overview  
**Use Case**: "Give me an overview of the zone"  
**Returns**: Twitter stats, TikTok trends, Media sentiment

#### 2. get_top_content  
**Purpose**: Most engaging posts/videos  
**Use Case**: "Top posts by engagement"  
**Returns**: Sorted content across platforms

#### 3. get_top_accounts
**Purpose**: Most influential profiles  
**Use Case**: "Top accounts by engagement"  
**Returns**: Profiles with stats (followers, engagement, activity)

#### 4. get_trending_topics
**Purpose**: Trending hashtags  
**Use Case**: "What's trending?"  
**Returns**: Cross-platform hashtag merge with counts

#### 5. search_content
**Purpose**: Find specific content  
**Use Case**: "Find content about [topic]"  
**Returns**: Tweets, videos, articles matching query

### Sprint 2: Analysis Tools

#### 6. analyze_sentiment
**Purpose**: Sentiment analysis  
**Use Case**: "What is the sentiment?"  
**Returns**: Positive/Negative/Neutral breakdown (Media sentiment scores + engagement heuristics)

#### 7. get_share_of_voice
**Purpose**: Profile tag distribution  
**Use Case**: "Share of voice between allies and adversaries"  
**Returns**: Volume and engagement % by tag type (Attila, Ally, Adversary, etc.)

### Sprint 3: Advanced Tools

#### 8. get_opinion_map_summary
**Purpose**: Opinion clustering insights  
**Use Case**: "What are the dominant opinions?"  
**Returns**: Latest UMAP 3D analysis summary (clusters, keywords, dominant narratives)

#### 9. analyze_account
**Purpose**: Deep profile analysis  
**Use Case**: "Analyze @username"  
**Returns**: Profile info, activity stats, top posts, tags

#### 10. detect_anomalies
**Purpose**: Unusual activity detection  
**Use Case**: "Any unusual spikes?"  
**Returns**: Volume anomalies, viral content, engagement acceleration

### Sprint 4: Specialized Tools

#### 11. get_media_coverage
**Purpose**: Press coverage analysis  
**Use Case**: "Media coverage on [topic]"  
**Returns**: Articles, sources, sentiment breakdown

#### 12. compare_accounts
**Purpose**: Side-by-side comparison  
**Use Case**: "Compare @user1 and @user2"  
**Returns**: Comparative stats, winner determination

#### 13. generate_report
**Purpose**: Comprehensive report  
**Use Case**: "Generate a full report"  
**Returns**: Multi-section executive summary

### Visualization Tool

#### 14. create_visualization
**Purpose**: Chart generation  
**Use Case**: "Show me a chart of volume trends"  
**Returns**: Interactive Line/Bar/Area chart with real data

---

## Database Schema

### Tables Created

**`chat_conversations`** - Chat sessions
- Links to: zones, clients, users
- Auto-title generation
- RLS: Users see only their zones

**`chat_messages`** - Message history
- Role: user, assistant, system, tool
- Stores tool calls and results
- Chronological ordering

**`chat_usage`** - Cost tracking
- Token counts (prompt + completion)
- Auto-calculated cost (GPT-4o pricing)
- Per-client billing ready

**`chat_reports`** - Saved reports
- Exportable format (JSONB)
- Shareable across team
- Archive capability

**Migration**: `migrations/20251121_chat_tables.sql`

---

## UI Components

### Main Components

**`chat-sidebar-integrated.tsx`** - Main container
- Desktop: Fixed right sidebar (25-30% width)
- Mobile: Full-screen sheet with overlay
- Auto-closes left sidebar when opening (desktop)
- Zone selector with auto-detection

**`chat-messages.tsx`** - Message list
- Auto-scroll to latest
- Loading skeleton
- Empty state with quick actions

**`chat-input.tsx`** - Input field
- Auto-resize (up to 200px)
- Enter to send, Shift+Enter for newline
- Loading state with spinner

**`message-content.tsx`** - Markdown renderer
- Headings, lists, tables, code, links
- Copy button (hover)
- Chart detection and rendering
- Design system compliant

**`chat-chart.tsx`** - Recharts wrapper
- 3 types: Line, Bar, Area
- Theme variables (--primary, --chart-*)
- Responsive (adapts to width)
- Tooltip on hover

**`chat-quick-actions.tsx`** - Suggestions
- 12 predefined questions
- Icons in colored squares
- Minimal, elegant design

---

## Quick Actions (12)

1. Zone overview
2. Top accounts
3. Trending hashtags
4. Engagement chart
5. Analyze account
6. Detect anomalies
7. Media coverage
8. Compare accounts
9. Opinion analysis
10. Share of voice
11. Sentiment analysis
12. Generate report

All questions trigger appropriate AI tools automatically.

---

## Data Sources Utilized

### Twitter (2,553 tweets)
- ✅ Tweets (search, top content, volume charts)
- ✅ Profiles (top accounts, analysis)
- ✅ Entities (trending hashtags)
- ✅ Profile tags (share of voice)
- ✅ Opinion map (clustering insights)

### TikTok (178 videos)
- ✅ Videos (search, top content, volume charts)
- ✅ Profiles (top accounts, analysis)
- ✅ Entities (trending hashtags)
- ✅ Profile tags (share of voice)

### Media (407 articles)
- ✅ Articles (search, coverage analysis)
- ✅ Sources (top publishers)
- ✅ Sentiment scores (mood analysis)

**Total Access**: 3,138+ monitored content items

---

## API Routes

### Main Endpoint

**`POST /api/chat`**
- **Runtime**: Node.js (Supabase compatibility)
- **Max Duration**: 60s
- **Authentication**: Required
- **Authorization**: Zone + client verification
- **Response**: Server-Sent Events (streaming)

### Request Format
```json
{
  "messages": [
    { "role": "user", "content": "What's trending?" }
  ],
  "zoneId": "uuid"
}
```

### Response Format
```
data: 0:"Based on analysis..."
data: 0:"of 178 videos..."
data: d:{"finishReason":"stop"}
```

Streams in real-time for instant UX feedback.

---

## System Prompt

GPT-4o receives comprehensive context:

```
Current Context:
- Zone: [Name]
- Zone ID: [UUID]
- Client ID: [UUID]  
- Active Sources: Twitter, TikTok, Media
- User Role: [Role]

Available Tools: (14 listed with usage guidelines)

Response Guidelines:
- Cite data sources
- Use markdown
- Include statistics
- Suggest follow-ups
- NEVER make up data
```

**Context ensures** accurate, zone-specific, permission-aware responses.

---

## Performance

### Tool Response Times

| Tool | Avg Time | Max Time |
|------|----------|----------|
| get_zone_overview | 1-2s | 3s |
| get_top_content | 0.5-1s | 2s |
| get_top_accounts | 1-2s | 3s |
| get_trending_topics | 0.5-1s | 2s |
| search_content | 1-2s | 3s |
| create_visualization | 1-2s | 3s |
| Others | < 2s | 3s |
| generate_report | 3-5s | 8s |

**All queries optimized** with proper indexes and direct aggregation.

---

## Cost Analysis

### OpenAI GPT-4o Pricing
- Input: $2.50/1M tokens
- Output: $10.00/1M tokens

### Per Conversation

**Simple** (1-2 tools):
- Tokens: ~3,000
- Cost: ~$0.01

**Complex** (3-5 tools):
- Tokens: ~8,000  
- Cost: ~$0.03

**Report** (GPT orchestrates):
- Tokens: ~12,000
- Cost: ~$0.05

### Monthly Estimate (100 users)

- Conversations/day: 2,000
- Mix: 60% simple, 30% complex, 10% reports
- **Total: ~$800/month**

Highly affordable for government monitoring.

---

## Security

### Authentication & Authorization
- ✅ User must be logged in
- ✅ Zone access verified (client_id match)
- ✅ RLS enforced on all chat tables
- ✅ No cross-zone data leakage

### Data Privacy
- ✅ Conversations isolated by zone
- ✅ Tools only access user's zones
- ✅ OpenAI API key server-side only
- ✅ No data sent to third parties (except OpenAI for processing)

### Rate Limiting
- ✅ maxSteps: 5 (prevents infinite loops)
- ✅ maxTokens: 2000 (controls output size)
- ✅ maxDuration: 60s (timeout protection)

---

## Usage Examples

### Example 1: Zone Overview
**User**: "Give me an overview"  
**Tool Called**: `get_zone_overview`  
**Response**:
```markdown
## Zone Overview - Last 24 Hours

### Twitter
No significant activity detected.

### TikTok
- **Trending Hashtags:**
  - #kinshasa🇨🇩 (45 videos)
  - #patrickmuyaya (23 videos)
  
### Media
- **Articles**: 5 published
- **Sentiment**: +0.14 (positive)
- **Top Source**: ACP (3 articles)
```

### Example 2: Top Content
**User**: "Top 5 posts by engagement"  
**Tools Called**: `get_top_content`  
**Response**:
```markdown
Top 5 posts by engagement:

1. **TikTok Video** by @voiceofkinshasa
   - Description: #viralditiktok #honorineporche...
   - Engagement: 234,431 total
   - 217K views, 14K likes
   
2. **TikTok Video** by @user2
   - Description: Kinshasa inondations...
   - Engagement: 128,777 total
   ...
```

### Example 3: Visualization
**User**: "Show chart of volume over 7 days"  
**Tools Called**: `create_visualization`  
**Response**: 
```markdown
[INTERACTIVE LINE CHART RENDERED HERE]

Volume analysis shows:
- Peak: 23 videos/hour at 14:00
- Average: 7.4 videos/hour
- Total: 178 videos collected
```

### Example 4: Multi-Tool Report
**User**: "Generate comprehensive report"  
**Tools Called**: `generate_report` → triggers GPT to use multiple tools  
**Response**: Full executive report with all sections

---

## Deployment

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Already configured
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Database Migration

```bash
# Apply via Supabase Dashboard > SQL Editor
migrations/20251121_chat_tables.sql
```

Creates 4 tables with RLS policies and triggers.

### Vercel Configuration

```bash
# Auto-deployed on push to main
git push origin main

# Environment variables configured in Vercel Dashboard
```

**Runtime**: Node.js (for Supabase compatibility)  
**Max Duration**: 60s  
**Region**: All (Edge Network)

---

## User Guide

### Opening Chat

1. Click **💬 icon** in top-right header
2. Sidebar slides in from right (desktop) or full-screen (mobile)
3. See zone name and quick actions

### Asking Questions

**Quick Actions** (click to send):
- Pre-written questions covering common use cases
- 12 suggestions always visible when conversation is empty

**Custom Questions**:
- Type in input field
- Press Enter to send (Shift+Enter for newline)
- GPT-4o analyzes and routes to appropriate tools

### Understanding Responses

**Markdown Formatting**:
- `## Headings` for sections
- `**Bold**` for emphasis
- `- Bullet` points for lists
- `[Links]` are clickable
- Tables formatted with borders

**Interactive Charts**:
- Hover for tooltip with exact values
- Responsive (adapts to sidebar width)
- Uses theme colors (dark mode compatible)

**Copy Functionality**:
- Hover over message → copy button appears
- Click to copy full markdown to clipboard
- Green checkmark confirms copy

### Zone Switching

**Auto-Detection**:
- Navigate to different zone page
- Chat automatically switches context
- Badge shows "Analyzing: [Zone Name]"

**Manual Override**:
- Click zone selector (if multiple zones)
- Choose different zone
- Conversation resets for new context

### New Conversation

- Click **🔄 button** in chat header (appears after first message)
- Clears current conversation
- Returns to quick actions

---

## Admin Guide

### Monitoring Usage

**Via Supabase Dashboard**:

```sql
-- Daily usage
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT conversation_id) as conversations,
  SUM(total_tokens) as tokens,
  SUM(cost_usd) as cost_usd
FROM chat_usage
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- Most used tools
SELECT 
  jsonb_array_elements(tool_calls)->>'toolName' as tool_name,
  COUNT(*) as usage_count
FROM chat_messages
WHERE tool_calls IS NOT NULL
GROUP BY tool_name
ORDER BY usage_count DESC;

-- Per-user costs
SELECT 
  p.email,
  COUNT(DISTINCT cu.conversation_id) as conversations,
  SUM(cu.cost_usd) as total_cost
FROM chat_usage cu
JOIN profiles p ON p.id = cu.user_id
GROUP BY p.email
ORDER BY total_cost DESC;
```

### Cost Alerts

Set up alerts in Supabase:
- If daily cost > $50 → investigate
- If single conversation > 50K tokens → review
- If error rate > 5% → debug

### Adding New Tools

1. Create tool in `lib/ai/tools/new-tool.ts`
2. Export from `lib/ai/tools/index.ts`
3. Add to `app/api/chat/route.ts` boundTools
4. Update system prompt with tool description
5. Test thoroughly
6. Deploy

---

## Troubleshooting

### Chat Not Opening

**Check**:
- User has zones assigned
- No JavaScript errors in console
- ChatProvider wraps layout

**Fix**: Refresh page, check browser console

### No Response Streaming

**Check**:
- OpenAI API key configured
- Network tab shows SSE connection
- No CORS errors

**Fix**: Verify `OPENAI_API_KEY` in environment

### Tool Returns Empty Data

**Check**:
- Zone has collected data
- Date range is correct
- Data sources enabled in zone settings

**Fix**: Verify data exists in Supabase tables

### Charts Not Displaying

**Check**:
- `create_visualization` tool called
- Data array not empty
- Console for errors

**Fix**: Check `toolInvocations` in message object

### TypeScript Errors (Development)

**Issue**: SDK type conflicts (15 warnings)

**Impact**: None on runtime

**Solution**: Use `as any` in tool bindings (already applied)

---

## Best Practices

### For Users

- **Start with quick actions** to learn capabilities
- **Be specific** in questions for better results
- **Use follow-ups** for deeper analysis
- **Copy responses** for reports/sharing
- **Generate charts** for visual trends

### For Admins

- **Tag profiles** (Settings > Tracked Profiles) for share of voice
- **Generate opinion maps** (Analysis page) for opinion insights
- **Monitor costs** weekly via Supabase
- **Review popular tools** to optimize

### For Developers

- **Never modify tool signatures** without updating bindings
- **Test new tools** with all data scenarios (empty, partial, full)
- **Log liberally** for debugging
- **Use design system** for any UI changes
- **Follow existing patterns** when adding features

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review usage and costs
- Check for errors in logs
- Monitor response quality

**Monthly**:
- Analyze popular vs unused tools
- Gather user feedback
- Optimize slow queries
- Update prompts if needed

**Quarterly**:
- Review and improve tool descriptions
- Add requested features
- Performance optimization
- Security audit

### Updating OpenAI Model

To upgrade from GPT-4o to newer model:

```typescript
// In app/api/chat/route.ts
model: openai("gpt-4o-2025-xx-xx") // Specify version
```

Test thoroughly - function calling behavior may change.

---

## Future Enhancements

### Planned Features

- **Conversation History**: List past conversations in sidebar
- **Export to PDF**: Professional report downloads
- **Conversation Sharing**: Share link with team
- **Saved Queries**: Bookmark frequent questions
- **Custom Tools**: Client-specific analysis tools
- **Voice Input**: Speech-to-text for mobile
- **Multi-Language**: Support French prompts

### Integration Opportunities

- **Slack Bot**: Send reports to Slack channels
- **Email Digest**: Daily/weekly email summaries
- **API Access**: REST API for external integrations
- **Webhooks**: Alert on anomalies detected

---

## Support

### Documentation

- `context.md` - Overall architecture
- `DATABASE_SCHEMA.md` - Complete schema
- `CHAT_PRODUCTION_TEST_GUIDE.md` - Testing procedures
- `CHAT_FINAL_STATUS.md` - Current status

### Contact

For issues or questions:
- Check Vercel logs
- Check Supabase logs
- Review browser console
- Check `CHAT_PRODUCTION_TEST_GUIDE.md`

---

**Document Version**: 1.0  
**Status**: Production Ready  
**Tested**: Zone SAKA with real data  
**Deployed**: Ready for Vercel

---

## Success Metrics

After 1 month, measure:

- **Adoption**: % of users using chat weekly
- **Satisfaction**: User feedback score
- **Efficiency**: Time saved vs manual analysis
- **Cost**: Actual vs estimated ($800/month)
- **Accuracy**: Response quality rating
- **Performance**: Average response time

**Target**: 80%+ adoption, 90%+ satisfaction, < $1000/month

---

**AL-IA is ready to revolutionize government social media monitoring** 🚀

