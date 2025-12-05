import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientDetailsSkeleton() {
  return (
    <div className="space-y-6 animate-in" style={{ animationDelay: "50ms" }}>
      {/* Client Information Card */}
      <Card className="card-padding">
        <div className="space-y-6">
          {/* Section title */}
          <Skeleton className="h-7 w-[180px]" />
          
          <div className="space-y-4">
            {/* Client name field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-[90px]" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Active status toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-3 w-[280px]" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>

            {/* Metadata (Created / Updated) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Skeleton className="h-3 w-[60px]" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-[90px]" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Users Management Card */}
      <Card className="card-padding">
        <div className="space-y-6">
          {/* Header with title and add button */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Skeleton className="h-7 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
            <Skeleton className="h-10 w-[120px]" />
          </div>

          {/* User list skeleton */}
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center"
              >
                {/* Avatar */}
                <Skeleton className="size-10 shrink-0 rounded-full" />
                
                {/* User info */}
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[160px]" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
                
                {/* Role badge */}
                <Skeleton className="h-6 w-[90px] rounded-full" />
                
                {/* Actions menu */}
                <Skeleton className="size-8 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

