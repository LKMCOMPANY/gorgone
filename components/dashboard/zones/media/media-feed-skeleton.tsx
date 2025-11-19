/**
 * Media Feed Skeleton Component
 * 
 * Elegant loading state for media feed.
 * Uses shimmer animation from design system.
 */

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MediaFeedSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in-0 duration-300">
      {/* Filters Sidebar Skeleton */}
      <div className="lg:col-span-1">
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          {/* Search */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-[80px]" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-[70px] rounded-full" />
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Articles Feed Skeleton */}
      <div className="lg:col-span-3 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-9 w-[90px]" />
        </div>

        {/* Article Cards */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-0 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* Image Skeleton */}
                <Skeleton className="w-full sm:w-48 h-48" />

                {/* Content Skeleton */}
                <div className="flex-1 p-4 sm:p-5 space-y-3">
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
    </div>
  );
}

