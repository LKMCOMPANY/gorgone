"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for Twitter Tracked Profiles tab
 * Elegant shimmer effect matching the actual content structure
 */
export function TwitterTrackedProfilesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton
              key={i}
              className="h-[76px] w-[110px] flex-shrink-0 rounded-xl"
            />
          ))}
        </div>

        {/* Content Skeleton */}
        <Card className="card-padding min-h-[400px] space-y-6">
          {/* Add Profile Form */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            </div>
            
            {/* Bulk Import */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-[60px] flex-1" />
                <Skeleton className="h-[60px] w-20" />
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50 my-6" />

          {/* Profiles List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-32 rounded-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

