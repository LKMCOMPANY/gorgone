"use client";

import * as React from "react";
import { ConversationContent } from "@/components/ai/conversation";
import { Message, MessageContent } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Tool } from "@/components/ai/tool";
import { Loader } from "@/components/ai/loader";
import { Actions, ActionButton } from "@/components/ai/actions";
import { ChatChart } from "./chat-chart";
import { TweetCardList, type TweetData } from "@/components/ui/tweet-card";
import { ArticleCardList, type ArticleData } from "@/components/ui/article-card";
import { TikTokVideoCardList, type TikTokVideoData } from "@/components/ui/tiktok-video-card";
import { AccountCardList, type AccountData } from "@/components/ui/account-card";
import { TrendingTopicsList, type TrendingTopicData } from "@/components/ui/trending-topic-card";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

type VisualizationPayload = {
  _type: "visualization";
  chart_type: "line" | "bar" | "area";
  title: string;
  data: Array<{ timestamp: string; value: number; label: string }>;
  config: Record<string, { label: string; color?: string }>;
};

/** Opinion report tweet example */
type TweetExample = {
  tweet_id: string;
  text: string;
  author_username: string;
  author_name: string;
  author_verified: boolean;
  author_profile_picture_url: string | null;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    views: number;
  };
  tweet_url: string;
};

/** Opinion report cluster */
type ClusterData = {
  label: string;
  description: string | null;
  percentage: string;
  sentiment_label: string;
  keywords: string[];
  examples: TweetExample[];
};

/** Opinion report payload from generate_opinion_report tool */
type OpinionReportPayload = {
  _type: "opinion_report";
  available: boolean;
  session: {
    data_period: { display: string };
    total_tweets_analyzed: number;
    total_clusters: number;
  };
  clusters: ClusterData[];
  /** Sentiment evolution chart (optional - only if multiple sessions exist) */
  sentiment_evolution_chart?: VisualizationPayload | null;
  /** Raw sentiment evolution data */
  sentiment_evolution?: Array<{
    date: string;
    avg_sentiment: number;
    positive: number;
    neutral: number;
    negative: number;
    total_tweets: number;
  }>;
};

/** Top content result from get_top_content tool */
type TopContentTweet = {
  tweet_id: string;
  text: string;
  author_username: string;
  author_name: string;
  author_verified: boolean;
  author_profile_picture_url: string | null;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    views: number;
  };
  tweet_url: string;
  created_at: string;
};

type TopContentPayload = {
  _type: "top_content";
  platform: string;
  period: string;
  tweets: TopContentTweet[];
  videos: Array<{
    video_id: string;
    description: string;
    author_username: string;
    author_nickname: string;
    author_verified: boolean;
    engagement: {
      views: number;
      likes: number;
      comments: number;
      shares: number;
    };
    video_url: string;
    created_at: string;
  }>;
  total_results: number;
};

/** Search results payload from search_content tool */
type SearchResultsPayload = {
  _type: "search_results";
  query: string;
  platforms: string[];
  tweets: TopContentTweet[];
  videos: Array<{
    video_id: string;
    description: string;
    author_username: string;
    author_nickname: string;
    author_verified: boolean;
    engagement: {
      views: number;
      likes: number;
      comments: number;
      shares: number;
    };
    video_url: string;
    created_at: string;
  }>;
  articles: Array<{
    article_id: string;
    title: string;
    source: string;
    content: string;
    sentiment: number | null;
    social_score: number | null;
    published_at: string;
    url: string;
  }>;
  total_results: number;
};

/** Media coverage payload from get_media_coverage tool */
type MediaCoveragePayload = {
  _type: "media_coverage";
  found: boolean;
  topic: string;
  period: string;
  total_articles: number;
  sentiment: {
    average: number;
    positive_percent: number;
    negative_percent: number;
    neutral_percent: number;
  };
  top_sources: Array<{ source: string; count: number }>;
  articles: Array<{
    article_id: string;
    title: string;
    source: string;
    body_preview: string;
    sentiment: number | null;
    social_score: number | null;
    published_at: string;
    url: string;
  }>;
  message?: string;
};

