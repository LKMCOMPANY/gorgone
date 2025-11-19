/**
 * Media Settings Skeleton Component
 * 
 * Loading state for media settings tab.
 * Uses elegant shimmer animation from design system.
 */

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MediaSettingsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-[200px]" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      {/* Rules List Skeleton */}
      <Card className="card-padding">
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-[140px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>

          {/* Rule Items */}
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-[160px]" />
                    <Skeleton className="h-5 w-[60px] rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-sm" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-[100px]" />
                    <Skeleton className="h-3 w-[120px]" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

