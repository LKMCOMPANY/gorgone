"use client";

import { useState, useEffect } from "react";
import { TwitterFeedFilters, type TwitterFeedFilters as Filters } from "./twitter-feed-filters";
import { TwitterFeedCard } from "./twitter-feed-card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import type { TwitterTweetWithProfile, TwitterProfileZoneTag } from "@/types";

interface FeedTweetWithTags extends TwitterTweetWithProfile {
  profile_tags?: TwitterProfileZoneTag[];
}

interface TwitterFeedContentProps {
  zoneId: string;
}

export function TwitterFeedContent({ zoneId }: TwitterFeedContentProps) {
  const [tweets, setTweets] = useState<FeedTweetWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  // Fetch tweets when filters or offset change
  useEffect(() => {
    loadTweets();
  }, [zoneId, filters, offset]);

  async function loadTweets() {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams({
        zone_id: zoneId,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (filters.search) {
        params.append("search", filters.search);
        params.append("search_type", filters.searchType || "keyword");
      }
      if (filters.sort_by) params.append("sort_by", filters.sort_by);
      if (filters.post_type) params.append("post_type", filters.post_type);
      if (filters.profile_tag_type) params.append("profile_tag_type", filters.profile_tag_type);
      if (filters.has_links) params.append("has_links", "true");
      if (filters.verified_only) params.append("verified_only", "true");
      if (filters.min_views) params.append("min_views", filters.min_views.toString());
      if (filters.min_retweets) params.append("min_retweets", filters.min_retweets.toString());
      if (filters.min_likes) params.append("min_likes", filters.min_likes.toString());
      if (filters.min_replies) params.append("min_replies", filters.min_replies.toString());
      if (filters.date_range) params.append("date_range", filters.date_range);

      const response = await fetch(`/api/twitter/feed?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTweets(data.tweets || []);
        setHasMore(data.tweets.length === limit);
      } else {
        console.error("Failed to load tweets:", data.error);
        setTweets([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load tweets:", error);
      setTweets([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  function handleFiltersChange(newFilters: Filters) {
    setFilters(newFilters);
    setOffset(0); // Reset to first page when filters change
  }

  function handlePreviousPage() {
    if (offset >= limit) {
      setOffset(offset - limit);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleNextPage() {
    if (hasMore) {
      setOffset(offset + limit);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TwitterFeedFilters
        zoneId={zoneId}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Results Count */}
      {!loading && tweets.length > 0 && (
        <div className="flex items-center justify-between text-body-sm text-muted-foreground">
          <p>
            Showing {offset + 1} - {offset + tweets.length} tweets{" "}
            {filters.search && (
              <span>
                for <span className="font-medium text-foreground">&quot;{filters.search}&quot;</span>
              </span>
            )}
          </p>
          <p className="hidden sm:block">Page {currentPage}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-4 border-b border-border/60 bg-muted/20 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-16 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-muted animate-pulse" />
                  <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && tweets.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 sm:p-16 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-body font-semibold">No tweets found</p>
              <p className="text-body-sm text-muted-foreground">
                {filters.search || filters.post_type || filters.has_links || filters.verified_only || filters.profile_tag_type || 
                 filters.min_views || filters.min_retweets || filters.min_likes || filters.min_replies
                  ? "Try adjusting your filters or search criteria"
                  : "No tweets have been collected yet. Check your monitoring rules in settings."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feed Cards */}
      {!loading && tweets.length > 0 && (
        <div className="space-y-4">
          {tweets.map((tweet) => (
            <TwitterFeedCard
              key={tweet.id}
              tweet={tweet}
              tags={tweet.profile_tags}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && tweets.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={offset === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-body-sm text-muted-foreground">
              Page {currentPage}
            </span>
          </div>

          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={!hasMore}
            className="gap-2"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Load More Button (Alternative to Pagination) */}
      {!loading && tweets.length > 0 && hasMore && offset === 0 && (
        <div className="flex justify-center pt-4">
          <Button onClick={handleNextPage} variant="outline" className="gap-2">
            Load more tweets
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

