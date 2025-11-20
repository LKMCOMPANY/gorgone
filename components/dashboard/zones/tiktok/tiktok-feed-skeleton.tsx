"use client";

/**
 * TikTok Feed Loading Skeleton
 * Matches Twitter feed skeleton design
 */

export function TikTokFeedSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in-0 duration-300">
      {/* Filters skeleton */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted/30" />
          <div className="h-10 w-[200px] animate-pulse rounded-lg bg-muted/30" />
          <div className="h-10 w-24 animate-pulse rounded-lg bg-muted/30" />
        </div>
      </div>

      {/* Video cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Content side */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-5 w-16 animate-pulse rounded bg-muted/30" />
                  <div className="h-5 w-20 animate-pulse rounded bg-muted/30" />
                </div>
                <div className="h-5 w-5 animate-pulse rounded bg-muted/30" />
              </div>

              {/* Author */}
              <div className="flex gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted/30" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted/30" />
                  <div className="h-3 w-24 animate-pulse rounded bg-muted/30" />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
              </div>

              {/* Video */}
              <div className="aspect-video animate-pulse rounded-lg bg-muted/30" />

              {/* Stats */}
              <div className="flex gap-6 pt-2 border-t border-border/60">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-4 w-12 animate-pulse rounded bg-muted/30" />
                ))}
              </div>
            </div>

            {/* Chart side */}
            <div className="p-4 sm:p-6 bg-muted/5 border-t lg:border-t-0 lg:border-l border-border/60">
              <div className="space-y-3">
                <div className="h-6 w-full animate-pulse rounded bg-muted/30" />
                <div className="h-48 w-full animate-pulse rounded-lg bg-muted/30" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

