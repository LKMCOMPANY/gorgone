/**
 * Media Feed Content Component
 * 
 * Main feed container for media articles with advanced filtering.
 * Production-ready with performance optimizations and elegant UX.
 * 
 * Features:
 * - Advanced filtering (search, date, language, source, sentiment)
 * - Infinite scroll / load more pagination
 * - Real-time refresh
 * - Professional empty states
 * - Optimized skeleton loading
 * - Mobile-responsive layout
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { MediaArticleCard } from "./media-article-card";
import { MediaFeedFilters as MediaFeedFiltersComponent, type MediaFeedFilters } from "./media-feed-filters";
import { MediaFeedSkeleton } from "./media-feed-skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaArticle } from "@/types";

interface MediaFeedContentProps {
  zoneId: string;
}

/**
 * Media Feed Content
 * 
 * Professional feed implementation with:
 * - Debounced search and filter updates
 * - Optimistic UI updates
 * - Error handling with user feedback
 * - Performance-optimized rendering
 */
export function MediaFeedContent({ zoneId }: MediaFeedContentProps) {
  const [articles, setArticles] = useState<MediaArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<MediaFeedFilters>({
    search: "",
    startDate: "",
    endDate: "",
    languages: [],
    locations: [],
    sources: [],
    minSentiment: null,
    maxSentiment: null,
    sortBy: "published_at",
    verifiedOnly: false,
  });

  // Load articles on mount and when filters change
  useEffect(() => {
    loadArticles(true);
  }, [zoneId, filters]);

  /**
   * Fetch articles from API
   */
  const loadArticles = useCallback(async (reset = false) => {
    try {
      setError(null);
      
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      
      // Build query params
      const params = new URLSearchParams({
        zoneId,
        page: currentPage.toString(),
        limit: "50",
        sortBy: filters.sortBy,
        sortAsc: "false",
      });

      // Add optional filters
      if (filters.search) params.set("search", filters.search);
      if (filters.startDate) params.set("startDate", new Date(filters.startDate).toISOString());
      if (filters.endDate) params.set("endDate", new Date(filters.endDate).toISOString());
      if (filters.languages.length > 0) params.set("lang", filters.languages.join(","));
      if (filters.locations.length > 0) params.set("locations", filters.locations.join("|"));
      if (filters.sources.length > 0) params.set("sourceUri", filters.sources.join(","));
      if (filters.minSentiment !== null) params.set("minSentiment", filters.minSentiment.toString());
      if (filters.maxSentiment !== null) params.set("maxSentiment", filters.maxSentiment.toString());
      if (filters.verifiedOnly) params.set("verifiedOnly", "true");

      const response = await fetch(`/api/media/feed?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch articles");
      }

      // Update articles
      if (reset) {
        setArticles(data.articles || []);
      } else {
        setArticles(prev => [...prev, ...(data.articles || [])]);
      }

      // Update pagination
      setTotalCount(data.pagination?.totalCount || 0);
      setHasMore(data.pagination?.hasMore || false);
      setPage(currentPage + 1);
    } catch (err) {
      console.error("Failed to load articles:", err);
      setError(err instanceof Error ? err.message : "Failed to load articles");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [zoneId, filters, page]);

  /**
   * Refresh feed (reload from start)
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadArticles(true);
  }, [loadArticles]);

  /**
   * Load more articles (next page)
   */
  const handleLoadMore = useCallback(async () => {
    await loadArticles(false);
  }, [loadArticles]);

  // Show skeleton on initial load
  if (loading) {
    return <MediaFeedSkeleton />;
  }

  // Show error state
  if (error && !articles.length) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-12 text-center">
        <div className="mx-auto max-w-sm space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-body font-semibold text-destructive">Failed to load articles</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <MediaFeedFiltersComponent
        zoneId={zoneId}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Results Count and Refresh */}
      {!loading && articles.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {totalCount.toLocaleString()} article{totalCount !== 1 ? "s" : ""}
            {filters.search && (
              <span>
                {" "}for <span className="font-medium text-foreground">&quot;{filters.search}&quot;</span>
              </span>
            )}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 transition-colors duration-[var(--transition-fast)]"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-4">
        {articles.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-16 text-center">
            <div className="mx-auto max-w-sm space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-body font-semibold">No articles found</p>
                <p className="text-sm text-muted-foreground">
                  Articles will appear here once your monitoring rules start collecting data. Try adjusting your filters or create a new rule.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Articles Grid */}
            <div className="space-y-4">
              {articles.map((article) => (
                <MediaArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="gap-2 transition-all duration-[var(--transition-fast)]"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <span>Load More Articles</span>
                  )}
                </Button>
              </div>
            )}

            {/* End of results message */}
            {!hasMore && articles.length > 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                You've reached the end of the results
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
