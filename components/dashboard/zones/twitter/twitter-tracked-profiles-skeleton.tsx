"use client";

import { Card } from "@/components/ui/card";

/**
 * Loading skeleton for Twitter Tracked Profiles tab
 */
export function TwitterTrackedProfilesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted/50" />
        <div className="h-5 w-full max-w-lg animate-pulse rounded-md bg-muted/30" />
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="h-16 w-24 flex-shrink-0 animate-pulse rounded-md bg-muted/30"
            />
          ))}
        </div>

        {/* Content Skeleton */}
        <Card className="card-padding space-y-6">
          {/* Description */}
          <div className="space-y-3 pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted/50" />
              <div className="h-4 w-32 animate-pulse rounded-md bg-muted/30" />
            </div>
            <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted/20" />
          </div>

          {/* Add Profile Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-5 w-24 animate-pulse rounded-md bg-muted/50" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted/30" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-24 animate-pulse rounded-md bg-muted/50" />
              <div className="h-24 w-full animate-pulse rounded-md bg-muted/30" />
            </div>
          </div>

          {/* Profiles List */}
          <div className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded-md bg-muted/50" />
            <div className="h-32 w-full animate-pulse rounded-md bg-muted/20" />
          </div>
        </Card>
      </div>
    </div>
  );
}