/** Top accounts payload from get_top_accounts tool */
type TopAccountsPayload = {
  _type: "top_accounts";
  platform: string;
  period: string;
  sort_by: string;
  accounts: Array<{
    platform: "twitter" | "tiktok";
    username: string;
    name: string;
    nickname?: string;
    verified: boolean;
    followers: number;
    avatar_url: string | null;
    stats: {
      post_count: number;
      total_engagement: number;
      avg_engagement: number;
      total_views?: number;
    };
    profile_url: string;
  }>;
  total_accounts: number;
};

/** Trending topics payload from get_trending_topics tool */
type TrendingTopicsPayload = {
  _type: "trending_topics";
  platform: string;
  period: string;
  topics: Array<{
    hashtag: string;
    platforms: string[];
    counts: Record<string, number>;
    total_count: number;
  }>;
  total_unique: number;
};

/**
 * Safely parse tool result that may be string or object
 * Handles SDK 5.x serialization edge cases and nested structures
 */
function parseToolResult(result: unknown): Record<string, unknown> | null {
  if (!result) return null;
  
  let parsed: unknown = result;
  
  // String that needs parsing
  if (typeof result === "string") {
    try {
      parsed = JSON.parse(result);
    } catch {
      return null;
    }
  }
  
  // Not an object
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  
  const obj = parsed as Record<string, unknown>;
  
  // Check for nested result structure (SDK v5 sometimes wraps results)
  if (obj.result && typeof obj.result === "object") {
    return obj.result as Record<string, unknown>;
  }
  
  // Check for content wrapper
  if (obj.content && typeof obj.content === "object") {
    return obj.content as Record<string, unknown>;
  }
  
  return obj;
}

/**
 * Validate if a parsed result is a valid visualization payload
 */
function isValidVisualization(obj: Record<string, unknown> | null): obj is VisualizationPayload {
  if (!obj) return false;
  
  return (
    obj._type === "visualization" &&
    (obj.chart_type === "line" || obj.chart_type === "bar" || obj.chart_type === "area") &&
    typeof obj.title === "string" &&
    Array.isArray(obj.data)
  );
}

/**
 * Format tool name for display (snake_case → Title Case)
 */
function formatToolName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Extract tool name from SDK v5 type format "tool-{toolName}"
 */
function extractToolNameFromType(type: string | undefined): string {
  if (!type) return "";
  if (type.startsWith("tool-")) {
    return type.slice(5); // Remove "tool-" prefix
  }
  return "";
}

/**
 * Check if a result is a valid opinion report
 */
function isValidOpinionReport(obj: Record<string, unknown> | null): obj is OpinionReportPayload {
  if (!obj) return false;
  return (
    obj._type === "opinion_report" &&
    obj.available === true &&
    Array.isArray(obj.clusters)
  );
}

/**
 * Check if a result is a valid top content payload
 */
function isValidTopContent(obj: Record<string, unknown> | null): obj is TopContentPayload {
  if (!obj) return false;
  return (
    obj._type === "top_content" &&
    Array.isArray(obj.tweets)
  );
}

/**
 * Check if a result is a valid search results payload
 */
function isValidSearchResults(obj: Record<string, unknown> | null): obj is SearchResultsPayload {
  if (!obj) return false;
  return (
    obj._type === "search_results" &&
    Array.isArray(obj.tweets)
  );
}

/**
 * Check if a result is a valid media coverage payload
 */
function isValidMediaCoverage(obj: Record<string, unknown> | null): obj is MediaCoveragePayload {
  if (!obj) return false;
  return (
    obj._type === "media_coverage" &&
    typeof obj.topic === "string"
  );
}

/**
 * Check if a result is a valid top accounts payload
 */
function isValidTopAccounts(obj: Record<string, unknown> | null): obj is TopAccountsPayload {
  if (!obj) return false;
  return (
    obj._type === "top_accounts" &&
    Array.isArray(obj.accounts)
  );
}

/**
 * Check if a result is a valid trending topics payload
 */
function isValidTrendingTopics(obj: Record<string, unknown> | null): obj is TrendingTopicsPayload {
  if (!obj) return false;
  return (
    obj._type === "trending_topics" &&
    Array.isArray(obj.topics)
  );
}

