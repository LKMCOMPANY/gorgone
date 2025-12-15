"use client";

/**
 * Report Content Picker
 * 
 * A single-type content picker for embedding zone data into reports.
 * Supports: tweets, tiktok videos, articles, twitter accounts, tiktok accounts.
 * 
 * Features:
 * - Autocomplete search with debounce (300ms)
 * - Infinite scroll (10 items per load)
 * - Sort options (recent / engagement)
 * - Skeleton loading states
 * - Compact card display with insert overlay
 */

import * as React from "react";
import { useCallback, useState, useEffect, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TweetCard, TweetCardSkeleton, type TweetData } from "@/components/ui/tweet-card";
import { TikTokVideoCard, TikTokVideoCardSkeleton, type TikTokVideoData } from "@/components/ui/tiktok-video-card";
import { ArticleCard, ArticleCardSkeleton, type ArticleData } from "@/components/ui/article-card";
import { AccountCard, AccountCardSkeleton, type AccountData } from "@/components/ui/account-card";
import { XLogo, TikTokLogo } from "@/components/ui/platform-logos";
import {
  Search,
  Loader2,
  Newspaper,
  Plus,
  X,
  User,
  Hash,
  TrendingUp,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type ContentType = "tweet" | "tiktok" | "article" | "twitter_account" | "tiktok_account";

interface ReportContentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoneId: string;
  contentType: ContentType;
  onSelect: (content: TweetData | TikTokVideoData | ArticleData | AccountData) => void;
}

interface AutocompleteResult {
  type: "user" | "keyword" | "source";
  value: string;
  label: string;
  metadata?: {
    profile_picture_url?: string;
    avatar_thumb?: string;
    followers_count?: number;
    follower_count?: number;
    is_verified?: boolean;
  };
}

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;
const MIN_SEARCH_CHARS = 2;

const CONTENT_CONFIG: Record<ContentType, {
  title: string;
  placeholder: string;
  icon: React.ReactNode;
  sortOptions: { value: string; label: string }[];
  defaultSort: string;
}> = {
  tweet: {
    title: "Select Tweet",
    placeholder: "Search tweets or @username...",
    icon: <XLogo className="size-4" />,
    sortOptions: [
      { value: "recent", label: "Most Recent" },
      { value: "most_engagement", label: "Most Engagement" },
    ],
    defaultSort: "recent",
  },
  tiktok: {
    title: "Select TikTok",
    placeholder: "Search videos or @username...",
    icon: <TikTokLogo className="size-4" />,
    sortOptions: [
      { value: "recent", label: "Most Recent" },
      { value: "most_engagement", label: "Most Engagement" },
    ],
    defaultSort: "recent",
  },
  article: {
    title: "Select Article",
    placeholder: "Search articles by title...",
    icon: <Newspaper className="size-4" />,
    sortOptions: [
      { value: "published_at", label: "Most Recent" },
      { value: "social_score", label: "Most Shared" },
    ],
    defaultSort: "published_at",
  },
  twitter_account: {
    title: "Select X Account",
    placeholder: "Search by @username or name...",
    icon: <XLogo className="size-4" />,
    sortOptions: [
      { value: "followers", label: "Most Followers" },
      { value: "engagement", label: "Most Engagement" },
    ],
    defaultSort: "followers",
  },
  tiktok_account: {
    title: "Select TikTok Account",
    placeholder: "Search by @username or name...",
    icon: <TikTokLogo className="size-4" />,
    sortOptions: [
      { value: "followers", label: "Most Followers" },
      { value: "engagement", label: "Most Engagement" },
    ],
    defaultSort: "followers",
  },
};

// ============================================================================
// Debounce utility
// ============================================================================

function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// ============================================================================
// Data Mappers - Transform API responses to card data types
// ============================================================================

