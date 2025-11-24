/**
 * Media Feed Skeleton Component
 * 
 * Elegant loading state matching new layout (filters top, full-width cards)
 * Consistent with Twitter/TikTok skeleton patterns
 */

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MediaFeedSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Filters Skeleton */}
      <Card className="card-padding space-y-4">
        {/* Search Bar */}
        <Skeleton className="h-11 w-full" />

        {/* Quick Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="ml-auto h-9 w-[180px]" />
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-[150px]" />
        <Skeleton className="h-9 w-[90px]" />
      </div>

      {/* Article Cards */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="overflow-hidden p-0">
            <div className="flex flex-col sm:flex-row">
              {/* Image Skeleton */}
              <Skeleton className="h-48 w-full sm:w-48" />

              {/* Content Skeleton */}
              <div className="flex-1 space-y-3 p-4 sm:p-5">
                {/* Source + Sentiment */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-5 w-[50px] rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-[70px] rounded-full" />
                </div>

                {/* Title */}
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />

                {/* Excerpt */}
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-3 w-[100px]" />
                  <Skeleton className="h-8 w-[120px]" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
