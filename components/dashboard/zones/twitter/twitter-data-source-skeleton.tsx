"use client";

import { Card } from "@/components/ui/card";

/**
 * Loading skeleton for Twitter Data Source tab
 * Matches the actual content structure for smooth transition
 */
export function TwitterDataSourceSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted/50" />
        <div className="h-5 w-full max-w-md animate-pulse rounded-md bg-muted/30" />
      </div>

      {/* Rules List Skeleton */}
      <Card className="card-padding">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="h-6 w-40 animate-pulse rounded-md bg-muted/50" />
            <div className="h-9 w-32 animate-pulse rounded-md bg-muted/30" />
          </div>

          {/* Rule Cards */}
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-5 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-muted/50" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-48 animate-pulse rounded-md bg-muted/50" />
                    <div className="h-4 w-32 animate-pulse rounded-md bg-muted/30" />
                  </div>
                  <div className="h-8 w-8 animate-pulse rounded-md bg-muted/30" />
                </div>

                <div className="h-16 w-full animate-pulse rounded-md bg-muted/20" />

                <div className="flex items-center gap-4">
                  <div className="h-4 w-28 animate-pulse rounded-md bg-muted/30" />
                  <div className="h-4 w-32 animate-pulse rounded-md bg-muted/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

