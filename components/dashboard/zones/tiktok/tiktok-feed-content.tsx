"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TikTokFeedFilters as TikTokFeedFiltersComponent, type TikTokFeedFilters } from "./tiktok-feed-filters";
import { TikTokVideoCard } from "./tiktok-video-card";
import { Loader2 } from "lucide-react";

interface TikTokFeedContentProps {
  zoneId: string;
  initialSearch?: string;
  initialSearchType?: "keyword" | "user";
}

export function TikTokFeedContent({
  zoneId,
  initialSearch,
  initialSearchType,
}: TikTokFeedContentProps) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<TikTokFeedFilters>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const limit = 20;

  // Initialize filters from URL params (SAME AS TWITTER)
  useEffect(() => {
    if (initialSearch || initialSearchType) {
      setFilters({
        search: initialSearch,
        searchType: initialSearchType,
      });
    }
  }, [initialSearch, initialSearchType]);

  // Fetch videos from API (SAME AS TWITTER)
  const fetchVideos = useCallback(async (currentOffset: number) => {
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
    if (filters.profile_tag_type) params.append("profile_tag_type", filters.profile_tag_type);
    if (filters.verified_only) params.append("verified_only", "true");
    if (filters.active_tracking_only) params.append("active_tracking_only", "true");
    if (filters.min_views) params.append("min_views", filters.min_views.toString());
    if (filters.min_likes) params.append("min_likes", filters.min_likes.toString());
    if (filters.min_comments) params.append("min_comments", filters.min_comments.toString());
    if (filters.date_range) params.append("date_range", filters.date_range);
    // Language & Location filters (NEW)
    if (filters.languages && filters.languages.length > 0) params.append("languages", filters.languages.join(","));
    if (filters.locations && filters.locations.length > 0) params.append("locations", filters.locations.join("|"));

    const response = await fetch(`/api/tiktok/feed?${params.toString()}`);
    return await response.json();
  }, [zoneId, filters]);

  // Load initial videos (SAME AS TWITTER)
  const loadInitialVideos = useCallback(async () => {
    try {
      setLoading(true);
      setOffset(0);
      setVideos([]);

      const data = await fetchVideos(0);

      if (data.success) {
        setVideos(data.videos || []);
        setHasMore(data.videos.length === limit);
      } else {
        console.error("Failed to load videos:", data.error);
        setVideos([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load videos:", error);
      setVideos([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchVideos]);

  // Load more videos - infinite scroll (SAME AS TWITTER)
  const loadMoreVideos = useCallback(async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const newOffset = offset + limit;

      const data = await fetchVideos(newOffset);

      if (data.success) {
        const newVideos = data.videos || [];
        setVideos((prev) => [...prev, ...newVideos]);
        setOffset(newOffset);
        setHasMore(newVideos.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, fetchVideos]);

  // Load initial videos when filters change (SAME AS TWITTER)
  useEffect(() => {
    loadInitialVideos();
  }, [loadInitialVideos]);

  // Intersection Observer for infinite scroll (SAME AS TWITTER)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreVideos();
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
  }, [hasMore, loading, loadingMore, loadMoreVideos]);

  function handleFiltersChange(newFilters: TikTokFeedFilters) {
    setFilters(newFilters);
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TikTokFeedFiltersComponent
        zoneId={zoneId}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Results Count (SAME AS TWITTER) */}
      {!loading && videos.length > 0 && (
        <div className="flex items-center justify-between text-body-sm text-muted-foreground">
          <p>
            Showing {videos.length} video{videos.length !== 1 ? 's' : ''}{" "}
            {filters.search && (
              <span>
                for <span className="font-medium text-foreground">&quot;{filters.search}&quot;</span>
              </span>
            )}
          </p>
          {hasMore && (
            <p className="hidden sm:block text-caption">Scroll for more</p>
          )}
        </div>
      )}

      {/* Loading State - Inline Skeletons (SAME AS TWITTER) */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Content skeleton */}
                <div className="px-4 sm:px-6 py-4 space-y-4">
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="h-5 w-16 rounded bg-muted/30" />
                    <div className="h-3 w-24 rounded bg-muted/30" />
                  </div>
                  <div className="flex gap-3 animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-muted/30" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-muted/30" />
                      <div className="h-3 w-24 rounded bg-muted/30" />
                    </div>
                  </div>
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 w-full rounded bg-muted/30" />
                    <div className="h-4 w-3/4 rounded bg-muted/30" />
                  </div>
                  <div className="aspect-video rounded-lg bg-muted/30 animate-pulse" />
                </div>
                {/* Chart skeleton */}
                <div className="p-4 sm:p-6 bg-muted/5 border-t lg:border-t-0 lg:border-l border-border/60">
                  <div className="space-y-3 animate-pulse">
                    <div className="h-6 w-full rounded bg-muted/30" />
                    <div className="h-48 w-full rounded-lg bg-muted/30" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-12 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-body font-semibold">No videos found</p>
              <p className="text-body-sm text-muted-foreground">
                {filters.search 
                  ? `No results for "${filters.search}". Try adjusting your filters.`
                  : "Create monitoring rules to start collecting videos"
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Videos List */}
      {!loading && videos.length > 0 && (
        <>
          <div className="space-y-4">
            {videos.map((video) => (
              <TikTokVideoCard
                key={video.id}
                video={video}
                zoneId={zoneId}
                showEngagementChart={true}
              />
            ))}
          </div>

          {/* Intersection Observer Target (SAME AS TWITTER) */}
          <div ref={observerRef} className="h-20 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading more videos...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
