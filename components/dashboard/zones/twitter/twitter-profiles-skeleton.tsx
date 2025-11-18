import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for Twitter Profiles tab
 * Elegant shimmer effect matching the actual profile cards structure
 * Follows app-wide skeleton patterns for consistency
 */
export function TwitterProfilesSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in-0 duration-300">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          {/* Tags Header - Only show on some cards for variety */}
          {i % 2 === 0 && (
            <div className="px-4 sm:px-6 py-3 border-b border-border/60 bg-muted/20">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          )}

          {/* Content Area - 50/50 Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Side - Profile Data */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 flex-shrink-0 rounded-full" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>

              {/* Bio URL */}
              <Skeleton className="h-4 w-48" />

              {/* Meta Info */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-44" />
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div
                    key={j}
                    className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
                  >
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Statistics Tabs */}
            <div className="border-t lg:border-t-0 lg:border-l border-border/60 p-4 sm:p-6 bg-muted/5">
              {/* Tabs */}
              <div className="mb-4 grid grid-cols-3 gap-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>

              {/* Stats Content */}
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, k) => (
                  <div key={k} className="flex items-center justify-between py-2 border-b border-border/30">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