/**
 * Extract minimal intro text when opinion report is rendered
 * This prevents the AI's verbose markdown from overriding the structured UI
 */
function extractMinimalIntro(text: string): string {
  if (!text) return "";
  
  // Remove markdown headers that repeat report content
  const lines = text.split("\n");
  const filteredLines: string[] = [];
  let skipSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines at the start
    if (filteredLines.length === 0 && !trimmed) continue;
    
    // Skip lines that look like they're repeating cluster data
    if (trimmed.match(/^#+\s*(Cluster|Opinion|Report|Overview|Breakdown)/i)) {
      skipSection = true;
      continue;
    }
    
    // Skip numbered cluster items
    if (trimmed.match(/^\d+\.\s+\*\*/)) {
      skipSection = true;
      continue;
    }
    
    // Skip description/sentiment/example lines
    if (trimmed.match(/^-\s+\*\*(Description|Sentiment|Examples|Keywords)/i)) {
      continue;
    }
    
    // Stop skipping when we hit a synthesis/conclusion section
    if (trimmed.match(/^#+\s*(Synthesis|Conclusion|Key Takeaways|Strategic|Recommendations)/i)) {
      skipSection = false;
      filteredLines.push(line);
      continue;
    }
    
    if (!skipSection) {
      filteredLines.push(line);
    }
  }
  
  // Return only the cleaned text (intro + conclusion, no cluster details)
  const result = filteredLines.join("\n").trim();
  
  // If too long, truncate to first and last sections
  if (result.length > 1500) {
    const paragraphs = result.split(/\n\n+/);
    if (paragraphs.length > 3) {
      return [paragraphs[0], "...", paragraphs[paragraphs.length - 1]].join("\n\n");
    }
  }
  
  return result;
}

/**
 * Render opinion report with styled tweet cards
 */
/**
 * Convert tool tweet format to TweetData format
 */
function toTweetData(tweet: TweetExample): TweetData {
  return {
    tweet_id: tweet.tweet_id,
    text: tweet.text,
    author_username: tweet.author_username,
    author_name: tweet.author_name,
    author_verified: tweet.author_verified,
    author_profile_picture_url: tweet.author_profile_picture_url,
    engagement: tweet.engagement,
    tweet_url: tweet.tweet_url,
  };
}

/**
 * Opinion Report View - Renders structured opinion report with TweetCards
 */
function OpinionReportView({ report }: { report: OpinionReportPayload }) {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-lg font-semibold mb-3">Opinion Report</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">
              {report.session.total_tweets_analyzed.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Tweets Analyzed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {report.session.total_clusters}
            </div>
            <div className="text-xs text-muted-foreground">Clusters</div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              {report.session.data_period.display}
            </div>
            <div className="text-xs text-muted-foreground">Period</div>
          </div>
        </div>
      </div>

      {/* Sentiment Evolution Chart (if available) */}
      {report.sentiment_evolution_chart && (
        <div className="rounded-xl border bg-card p-5">
          <ChatChart
            type={report.sentiment_evolution_chart.chart_type}
            title={report.sentiment_evolution_chart.title}
            data={report.sentiment_evolution_chart.data}
            config={report.sentiment_evolution_chart.config}
          />
        </div>
      )}

      {/* Clusters */}
      {report.clusters.map((cluster, idx) => (
        <div key={idx} className="rounded-xl border bg-card p-5 space-y-4">
          {/* Cluster header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-semibold">{cluster.label}</h4>
                <Badge variant="secondary" className="text-xs">
                  {cluster.percentage}%
                </Badge>
                <Badge 
                  variant="outline"
                  className={
                    cluster.sentiment_label === "positive" 
                      ? "border-green-500/50 text-green-600 bg-green-500/10" 
                      : cluster.sentiment_label === "negative"
                      ? "border-red-500/50 text-red-600 bg-red-500/10"
                      : "border-gray-500/50 text-gray-600 bg-gray-500/10"
                  }
                >
                  {cluster.sentiment_label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Full Description - NOT summarized */}
          {cluster.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cluster.description}
            </p>
          )}

          {/* Keywords */}
          {cluster.keywords && cluster.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cluster.keywords.slice(0, 8).map((kw, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal">
                  {kw}
                </Badge>
              ))}
            </div>
          )}

          {/* Tweet examples using TweetCardList */}
          {cluster.examples && cluster.examples.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                Representative Tweets
              </div>
              <TweetCardList
                tweets={cluster.examples.map(toTweetData)}
                compact
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Convert TopContentTweet to TweetData format
 */
function topContentTweetToTweetData(tweet: TopContentTweet): TweetData {
  return {
    tweet_id: tweet.tweet_id,
    text: tweet.text,
    author_username: tweet.author_username,
    author_name: tweet.author_name,
    author_verified: tweet.author_verified,
    author_profile_picture_url: tweet.author_profile_picture_url,
    engagement: tweet.engagement,
    tweet_url: tweet.tweet_url,
  };
}

/**
 * Convert TopContentPayload video to TikTokVideoData
 */
function topContentVideoToTikTokData(video: TopContentPayload["videos"][0]): TikTokVideoData {
  return {
    video_id: video.video_id,
    description: video.description,
    author_username: video.author_username,
    author_nickname: video.author_nickname,
    author_verified: video.author_verified,
    engagement: video.engagement,
    video_url: video.video_url,
    created_at: video.created_at,
  };
}

/**
 * Top Content View - Renders top tweets and TikTok videos
 */
function TopContentView({ content }: { content: TopContentPayload }) {
  const periodLabels: Record<string, string> = {
    "3h": "Last 3 hours",
    "6h": "Last 6 hours",
    "12h": "Last 12 hours",
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Top Content</h3>
          <div className="flex gap-2">
            <Badge variant="secondary">{periodLabels[content.period] || content.period}</Badge>
            <Badge variant="outline">{content.total_results} results</Badge>
          </div>
        </div>
      </div>

      {/* Tweets */}
      {content.tweets.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground px-1">
            Tweets ({content.tweets.length})
          </div>
          <TweetCardList
            tweets={content.tweets.map(topContentTweetToTweetData)}
          />
        </div>
      )}

      {/* TikTok Videos */}
      {content.videos.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground px-1">
            TikTok Videos ({content.videos.length})
          </div>
          <TikTokVideoCardList
            videos={content.videos.map(topContentVideoToTikTokData)}
          />
        </div>
      )}

      {/* Empty state */}
      {content.tweets.length === 0 && content.videos.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">No content found for this period.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Search Results View - Renders search results with TweetCards
 */
function SearchResultsView({ results }: { results: SearchResultsPayload }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Search Results</h3>
          <div className="flex gap-2">
            <Badge variant="secondary">&quot;{results.query}&quot;</Badge>
            <Badge variant="outline">{results.total_results} results</Badge>
          </div>
        </div>
      </div>

      {/* Tweets */}
      {results.tweets.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground px-1">
            Tweets ({results.tweets.length})
          </div>
          <TweetCardList
            tweets={results.tweets.map(topContentTweetToTweetData)}
          />
        </div>
      )}

      {/* TikTok Videos */}
      {results.videos.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground px-1">
            TikTok Videos ({results.videos.length})
          </div>
          <TikTokVideoCardList
            videos={results.videos.map(searchResultVideoToTikTokData)}
          />
        </div>
      )}

      {/* Articles */}
      {results.articles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground px-1">
            Articles ({results.articles.length})
          </div>
          <ArticleCardList
            articles={results.articles.map(searchResultArticleToArticleData)}
          />
        </div>
      )}

      {/* Empty state */}
      {results.tweets.length === 0 && results.videos.length === 0 && results.articles.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">No results found for &quot;{results.query}&quot;.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Convert SearchResultsPayload video to TikTokVideoData
 */
function searchResultVideoToTikTokData(video: SearchResultsPayload["videos"][0]): TikTokVideoData {
  return {
    video_id: video.video_id,
    description: video.description,
    author_username: video.author_username,
    author_nickname: video.author_nickname,
    author_verified: video.author_verified,
    engagement: video.engagement,
    video_url: video.video_url,
    created_at: video.created_at,
  };
}

/**
 * Convert SearchResultsPayload article to ArticleData
 */
function searchResultArticleToArticleData(article: SearchResultsPayload["articles"][0]): ArticleData {
  return {
    article_id: article.article_id,
    title: article.title,
    source: article.source,
    body_preview: article.content,
    sentiment: article.sentiment,
    social_score: article.social_score,
    published_at: article.published_at,
    url: article.url,
  };
}

/**
 * Convert MediaCoverage article to ArticleData
 */
function toArticleData(article: MediaCoveragePayload["articles"][0]): ArticleData {
  return {
    article_id: article.article_id,
    title: article.title,
    source: article.source,
    body_preview: article.body_preview,
    sentiment: article.sentiment,
    social_score: article.social_score,
    published_at: article.published_at,
    url: article.url,
  };
}

/**
 * Media Coverage View - Renders media report with ArticleCards
 */
function MediaCoverageView({ coverage }: { coverage: MediaCoveragePayload }) {
  const periodLabels: Record<string, string> = {
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
  };

  // Get sentiment icon and color
  const getSentimentDisplay = () => {
    if (coverage.sentiment.positive_percent > 60) {
      return { icon: TrendingUp, color: "text-green-500", label: "Positive" };
    }
    if (coverage.sentiment.negative_percent > 30) {
      return { icon: TrendingDown, color: "text-red-500", label: "Negative" };
    }
    return { icon: Minus, color: "text-muted-foreground", label: "Neutral" };
  };

  const sentimentDisplay = getSentimentDisplay();

  if (!coverage.found || coverage.articles.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          {coverage.message || `No media coverage found for "${coverage.topic}".`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Media Coverage Report</h3>
          <div className="flex gap-2">
            <Badge variant="secondary">{periodLabels[coverage.period] || coverage.period}</Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-2xl font-bold text-foreground">{coverage.total_articles}</div>
            <div className="text-xs text-muted-foreground">Total Articles</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center gap-1">
              <sentimentDisplay.icon className={`size-5 ${sentimentDisplay.color}`} />
              <span className="text-2xl font-bold text-foreground">
                {coverage.sentiment.average.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Avg Sentiment</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <div className="text-2xl font-bold text-green-600">{coverage.sentiment.positive_percent}%</div>
            <div className="text-xs text-muted-foreground">Positive</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10">
            <div className="text-2xl font-bold text-red-600">{coverage.sentiment.negative_percent}%</div>
            <div className="text-xs text-muted-foreground">Negative</div>
          </div>
        </div>

        {/* Top Sources */}
        {coverage.top_sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="text-sm font-medium text-muted-foreground mb-2">Top Sources</div>
            <div className="flex flex-wrap gap-2">
              {coverage.top_sources.map((source, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {source.source} ({source.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Articles */}
      {coverage.articles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground px-1">
            Top Articles ({coverage.articles.length})
          </div>
          <ArticleCardList
            articles={coverage.articles.map(toArticleData)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Convert TopAccountsPayload account to AccountData
 */
function toAccountData(account: TopAccountsPayload["accounts"][0]): AccountData {
  return {
    platform: account.platform,
    username: account.username,
    name: account.name,
    nickname: account.nickname,
    verified: account.verified,
    followers: account.followers,
    avatar_url: account.avatar_url,
    stats: {
      post_count: account.stats.post_count,
      total_engagement: account.stats.total_engagement,
      avg_engagement: account.stats.avg_engagement,
      total_views: account.stats.total_views,
    },
    profile_url: account.profile_url,
  };
}

/**
 * Top Accounts View - Renders top influencers with AccountCards
 */
function TopAccountsView({ data }: { data: TopAccountsPayload }) {
  const periodLabels: Record<string, string> = {
    "3h": "Last 3 hours",
    "6h": "Last 6 hours",
    "12h": "Last 12 hours",
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
  };

  const sortLabels: Record<string, string> = {
    engagement: "by Engagement",
    followers: "by Followers",
  };

  if (data.accounts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">No accounts found for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Top Accounts</h3>
          <div className="flex gap-2">
            <Badge variant="secondary">{periodLabels[data.period] || data.period}</Badge>
            <Badge variant="outline">{sortLabels[data.sort_by] || data.sort_by}</Badge>
            <Badge variant="outline">{data.total_accounts} accounts</Badge>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <AccountCardList accounts={data.accounts.map(toAccountData)} />
    </div>
  );
}

/**
 * Convert TrendingTopicsPayload topic to TrendingTopicData
 */
function toTrendingTopicData(topic: TrendingTopicsPayload["topics"][0]): TrendingTopicData {
  return {
    hashtag: topic.hashtag,
    platforms: topic.platforms,
    counts: topic.counts,
    total_count: topic.total_count,
  };
}

/**
 * Trending Topics View - Renders trending hashtags
 */
function TrendingTopicsView({ data }: { data: TrendingTopicsPayload }) {
  const periodLabels: Record<string, string> = {
    "3h": "Last 3 hours",
    "6h": "Last 6 hours",
    "12h": "Last 12 hours",
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
  };

  if (data.topics.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">No trending topics found for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Trending Topics</h3>
          <div className="flex gap-2">
            <Badge variant="secondary">{periodLabels[data.period] || data.period}</Badge>
            <Badge variant="outline">{data.total_unique} unique hashtags</Badge>
          </div>
        </div>
      </div>

      {/* Topics */}
      <div className="rounded-xl border bg-card p-4">
        <TrendingTopicsList topics={data.topics.map(toTrendingTopicData)} />
      </div>
    </div>
  );
}

// Use the return type of useChat from ai/react
interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant" | "data";
  content?: string;
  parts?: Array<{
    type: string;
    text?: string;
    toolName?: string;
    toolCallId?: string;
    args?: Record<string, unknown>;
    result?: unknown;
    state?: string;
  }>;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onQuickAction?: (query: string) => void;
  reload?: () => void;
}

// Helper to extract text content from message parts
function getMessageText(message: ChatMessage): string {
  // Legacy: if message has content string, use it
  if (message.content) {
    return message.content;
  }
  
  // SDK 5.x: extract text from parts
  if (message.parts) {
    return message.parts
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text)
      .join("");
  }
  
  return "";
}

function extractVisualizationFromText(text: string): {
  visualization?: VisualizationPayload;
  cleanedText: string;
} {
  if (!text) return { cleanedText: "" };

  const marker = "VISUALIZATION_JSON:";
  const markerIdx = text.indexOf(marker);
  if (markerIdx === -1) return { cleanedText: text };

  // Find the first ```json fence after the marker.
  const fenceStart = text.indexOf("```json", markerIdx);
  if (fenceStart === -1) return { cleanedText: text };

  const jsonStart = fenceStart + "```json".length;
  const fenceEnd = text.indexOf("```", jsonStart);
  if (fenceEnd === -1) return { cleanedText: text };

  const jsonText = text.slice(jsonStart, fenceEnd).trim();
  try {
    const parsed = JSON.parse(jsonText) as Partial<VisualizationPayload>;
    if (
      parsed &&
      parsed._type === "visualization" &&
      (parsed.chart_type === "line" ||
        parsed.chart_type === "bar" ||
        parsed.chart_type === "area") &&
      typeof parsed.title === "string" &&
      Array.isArray(parsed.data)
    ) {
      // Remove the marker + code block from the displayed text.
      const before = text.slice(0, markerIdx).trimEnd();
      const after = text.slice(fenceEnd + 3).trimStart();
      const cleanedText = [before, after].filter(Boolean).join("\n\n");
      return { visualization: parsed as VisualizationPayload, cleanedText };
    }
  } catch {
    // fall through
  }

  return { cleanedText: text };
}

// Helper to extract tool invocations from message parts
function getToolInvocations(message: ChatMessage): Array<{
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: string;
}> {
  if (message.parts) {
    // SDK v5 uses "tool-${toolName}" as the type, e.g., "tool-generate_opinion_report"
    const toolParts = message.parts
      .filter((part) => {
        const type = part.type;
        return (
          type === "tool-invocation" || 
          type === "tool-result" ||
          type === "dynamic-tool" ||
          type?.startsWith("tool-")  // SDK v5 format: "tool-{toolName}"
        );
      });
    
    return toolParts.map((part) => {
      // Extract tool name from type if not provided directly
      const toolName = part.toolName || extractToolNameFromType(part.type);
      // SDK v5 uses 'output' field, legacy uses 'result'
      const partAny = part as any;
      const result = partAny.output ?? part.result ?? partAny.input;
      // SDK v5 states: input-streaming, input-available, output-available
      // Map to our states: pending, partial-call, result
      const state = part.state === "output-available" ? "result" 
        : part.state === "input-available" ? "partial-call"
        : part.state || "pending";
      return {
        toolName,
        args: partAny.input || part.args || {},
        result,
        state,
      };
    });
  }
  
  // Legacy fallback for toolInvocations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacyInvocations = (message as any).toolInvocations;
  if (Array.isArray(legacyInvocations)) {
    console.log("[DEBUG] Using legacy toolInvocations:", legacyInvocations.length);
    return legacyInvocations;
  }
  
  return [];
}

export function ChatMessages({
  messages,
  isLoading,
  reload,
}: ChatMessagesProps) {
  if (messages.length === 0 && !isLoading) {
    return null;
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <ConversationContent>
      <div className="max-w-3xl mx-auto space-y-6 pb-4">
        {messages.map((message, i) => {
          const isLast = i === messages.length - 1;
          const rawTextContent = getMessageText(message);
          const { visualization, cleanedText } =
            extractVisualizationFromText(rawTextContent);
          const toolInvocations = getToolInvocations(message);
          
          // Skip data messages
          if (message.role === "data") {
            return null;
          }

          // Check if any tool returned a structured UI (to suppress redundant text)
          const hasStructuredUI = toolInvocations.some((tool) => {
            const parsed = parseToolResult(tool.result);
            const hasOutput = tool.state === "result" || tool.state === "output-available";
            return hasOutput && (
              isValidOpinionReport(parsed) || 
              isValidTopContent(parsed) || 
              isValidSearchResults(parsed) || 
              isValidMediaCoverage(parsed) ||
              isValidTopAccounts(parsed) ||
              isValidTrendingTopics(parsed)
            );
          });

          // If structured UI rendered, only show minimal text (first paragraph or short intro)
          const textContent = hasStructuredUI 
            ? extractMinimalIntro(cleanedText)
            : cleanedText;
          
          return (
            <Message key={message.id} from={message.role as "user" | "assistant"}>
              <MessageContent>
                {/* Visualization (text-stream fallback) */}
                {visualization && (
                  <div className="my-4 w-full">
                    <ChatChart
                      type={visualization.chart_type}
                      title={visualization.title}
                      data={visualization.data}
                      config={visualization.config}
                    />
                  </div>
                )}

                {/* Tool Invocations */}
                {toolInvocations.map((tool, idx) => {
                  // Parse tool result (handles string/object edge cases)
                  const parsedResult = parseToolResult(tool.result);
                  
                  // Check if this is a visualization result
                  const hasVisualizationResult = (tool.state === "result" || tool.state === "output-available") && isValidVisualization(parsedResult);
                  if (hasVisualizationResult) {
                    return (
                      <div key={idx} className="my-4 w-full">
                        <ChatChart
                          type={parsedResult.chart_type}
                          title={parsedResult.title}
                          data={parsedResult.data}
                          config={parsedResult.config}
                        />
                      </div>
                    );
                  }

                  // Check if this is an opinion report result
                  const hasOpinionResult = (tool.state === "result" || tool.state === "output-available") && isValidOpinionReport(parsedResult);
                  if (hasOpinionResult) {
                    return (
                      <div key={idx} className="my-4 w-full">
                        <OpinionReportView report={parsedResult} />
                      </div>
                    );
                  }

                  // Check if this is a top content result with tweets
                  const hasTopContentResult = (tool.state === "result" || tool.state === "output-available") && isValidTopContent(parsedResult);
                  if (hasTopContentResult) {
                    return (
                      <div key={idx} className="my-4 w-full">
                        <TopContentView content={parsedResult} />
                      </div>
                    );
                  }

                  // Check if this is a search results with tweets
                  const hasSearchResult = (tool.state === "result" || tool.state === "output-available") && isValidSearchResults(parsedResult);
                  if (hasSearchResult) {
                    return (
                      <div key={idx} className="my-4 w-full">
                        <SearchResultsView results={parsedResult} />
                      </div>
                    );
                  }

                  // Check if this is a media coverage result
                  const hasMediaCoverage = (tool.state === "result" || tool.state === "output-available") && isValidMediaCoverage(parsedResult);
                  if (hasMediaCoverage) {
                    return (
                      <div key={idx} className="my-4 w-full">
                        <MediaCoverageView coverage={parsedResult} />
                      </div>
                    );
                  }

                  // Check if this is a top accounts result
                  const hasTopAccounts = (tool.state === "result" || tool.state === "output-available") && isValidTopAccounts(parsedResult);
                  if (hasTopAccounts) {
                    return (
                      <div key={idx} className="my-4 w-full">
                        <TopAccountsView data={parsedResult} />
                      </div>
                    );
                  }

                  // Check if this is a trending topics result
                  const hasTrendingTopics = (tool.state === "result" || tool.state === "output-available") && isValidTrendingTopics(parsedResult);
                  if (hasTrendingTopics) {
                    return (
                      <div key={idx} className="my-4 w-full">
                        <TrendingTopicsView data={parsedResult} />
                      </div>
                    );
                  }

                  // Skip visualization/opinion report/top content/search/media/accounts/topics tools from displaying as regular tools
                  const isCompletedVisualization = tool.toolName === "create_visualization" && (tool.state === "result" || tool.state === "output-available");
                  if (isCompletedVisualization) {
                    return null;
                  }
                  const isCompletedOpinionReport = tool.toolName === "generate_opinion_report" && (tool.state === "result" || tool.state === "output-available");
                  if (isCompletedOpinionReport) {
                    return null;
                  }
                  const isCompletedTopContent = tool.toolName === "get_top_content" && (tool.state === "result" || tool.state === "output-available");
                  if (isCompletedTopContent) {
                    return null;
                  }
                  const isCompletedSearch = tool.toolName === "search_content" && (tool.state === "result" || tool.state === "output-available");
                  if (isCompletedSearch) {
                    return null;
                  }
                  const isCompletedMediaCoverage = tool.toolName === "get_media_coverage" && (tool.state === "result" || tool.state === "output-available");
                  if (isCompletedMediaCoverage) {
                    return null;
                  }
                  const isCompletedTopAccounts = tool.toolName === "get_top_accounts" && (tool.state === "result" || tool.state === "output-available");
                  if (isCompletedTopAccounts) {
                    return null;
                  }
                  const isCompletedTrendingTopics = tool.toolName === "get_trending_topics" && (tool.state === "result" || tool.state === "output-available");
                  if (isCompletedTrendingTopics) {
                    return null;
                  }

                  // Regular tools - display collapsible details
                  return (
                    <div key={idx} className="my-2">
                      <Tool
                        name={formatToolName(tool.toolName)}
                        status={
                          tool.state === "result"
                            ? "complete"
                            : tool.state === "partial-call"
                              ? "in-progress"
                              : tool.state === "error" 
                                ? "error" 
                                : "pending"
                        }
                        input={tool.args}
                        output={
                          tool.state === "result" && parsedResult ? (
                             <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                               {JSON.stringify(parsedResult, null, 2)}
                             </pre>
                          ) : null
                        }
                        defaultOpen={false}
                      />
                    </div>
                  );
                })}

                {/* Message Content */}
                {textContent && (
                  <>
                    <Response showCopy={false}>
                      {textContent}
                    </Response>
                    
                    {message.role === "assistant" && !isLoading && (
                      <Actions>
                        <ActionButton 
                          label="Copy" 
                          tooltip="Copy to clipboard"
                          icon={<Copy className="size-3.5" />}
                          onClick={() => handleCopy(textContent)} 
                        />
                        {isLast && reload && (
                          <ActionButton 
                            label="Regenerate" 
                            tooltip="Regenerate response"
                            icon={<RefreshCw className="size-3.5" />} 
                            onClick={reload} 
                          />
                        )}
                      </Actions>
                    )}
                  </>
                )}
              </MessageContent>
            </Message>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <Message from="assistant">
            <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
               <Loader size={16} />
               <span>Thinking...</span>
            </div>
          </Message>
        )}
      </div>
    </ConversationContent>
  );
}
