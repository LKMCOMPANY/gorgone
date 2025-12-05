"use client";

/**
 * TikTok Profiles Loading Skeleton
 * Matches Twitter profiles skeleton
 */

export function TikTokProfilesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Filters skeleton */}
      <div className="card-padding rounded-lg border border-border">
        <div className="flex gap-3">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted/30" />
          <div className="h-10 w-[200px] animate-pulse rounded-lg bg-muted/30" />
          <div className="size-104 animate-pulse rounded-lg bg-muted/30" />
        </div>
      </div>

      {/* Profile cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left side */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex gap-4">
                <div className="size-16 animate-pulse rounded-full bg-muted/30" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 animate-pulse rounded bg-muted/30" />
                  <div className="size-44 animate-pulse rounded bg-muted/30" />
                </div>
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
                <div className="h-10 w-full animate-pulse rounded bg-muted/30" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((k) => (
                    <div key={k} className="h-10 animate-pulse rounded bg-muted/30" />
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

