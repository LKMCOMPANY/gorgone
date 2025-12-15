"use client";

/**
 * Content Picker for Report Editor
 * Allows users to search and select real content from the zone to embed in reports
 */

import * as React from "react";
import { useCallback, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TweetCard, type TweetData } from "@/components/ui/tweet-card";
import { TikTokVideoCard, type TikTokVideoData } from "@/components/ui/tiktok-video-card";
import { ArticleCard, type ArticleData } from "@/components/ui/article-card";
import type { AccountData } from "@/components/ui/account-card";
import {
  Search,
  Loader2,
  Twitter,
  Video,
  Newspaper,
  Users,
  Plus,
} from "lucide-react";

type ContentType = "tweet" | "tiktok" | "article" | "account";

interface ReportContentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoneId: string;
  contentType: ContentType;
  onSelect: (content: TweetData | TikTokVideoData | ArticleData | AccountData) => void;
}

// Type for API response items - matching actual API response format
interface TweetApiItem {
  id: string;
  tweet_id: string;
  text: string;
  author: {
    username: string;
    name: string;
    is_verified: boolean;
    profile_picture_url: string | null;
  };
  like_count: number;
  retweet_count: number;
  reply_count: number;
  view_count: number;
  twitter_created_at: string;
}

interface TikTokApiItem {
  id: string;
  video_id: string;
  description: string;
  author: {
    username: string;
    nickname: string;
    is_verified: boolean;
    avatar_thumb: string | null;
  };
  cover_url: string | null;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  share_url: string;
  tiktok_created_at: string;
}

interface ArticleApiItem {
  id: string;
  article_id: string;
  title: string;
  source_name: string;
  body: string;
  sentiment: number | null;
  social_score: number | null;
  event_registry_date: string;
  url: string;
}

