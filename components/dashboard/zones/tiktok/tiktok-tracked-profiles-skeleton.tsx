"use client";

/**
 * TikTok Tracked Profiles Loading Skeleton
 */

export function TikTokTrackedProfilesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-muted/30" />
        <div className="h-5 w-96 animate-pulse rounded-lg bg-muted/30" />
      </div>

      {/* Card skeleton */}
      <div className="card-padding rounded-lg border border-border">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted/30" />
          <div className="h-32 w-full animate-pulse rounded-lg bg-muted/30" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-muted/30" />
        </div>
      </div>
    </div>
  );
}