interface TweetApiItem {
  id: string;
  tweet_id: string;
  text: string;
  author?: {
    username: string;
    name: string;
    is_verified?: boolean;
    is_blue_verified?: boolean;
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
  author?: {
    username: string;
    nickname: string;
    is_verified?: boolean;
    avatar_thumb: string | null;
  };
  cover_url: string | null;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  share_url?: string;
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

interface TwitterProfileApiItem {
  id: string;
  username: string;
  name: string;
  profile_picture_url: string | null;
  followers_count: number;
  is_verified?: boolean;
  is_blue_verified?: boolean;
  tweet_count: number;
  total_engagement: number;
}

interface TikTokProfileApiItem {
  id: string;
  username: string;
  nickname: string;
  avatar_thumb: string | null;
  follower_count: number;
  is_verified?: boolean;
  video_count: number;
  total_engagement: number;
}

function mapTweetToCard(t: TweetApiItem): TweetData {
  return {
            tweet_id: t.tweet_id,
            text: t.text,
            author_username: t.author?.username || "unknown",
            author_name: t.author?.name || "Unknown",
    author_verified: t.author?.is_verified || t.author?.is_blue_verified,
            author_profile_picture_url: t.author?.profile_picture_url,
            engagement: {
              likes: t.like_count || 0,
              retweets: t.retweet_count || 0,
              replies: t.reply_count || 0,
              views: t.view_count || 0,
            },
            tweet_url: `https://x.com/${t.author?.username}/status/${t.tweet_id}`,
  };
}

function mapTikTokToCard(v: TikTokApiItem): TikTokVideoData {
  return {
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
  };
}

function mapArticleToCard(a: ArticleApiItem): ArticleData {
  return {
            article_id: a.article_id || a.id,
            title: a.title || "Untitled",
            source: a.source_name || "Unknown source",
            body_preview: a.body?.slice(0, 200),
            sentiment: a.sentiment,
            social_score: a.social_score,
            published_at: a.event_registry_date,
            url: a.url,
  };
}

function mapTwitterProfileToAccount(p: TwitterProfileApiItem): AccountData {
  return {
    platform: "twitter",
    username: p.username,
    name: p.name,
    verified: p.is_verified || p.is_blue_verified,
    followers: p.followers_count || 0,
    avatar_url: p.profile_picture_url,
    stats: {
      tweet_count: p.tweet_count || 0,
      total_engagement: p.total_engagement || 0,
    },
    profile_url: `https://x.com/${p.username}`,
  };
}

function mapTikTokProfileToAccount(p: TikTokProfileApiItem): AccountData {
  return {
    platform: "tiktok",
    username: p.username,
    nickname: p.nickname,
    verified: p.is_verified,
    followers: p.follower_count || 0,
    avatar_url: p.avatar_thumb,
    stats: {
      video_count: p.video_count || 0,
      total_engagement: p.total_engagement || 0,
    },
    profile_url: `https://tiktok.com/@${p.username}`,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function ReportContentPicker({
  open,
  onOpenChange,
  zoneId,
  contentType,
  onSelect,
}: ReportContentPickerProps) {
  const config = CONTENT_CONFIG[contentType];
  
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState(config.defaultSort);
  const [results, setResults] = useState<(TweetData | TikTokVideoData | ArticleData | AccountData)[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  
  const observerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Track previous values to detect changes
  const prevOpenRef = useRef(open);
  const prevContentTypeRef = useRef(contentType);
  
  // Reset state when dialog opens or content type changes
  useEffect(() => {
    const isOpening = open && !prevOpenRef.current;
    const typeChanged = contentType !== prevContentTypeRef.current;
    
    if (open && (isOpening || typeChanged)) {
      const newSort = CONTENT_CONFIG[contentType].defaultSort;
      setSearchTerm("");
      setSearchQuery("");
      setSortBy(newSort);
      setResults([]);
      setOffset(0);
      setHasMore(true);
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    }
    
    prevOpenRef.current = open;
    prevContentTypeRef.current = contentType;
  }, [open, contentType]);

  // Fetch content on sort change or search submit (not on open - handled above)
  useEffect(() => {
    if (open && sortBy === CONTENT_CONFIG[contentType].defaultSort) {
      // Initial fetch after reset
      fetchContent(0, true);
    } else if (open) {
      // Subsequent fetches on sort/search change
      fetchContent(0, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, searchQuery]);

  // Fetch content from API
  const fetchContent = useCallback(async (currentOffset: number, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setResults([]);
      setOffset(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("limit", ITEMS_PER_PAGE.toString());
      params.set("offset", currentOffset.toString());

      let endpoint = "";
      
      switch (contentType) {
        case "tweet":
          endpoint = "/api/twitter/feed";
          params.set("zone_id", zoneId);
          params.set("sort_by", sortBy);
          if (searchQuery) {
            params.set("search", searchQuery);
            params.set("search_type", searchQuery.startsWith("@") ? "user" : "keyword");
          }
          break;
          
        case "tiktok":
          endpoint = "/api/tiktok/feed";
          params.set("zone_id", zoneId);
          params.set("sort_by", sortBy);
          if (searchQuery) {
            params.set("search", searchQuery);
            params.set("search_type", searchQuery.startsWith("@") ? "user" : "keyword");
          }
          break;
          
        case "article":
          endpoint = "/api/media/feed";
          params.set("zoneId", zoneId);
          params.set("sortBy", sortBy);
          params.set("page", Math.floor(currentOffset / ITEMS_PER_PAGE + 1).toString());
          if (searchQuery) {
            params.set("search", searchQuery);
          }
          break;
          
        case "twitter_account":
          endpoint = "/api/twitter/profiles";
          params.set("zone_id", zoneId);
          params.set("sort_by", sortBy);
          if (searchQuery) {
            params.set("search", searchQuery.replace("@", ""));
          }
          break;
          
        case "tiktok_account":
          endpoint = "/api/tiktok/profiles";
          params.set("zone_id", zoneId);
          params.set("sort_by", sortBy);
          if (searchQuery) {
            params.set("search", searchQuery.replace("@", ""));
          }
          break;
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch content");
      }

      const data = await response.json();
      
      // Map response to card data
      let mappedResults: (TweetData | TikTokVideoData | ArticleData | AccountData)[] = [];
      
      switch (contentType) {
        case "tweet":
          mappedResults = (data.tweets || []).map(mapTweetToCard);
          break;
        case "tiktok":
          mappedResults = (data.videos || []).map(mapTikTokToCard);
          break;
        case "article":
          mappedResults = (data.articles || []).map(mapArticleToCard);
          break;
        case "twitter_account":
          mappedResults = (data.profiles || []).map(mapTwitterProfileToAccount);
          break;
        case "tiktok_account":
          mappedResults = (data.profiles || []).map(mapTikTokProfileToAccount);
          break;
      }

      if (reset) {
        setResults(mappedResults);
      } else {
        setResults(prev => [...prev, ...mappedResults]);
      }

      setHasMore(mappedResults.length === ITEMS_PER_PAGE);
      setOffset(currentOffset + mappedResults.length);
      
      } catch (error) {
        console.error("Failed to fetch content:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [zoneId, contentType, sortBy, searchQuery]);

  // Load more on scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchContent(offset, false);
    }
  }, [loadingMore, hasMore, loading, offset, fetchContent]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, loadingMore, loadMore]);

  // Autocomplete search
  const debouncedAutocomplete = useCallback(
    debounce(async (term: string) => {
      if (!term || term.length < MIN_SEARCH_CHARS) {
        setAutocompleteResults([]);
        return;
      }

      setAutocompleteLoading(true);
      
      try {
        let endpoint = "";
        switch (contentType) {
          case "tweet":
          case "twitter_account":
            endpoint = `/api/twitter/autocomplete?zone_id=${zoneId}&q=${encodeURIComponent(term)}`;
            break;
          case "tiktok":
          case "tiktok_account":
            endpoint = `/api/tiktok/autocomplete?zone_id=${zoneId}&q=${encodeURIComponent(term)}`;
            break;
          case "article":
            endpoint = `/api/media/autocomplete?zone_id=${zoneId}&q=${encodeURIComponent(term)}`;
            break;
        }

        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.success) {
          // For account pickers, filter to only show users
          let filtered = data.results || [];
          if (contentType === "twitter_account" || contentType === "tiktok_account") {
            filtered = filtered.filter((r: AutocompleteResult) => r.type === "user");
          }
          setAutocompleteResults(filtered);
        }
      } catch (error) {
        console.error("Autocomplete search failed:", error);
      } finally {
        setAutocompleteLoading(false);
      }
    }, DEBOUNCE_DELAY),
    [zoneId, contentType]
  );

  useEffect(() => {
    debouncedAutocomplete(searchTerm);
  }, [searchTerm, debouncedAutocomplete]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowAutocomplete(true);
  };

  const handleSelectAutocomplete = (result: AutocompleteResult) => {
    setSearchTerm(result.value);
    setSearchQuery(result.value);
    setShowAutocomplete(false);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchQuery(searchTerm.trim());
    setShowAutocomplete(false);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchQuery("");
    setShowAutocomplete(false);
  };

  const handleSelect = (content: TweetData | TikTokVideoData | ArticleData | AccountData) => {
    onSelect(content);
    onOpenChange(false);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  // Render card based on content type
  const renderCard = (item: TweetData | TikTokVideoData | ArticleData | AccountData, index: number) => {
    const key = getItemKey(item, index);
    
    return (
      <SelectableItem key={key} onSelect={() => handleSelect(item)}>
        {contentType === "tweet" && <TweetCard tweet={item as TweetData} compact />}
        {contentType === "tiktok" && <TikTokVideoCard video={item as TikTokVideoData} compact />}
        {contentType === "article" && <ArticleCard article={item as ArticleData} compact />}
        {(contentType === "twitter_account" || contentType === "tiktok_account") && (
          <AccountCard account={item as AccountData} compact />
        )}
      </SelectableItem>
    );
  };

  const getItemKey = (item: TweetData | TikTokVideoData | ArticleData | AccountData, index: number): string => {
    if ("tweet_id" in item) return item.tweet_id;
    if ("video_id" in item) return item.video_id;
    if ("article_id" in item) return item.article_id;
    if ("username" in item) return `${item.platform}-${item.username}`;
    return `item-${index}`;
  };

  // Render skeleton loaders
  const renderSkeletons = (count: number = 3) => {
    return Array.from({ length: count }).map((_, i) => (
      <div key={`skeleton-${i}`}>
        {contentType === "tweet" && <TweetCardSkeleton compact />}
        {contentType === "tiktok" && <TikTokVideoCardSkeleton compact />}
        {contentType === "article" && <ArticleCardSkeleton compact />}
        {(contentType === "twitter_account" || contentType === "tiktok_account") && (
          <AccountCardSkeleton compact />
        )}
      </div>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg">
            {config.icon}
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 pt-4 flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {/* Search Bar with Autocomplete */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowAutocomplete(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowAutocomplete(false);
                  }}
                  placeholder={config.placeholder}
                  className="pl-10 pr-10 h-10 transition-shadow duration-[var(--transition-fast)] focus-visible:shadow-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
                {autocompleteLoading && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showAutocomplete && autocompleteResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
                  {autocompleteResults.map((result, index) => (
                    <button
                      key={`${result.type}-${result.value}-${index}`}
                      type="button"
                      onClick={() => handleSelectAutocomplete(result)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors duration-[var(--transition-fast)] text-left"
                    >
                      {result.type === "user" && (result.metadata?.profile_picture_url || result.metadata?.avatar_thumb) ? (
                        <img
                          src={result.metadata.profile_picture_url || result.metadata.avatar_thumb}
                          alt={result.label}
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {result.type === "user" ? (
                            <User className="size-4 text-primary" />
                          ) : (
                            <Hash className="size-4 text-primary" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{result.label}</p>
                          {result.type === "user" && result.metadata?.is_verified && (
                            <svg className="size-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                            </svg>
                          )}
                        </div>
                        {result.type === "user" && (result.metadata?.followers_count || result.metadata?.follower_count) && (
                          <p className="text-xs text-muted-foreground">
                            {(result.metadata.followers_count || result.metadata.follower_count)?.toLocaleString()} followers
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {result.type === "user" ? "User" : result.type === "source" ? "Source" : "Keyword"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 shrink-0">
                <TrendingUp className="size-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config.sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Search Badge */}
          {searchQuery && (
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="gap-2">
                <Search className="size-3" />
                {searchQuery}
                <button
                  onClick={handleClearSearch}
                  className="hover:text-foreground transition-colors"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </div>
          )}

          {/* Results - Scrollable container */}
          <div className="flex-1 min-h-0 -mx-4 sm:-mx-6 overflow-hidden" ref={scrollAreaRef}>
            <ScrollArea className="h-full">
              <div className="space-y-3 px-4 sm:px-6 pb-4">
                {/* Loading State */}
                {loading && renderSkeletons()}

                {/* Results */}
                {!loading && results.length > 0 && (
                  <>
                    {results.map((item, index) => renderCard(item, index))}

                    {/* Infinite Scroll Trigger */}
                    <div ref={observerRef} className="py-4">
                      {loadingMore && (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          <span className="text-sm">Loading more...</span>
                        </div>
                      )}
                      {!loadingMore && !hasMore && results.length > 0 && (
                        <p className="text-center text-sm text-muted-foreground">
                          No more items
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Empty State */}
                {!loading && results.length === 0 && (
                  <EmptyState type={config.title.replace("Select ", "")} />
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

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
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--transition-fast)] rounded-xl cursor-pointer" onClick={onSelect}>
        <Button className="gap-2 shadow-lg" onClick={onSelect}>
          <Plus className="size-4" />
          Insert
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-in fade-in-0">
      <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
        <Search className="size-6 opacity-50" />
      </div>
      <p className="font-medium">No {type.toLowerCase()} found</p>
      <p className="text-xs mt-1">Try a different search term</p>
    </div>
  );
}
