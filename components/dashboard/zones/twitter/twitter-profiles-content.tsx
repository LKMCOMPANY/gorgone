"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TwitterProfilesFilters, type TwitterProfilesFilters as Filters } from "./twitter-profiles-filters";
import { TwitterProfileCard } from "./twitter-profile-card";
import { TwitterProfilesSkeleton } from "./twitter-profiles-skeleton";
import { Loader2 } from "lucide-react";
import type { TwitterProfileWithStats } from "@/lib/data/twitter/profiles";

interface TwitterProfilesContentProps {
  zoneId: string;
  initialSearch?: string;
}

export function TwitterProfilesContent({ zoneId, initialSearch }: TwitterProfilesContentProps) {
  const [profiles, setProfiles] = useState<TwitterProfileWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);
  const limit = 20;
  
  // Initialize search filter from URL params on mount
  useEffect(() => {
    if (initialSearch) {
      setFilters({ search: initialSearch });
    }
  }, [initialSearch]);

  // Fetch profiles from API
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
    if (filters.min_tweets) params.append("min_tweets", filters.min_tweets.toString());

    const response = await fetch(`/api/twitter/profiles?${params.toString()}`);
    return await response.json();
  }, [zoneId, filters]);

  // Load initial profiles
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
        console.error("Failed to load profiles:", data.error);
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

  // Load more profiles (infinite scroll)
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
      console.error("Failed to load more profiles:", error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, fetchProfiles]);

  // Load initial profiles when filters change
  useEffect(() => {
    loadInitialProfiles();
  }, [loadInitialProfiles]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreProfiles();
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
  }, [hasMore, loading, loadingMore, loadMoreProfiles]);

  function handleFiltersChange(newFilters: Filters) {
    setFilters(newFilters);
    // Reset is handled by useEffect dependency on loadInitialProfiles
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TwitterProfilesFilters
        zoneId={zoneId}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Results Count */}
      {!loading && profiles.length > 0 && (
        <div className="flex items-center justify-between text-body-sm text-muted-foreground animate-in fade-in-0 duration-200">
          <p>
            <span className="font-medium text-foreground">{profiles.length}</span> profile{profiles.length !== 1 ? 's' : ''}{" "}
            {filters.search && (
              <span>
                matching <span className="font-medium text-foreground">&quot;{filters.search}&quot;</span>
              </span>
            )}
          </p>
          {hasMore && (
            <p className="hidden sm:block text-caption">Scroll for more</p>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && <TwitterProfilesSkeleton />}

      {/* Empty State */}
      {!loading && profiles.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-12 sm:p-16 text-center animate-in fade-in-0 duration-300">
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
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-body font-semibold">No profiles found</p>
              <p className="text-body-sm text-muted-foreground max-w-sm mx-auto">
                {filters.search || filters.profile_tag_type || filters.verified_only || 
                 filters.min_followers || filters.min_tweets
                  ? "Try adjusting your filters or search criteria to see more results"
                  : "No profiles have been detected yet. Profiles will appear here once tweets are collected."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Cards */}
      {!loading && profiles.length > 0 && (
        <>
          <div className="space-y-4">
            {profiles.map((profile) => (
              <TwitterProfileCard
                key={profile.id}
                profile={profile}
                zoneId={zoneId}
              />
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          <div ref={observerRef} className="py-8">
            {loadingMore && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-body-sm text-muted-foreground">Loading more profiles...</p>
              </div>
            )}
            {!loadingMore && !hasMore && (
              <div className="text-center py-4">
                <p className="text-body-sm text-muted-foreground">
                  No more profiles to load
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

