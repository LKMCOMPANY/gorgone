"use client";

/**
 * TikTok Profiles Loading Skeleton
 * Matches Twitter profiles skeleton
 */

export function TikTokProfilesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Filters skeleton */}
      <div className="p-4 rounded-lg border border-border">
        <div className="flex gap-3">
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted/30" />
          <div className="h-9 w-[200px] animate-pulse rounded-lg bg-muted/30" />
          <div className="size-9 animate-pulse rounded-lg bg-muted/30" />
        </div>
      </div>

      {/* Profile cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border overflow-hidden">
          {/* Header skeleton */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="h-7 w-24 animate-pulse rounded bg-muted/30" />
              <div className="h-7 w-24 animate-pulse rounded bg-muted/30" />
            </div>
            <div className="h-7 w-20 animate-pulse rounded bg-muted/30" />
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left side */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex gap-4">
                <div className="size-16 animate-pulse rounded-full bg-muted/30" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 animate-pulse rounded bg-muted/30" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted/30" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-16 animate-pulse rounded-lg bg-muted/30" />
                ))}
              </div>
            </div>
            {/* Right side */}
            <div className="p-4 sm:p-6 bg-muted/5 border-t lg:border-t-0 lg:border-l border-border/60">
              <div className="space-y-3">
                <div className="h-9 w-full animate-pulse rounded bg-muted/30" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((k) => (
                    <div key={k} className="h-8 animate-pulse rounded bg-muted/30" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

