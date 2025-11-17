"use client";

import { Card } from "@/components/ui/card";

/**
 * Loading skeleton for Twitter Data Source tab
 * Elegant shimmer effect matching the actual content structure
 */
export function TwitterDataSourceSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 skeleton-shimmer rounded-md" />
        <div className="h-5 w-full max-w-md skeleton-shimmer rounded-md" />
      </div>

      {/* Rules List Skeleton */}
      <Card className="card-padding">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 skeleton-shimmer rounded-md" />
            <div className="h-9 w-28 skeleton-shimmer rounded-md" />
          </div>

          {/* Rule Cards */}
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-6 w-16 skeleton-shimmer rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-48 skeleton-shimmer rounded-md" />
                    <div className="h-4 w-32 skeleton-shimmer rounded-md" />
                  </div>
                  <div className="h-8 w-8 skeleton-shimmer rounded-md" />
                </div>

                <div className="h-16 w-full skeleton-shimmer rounded-lg" />

                <div className="flex items-center gap-4">
                  <div className="h-4 w-28 skeleton-shimmer rounded-md" />
                  <div className="h-4 w-32 skeleton-shimmer rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

