"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TikTokProfilesFilters, type TikTokProfilesFilters as Filters } from "./tiktok-profiles-filters";
import { TikTokProfileCard } from "./tiktok-profile-card";
import { TikTokProfilesSkeleton } from "./tiktok-profiles-skeleton";
import { Loader2 } from "lucide-react";
import type { TikTokProfileWithStats } from "@/lib/data/tiktok/profiles-stats";

interface TikTokProfilesContentProps {
  zoneId: string;
  initialSearch?: string;
}

export function TikTokProfilesContent({ zoneId, initialSearch }: TikTokProfilesContentProps) {
  const [profiles, setProfiles] = useState<TikTokProfileWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const limit = 20;
  
  // Initialize search from URL (SAME AS TWITTER)
  useEffect(() => {
    if (initialSearch) {
      setFilters({ search: initialSearch });
    }
  }, [initialSearch]);

  // Fetch profiles (SAME AS TWITTER)
  const fetchProfiles = useCallback(async (currentOffset: number) => {
    const params = new URLSearchParams({
      zone_id: zoneId,
      limit: limit.toString(),
      offset: currentOffset.toString(),
    });

    if (filters.search) params.append("search", filters.search);
    if (filters.sort_by) params.append("sort_by", filters.sort_by);
    if (filters.profile_tag_type) params.append("profile_tag_type", filters.profile_tag_type);
    if (filters.verified_only) params.append("verified_only", "true");
    if (filters.min_followers) params.append("min_followers", filters.min_followers.toString());
    if (filters.min_videos) params.append("min_videos", filters.min_videos.toString());

    const response = await fetch(`/api/tiktok/profiles?${params.toString()}`);
    return await response.json();
  }, [zoneId, filters]);

  // Load initial (SAME AS TWITTER)
  const loadInitialProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setOffset(0);
      setProfiles([]);

      const data = await fetchProfiles(0);

      if (data.success) {
        setProfiles(data.profiles || []);
        setHasMore(data.profiles.length === limit);
      } else {
        setProfiles([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setProfiles([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchProfiles]);

  // Load more (SAME AS TWITTER)
  const loadMoreProfiles = useCallback(async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const newOffset = offset + limit;

      const data = await fetchProfiles(newOffset);

      if (data.success) {
        const newProfiles = data.profiles || [];
        setProfiles((prev) => [...prev, ...newProfiles]);
        setOffset(newOffset);
        setHasMore(newProfiles.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more:", error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, fetchProfiles]);

  // Load when filters change (SAME AS TWITTER)
  useEffect(() => {
    loadInitialProfiles();
  }, [loadInitialProfiles]);

  // Intersection Observer (SAME AS TWITTER)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreProfiles();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentRef = observerRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [hasMore, loading, loadingMore, loadMoreProfiles]);

  // Loading skeleton
  if (loading) {
    return <TikTokProfilesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TikTokProfilesFilters zoneId={zoneId} filters={filters} onFiltersChange={setFilters} />

      {/* Results Count */}
      {!loading && profiles.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {profiles.length} profile{profiles.length !== 1 ? "s" : ""}{" "}
            {filters.search && (
              <span>for <span className="font-medium text-foreground">&quot;{filters.search}&quot;</span></span>
            )}
          </p>
          {hasMore && <p className="hidden sm:block text-xs">Scroll for more</p>}
        </div>
      )}

      {/* Empty State */}
      {!loading && profiles.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-12 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-body font-semibold">No profiles found</p>
              <p className="text-sm text-muted-foreground">
                {filters.search ? `No results for "${filters.search}"` : "No profiles have posted videos in this zone yet"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profiles List */}
      {!loading && profiles.length > 0 && (
        <>
          <div className="space-y-4">
            {profiles.map((profile) => (
              <TikTokProfileCard key={profile.id} profile={profile} zoneId={zoneId} />
            ))}
          </div>

          {/* Intersection Observer Target */}
          <div ref={observerRef} className="h-20 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading more profiles...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

