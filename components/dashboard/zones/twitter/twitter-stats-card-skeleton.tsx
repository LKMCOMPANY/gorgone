import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading skeleton for TwitterStatsCard
 * Matches the card layout exactly with stagger animation
 */
export function TwitterStatsCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <Card 
      className={cn(
        "p-4 border-border/50 animate-in fade-in-0 duration-500"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="space-y-3">
        {/* Label + Badge */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="size-30" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Value */}
        <div>
          <Skeleton className="size-74" />
        </div>

        {/* Sparkline placeholder */}
        <Skeleton className="h-8 w-full rounded" />
      </div>
    </Card>
  );
}