export function ReportContentPicker({
  open,
  onOpenChange,
  zoneId,
  contentType,
  onSelect,
}: ReportContentPickerProps) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<{
    tweets: TweetData[];
    tiktoks: TikTokVideoData[];
    articles: ArticleData[];
    accounts: AccountData[];
  }>({
    tweets: [],
    tiktoks: [],
    articles: [],
    accounts: [],
  });
  const [activeTab, setActiveTab] = useState<ContentType>(contentType);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch content based on search
  const fetchContent = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/zones/${zoneId}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchQuery,
            platforms: ["twitter", "tiktok", "media"],
            limit: 20,
          }),
        });

        if (!response.ok) {
          // Search endpoint not available, show empty results
          setHasSearched(true);
          return;
        }

        const data = await response.json();
        
        setResults({
          tweets: (data.tweets || []).map((t: TweetApiItem): TweetData => ({
            tweet_id: t.tweet_id,
            text: t.text,
            author_username: t.author?.username || "unknown",
            author_name: t.author?.name || "Unknown",
            author_verified: t.author?.is_verified,
            author_profile_picture_url: t.author?.profile_picture_url,
            engagement: {
              likes: t.like_count,
              retweets: t.retweet_count,
              replies: t.reply_count,
              views: t.view_count,
            },
            tweet_url: `https://x.com/${t.author?.username}/status/${t.tweet_id}`,
          })),
          tiktoks: (data.videos || []).map((v: TikTokApiItem): TikTokVideoData => ({
            video_id: v.video_id,
            description: v.description,
            author_username: v.author?.username || "unknown",
            author_nickname: v.author?.nickname || "Unknown",
            author_verified: v.author?.is_verified,
            cover_url: v.cover_url,
            engagement: {
              views: v.play_count,
              likes: v.digg_count,
              comments: v.comment_count,
              shares: v.share_count,
            },
            video_url: v.share_url || `https://tiktok.com/@${v.author?.username}/video/${v.video_id}`,
            created_at: v.tiktok_created_at,
          })),
          articles: (data.articles || []).map((a: ArticleApiItem): ArticleData => ({
            article_id: a.article_id,
            title: a.title,
            source: a.source_name,
            body_preview: a.body?.slice(0, 200),
            sentiment: a.sentiment,
            social_score: a.social_score,
            published_at: a.event_registry_date,
            url: a.url,
          })),
          accounts: [],
        });
        setHasSearched(true);
      } catch (error) {
        console.error("Search failed:", error);
        setHasSearched(true);
      }
    });
  }, [zoneId]);

  // Fetch latest content without search
  const fetchLatestContent = useCallback(async () => {
    startTransition(async () => {
      try {
        // Fetch tweets - correct endpoint with zone_id as query param
        const tweetsRes = await fetch(`/api/twitter/feed?zone_id=${zoneId}&limit=10&sort_by=recent`);
        const tweetsData = tweetsRes.ok ? await tweetsRes.json() : { tweets: [] };

        // Fetch TikTok - correct endpoint with zone_id as query param
        const tiktokRes = await fetch(`/api/tiktok/feed?zone_id=${zoneId}&limit=10&sort_by=recent`);
        const tiktokData = tiktokRes.ok ? await tiktokRes.json() : { videos: [] };

        // Fetch articles - correct endpoint with zoneId as query param (camelCase)
        const articlesRes = await fetch(`/api/media/feed?zoneId=${zoneId}&limit=10`);
        const articlesData = articlesRes.ok ? await articlesRes.json() : { articles: [] };

        setResults({
          tweets: (tweetsData.tweets || []).map((t: TweetApiItem): TweetData => ({
            tweet_id: t.tweet_id,
            text: t.text,
            author_username: t.author?.username || "unknown",
            author_name: t.author?.name || "Unknown",
            author_verified: t.author?.is_verified,
            author_profile_picture_url: t.author?.profile_picture_url,
            engagement: {
              likes: t.like_count || 0,
              retweets: t.retweet_count || 0,
              replies: t.reply_count || 0,
              views: t.view_count || 0,
            },
            tweet_url: `https://x.com/${t.author?.username}/status/${t.tweet_id}`,
          })),
          tiktoks: (tiktokData.videos || []).map((v: TikTokApiItem): TikTokVideoData => ({
            video_id: v.video_id,
            description: v.description,
            author_username: v.author?.username || "unknown",
            author_nickname: v.author?.nickname || "Unknown",
            author_verified: v.author?.is_verified,
            cover_url: v.cover_url,
            engagement: {
              views: v.play_count || 0,
              likes: v.digg_count || 0,
              comments: v.comment_count || 0,
              shares: v.share_count || 0,
            },
            video_url: v.share_url || `https://tiktok.com/@${v.author?.username}/video/${v.video_id}`,
            created_at: v.tiktok_created_at,
          })),
          articles: (articlesData.articles || []).map((a: ArticleApiItem): ArticleData => ({
            article_id: a.article_id || a.id,
            title: a.title,
            source: a.source_name,
            body_preview: a.body?.slice(0, 200),
            sentiment: a.sentiment,
            social_score: a.social_score,
            published_at: a.event_registry_date,
            url: a.url,
          })),
          accounts: [],
        });
        setHasSearched(true);
      } catch (error) {
        console.error("Failed to fetch content:", error);
      }
    });
  }, [zoneId]);

  // Load initial content when dialog opens
  React.useEffect(() => {
    if (open && !hasSearched) {
      fetchLatestContent();
    }
  }, [open, hasSearched, fetchLatestContent]);

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setHasSearched(false);
    }
  }, [open]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContent(search);
  };

  const handleSelect = (content: TweetData | TikTokVideoData | ArticleData | AccountData) => {
    onSelect(content);
    onOpenChange(false);
  };

  const getTabIcon = (type: ContentType) => {
    switch (type) {
      case "tweet": return <Twitter className="size-4" />;
      case "tiktok": return <Video className="size-4" />;
      case "article": return <Newspaper className="size-4" />;
      case "account": return <Users className="size-4" />;
    }
  };

  const getTabLabel = (type: ContentType) => {
    switch (type) {
      case "tweet": return "Tweets";
      case "tiktok": return "TikTok";
      case "article": return "Articles";
      case "account": return "Accounts";
    }
  };

  const getResultCount = (type: ContentType) => {
    switch (type) {
      case "tweet": return results.tweets.length;
      case "tiktok": return results.tiktoks.length;
      case "article": return results.articles.length;
      case "account": return results.accounts.length;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            {getTabIcon(contentType)}
            Select Content to Embed
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4 flex flex-col gap-4 flex-1 min-h-0">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search content by keyword..."
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </form>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="w-full justify-start">
              {(["tweet", "tiktok", "article"] as ContentType[]).map((type) => (
                <TabsTrigger key={type} value={type} className="gap-2">
                  {getTabIcon(type)}
                  <span className="hidden sm:inline">{getTabLabel(type)}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 ml-1">
                    {getResultCount(type)}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {/* Tweets Tab */}
              <TabsContent value="tweet" className="mt-0 space-y-3">
                {isPending ? (
                  <LoadingState />
                ) : results.tweets.length === 0 ? (
                  <EmptyState type="tweets" />
                ) : (
                  results.tweets.map((tweet) => (
                    <SelectableItem
                      key={tweet.tweet_id}
                      onSelect={() => handleSelect(tweet)}
                    >
                      <TweetCard tweet={tweet} compact />
                    </SelectableItem>
                  ))
                )}
              </TabsContent>

              {/* TikTok Tab */}
              <TabsContent value="tiktok" className="mt-0 space-y-3">
                {isPending ? (
                  <LoadingState />
                ) : results.tiktoks.length === 0 ? (
                  <EmptyState type="TikTok videos" />
                ) : (
                  results.tiktoks.map((video) => (
                    <SelectableItem
                      key={video.video_id}
                      onSelect={() => handleSelect(video)}
                    >
                      <TikTokVideoCard video={video} compact />
                    </SelectableItem>
                  ))
                )}
              </TabsContent>

              {/* Articles Tab */}
              <TabsContent value="article" className="mt-0 space-y-3">
                {isPending ? (
                  <LoadingState />
                ) : results.articles.length === 0 ? (
                  <EmptyState type="articles" />
                ) : (
                  results.articles.map((article) => (
                    <SelectableItem
                      key={article.article_id}
                      onSelect={() => handleSelect(article)}
                    >
                      <ArticleCard article={article} compact />
                    </SelectableItem>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Selectable wrapper component
function SelectableItem({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <div className="group relative">
      <div className="pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
        <Button onClick={onSelect} className="gap-2">
          <Plus className="size-4" />
          Insert in Report
        </Button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="size-6 animate-spin mr-2" />
      Loading content...
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Search className="size-8 mb-2 opacity-50" />
      <p>No {type} found</p>
      <p className="text-xs mt-1">Try a different search term</p>
    </div>
  );
}

