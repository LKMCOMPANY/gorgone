"use client";

import { Card } from "@/components/ui/card";

/**
 * Loading skeleton for Twitter Tracked Profiles tab
 * Elegant shimmer effect matching the actual content structure
 */
export function TwitterTrackedProfilesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 skeleton-shimmer rounded-md" />
        <div className="h-5 w-full max-w-lg skeleton-shimmer rounded-md" />
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="h-16 w-24 flex-shrink-0 skeleton-shimmer rounded-lg"
            />
          ))}
        </div>

        {/* Content Skeleton */}
        <Card className="card-padding space-y-6">
          {/* Description */}
          <div className="space-y-3 pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-6 w-20 skeleton-shimmer rounded-full" />
              <div className="h-4 w-32 skeleton-shimmer rounded-md" />
            </div>
            <div className="h-4 w-full max-w-md skeleton-shimmer rounded-md" />
          </div>

          {/* Add Profile Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-5 w-24 skeleton-shimmer rounded-md" />
              <div className="flex gap-2">
                <div className="h-11 flex-1 skeleton-shimmer rounded-lg" />
                <div className="h-11 w-20 skeleton-shimmer rounded-lg" />
              </div>
              <div className="h-4 w-64 skeleton-shimmer rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-24 skeleton-shimmer rounded-md" />
              <div className="h-24 w-full skeleton-shimmer rounded-lg" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-48 skeleton-shimmer rounded-md" />
                <div className="h-8 w-32 skeleton-shimmer rounded-md" />
              </div>
            </div>
          </div>

          {/* Profiles List */}
          <div className="space-y-3">
            <div className="h-5 w-48 skeleton-shimmer rounded-md" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 w-28 skeleton-shimmer rounded-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

