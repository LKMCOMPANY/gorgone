import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TwitterFeedCardSkeleton() {
  return (
    <Card className="max-w-full card-interactive glass overflow-hidden shadow-sm p-0">
      {/* Card Header - Metadata & Context */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/10">
        {/* Left: Tweet Context */}
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-5 w-12 rounded-md bg-muted" />
          <div className="h-3 w-px bg-border/50" />
          <Skeleton className="h-3 w-16 rounded bg-muted" />
        </div>

        {/* Right: App Context */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Tweet Content */}
        <div className="p-4 min-w-0 flex-1">
          <div className="flex gap-3 p-4 rounded-xl bg-background/40 border border-border/40 shadow-sm">
            {/* Avatar */}
            <div className="shrink-0">
              <Skeleton className="size-10 rounded-full bg-muted" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Header: Name, Handle */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24 rounded bg-muted" />
                  <Skeleton className="h-3 w-20 rounded bg-muted" />
                </div>
              </div>

              {/* Text */}
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-full rounded bg-muted" />
                <Skeleton className="h-4 w-[90%] rounded bg-muted" />
                <Skeleton className="h-4 w-[60%] rounded bg-muted" />
              </div>

              {/* Metrics */}
              <div className="flex items-center justify-between pt-2 max-w-md">
                <Skeleton className="h-4 w-8 rounded bg-muted" />
                <Skeleton className="h-4 w-8 rounded bg-muted" />
                <Skeleton className="h-4 w-8 rounded bg-muted" />
                <Skeleton className="h-4 w-8 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Engagement Chart */}
        <div className="p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-border/40">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded bg-muted" />
              <Skeleton className="h-8 w-8 rounded bg-muted" />
            </div>
            <Skeleton className="h-[220px] w-full rounded-lg bg-muted" />
          </div>
        </div>
      </div>

      {/* Card Footer - Cluster Badge */}
      <div className="px-4 sm:px-6 py-3 bg-muted/5 border-t border-border/50">
        <Skeleton className="h-8 w-full rounded-lg bg-muted" />
      </div>
    </Card>
  );
}

