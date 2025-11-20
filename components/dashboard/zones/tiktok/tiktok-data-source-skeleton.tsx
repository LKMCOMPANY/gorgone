"use client";

/**
 * TikTok Data Source Loading Skeleton
 */

export function TikTokDataSourceSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-muted/30" />
        <div className="h-5 w-96 animate-pulse rounded-lg bg-muted/30" />
      </div>

      {/* Rules skeleton */}
      <div className="space-y-3">
        <div className="h-24 w-full animate-pulse rounded-lg bg-muted/30" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-muted/30" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-muted/30" />
      </div>
    </div>
  );
}

