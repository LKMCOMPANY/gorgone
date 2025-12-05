"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TwitterFeedFilters, type TwitterFeedFilters as Filters } from "./twitter-feed-filters";
import { TwitterFeedCard } from "./twitter-feed-card";
import { TwitterFeedCardSkeleton } from "./twitter-feed-card-skeleton";

interface FeedTweetWithTags extends TwitterTweetWithCluster {
  profile_tags?: TwitterProfileZoneTag[];
}

interface TwitterFeedContentProps {
  zoneId: string;
  initialSearch?: string;
  initialSearchType?: "keyword" | "user";
}

export function TwitterFeedContent({ zoneId, initialSearch, initialSearchType }: TwitterFeedContentProps) {
  const [tweets, setTweets] = useState<FeedTweetWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const limit = 20;

  // Initialize filters from URL params on mount
  useEffect(() => {
    if (initialSearch || initialSearchType) {
      setFilters({
        search: initialSearch,
        searchType: initialSearchType,
      });
    }
  }, [initialSearch, initialSearchType]);

  // Fetch tweets from API
  const fetchTweets = useCallback(async (currentOffset: number) => {
    const params = new URLSearchParams({
      zone_id: zoneId,
      limit: limit.toString(),
      offset: currentOffset.toString(),
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
    if (filters.active_tracking_only) params.append("active_tracking_only", "true");
    if (filters.min_views) params.append("min_views", filters.min_views.toString());
    if (filters.min_retweets) params.append("min_retweets", filters.min_retweets.toString());
    if (filters.min_likes) params.append("min_likes", filters.min_likes.toString());
    if (filters.min_replies) params.append("min_replies", filters.min_replies.toString());
    if (filters.date_range) params.append("date_range", filters.date_range);
    // Language & Location filters (NEW)
    if (filters.languages && filters.languages.length > 0) params.append("languages", filters.languages.join(","));
    if (filters.locations && filters.locations.length > 0) params.append("locations", filters.locations.join("|"));

    const response = await fetch(`/api/twitter/feed?${params.toString()}`);
    return await response.json();
  }, [zoneId, filters]);

  // Load initial tweets
  const loadInitialTweets = useCallback(async () => {
    try {
      setLoading(true);
      setOffset(0);
      setTweets([]);

      const data = await fetchTweets(0);

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
  }, [fetchTweets]);

  // Load more tweets (infinite scroll)
  const loadMoreTweets = useCallback(async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const newOffset = offset + limit;

      const data = await fetchTweets(newOffset);

      if (data.success) {
        const newTweets = data.tweets || [];
        setTweets((prev) => [...prev, ...newTweets]);
        setOffset(newOffset);
        setHasMore(newTweets.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more tweets:", error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, fetchTweets]);

  // Load initial tweets when filters change
  useEffect(() => {
    loadInitialTweets();
  }, [loadInitialTweets]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreTweets();
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
  }, [hasMore, loading, loadingMore, loadMoreTweets]);

  function handleFiltersChange(newFilters: Filters) {
    setFilters(newFilters);
  }

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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {tweets.length} tweet{tweets.length !== 1 ? 's' : ''}{" "}
            {filters.search && (
              <span>
                for <span className="font-medium text-foreground">&quot;{filters.search}&quot;</span>
              </span>
            )}
          </p>
          {hasMore && (
            <p className="hidden sm:block text-xs">Scroll for more</p>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <TwitterFeedCardSkeleton key={item} />
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
              <p className="text-sm text-muted-foreground">
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
        <>
          <div className="space-y-4">
            {tweets.map((tweet) => (
              <TwitterFeedCard
                key={tweet.id}
                tweet={tweet}
                tags={tweet.profile_tags}
                zoneId={zoneId}
                cluster={tweet.cluster}
                clusterConfidence={tweet.cluster_confidence}
              />
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          <div ref={observerRef} className="py-8">
            {loadingMore && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading more tweets...</p>
              </div>
            )}
            {!loadingMore && !hasMore && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No more tweets to load
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

