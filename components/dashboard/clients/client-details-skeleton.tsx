import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Client info card */}
      <Card className="p-6">
        <div className="space-y-6">
          <Skeleton className="h-7 w-[180px]" />
          
          <div className="space-y-4">
            {/* Name field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-[90px]" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Active status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-[90px]" />
                <Skeleton className="h-3 w-[250px]" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>

            {/* Metadata */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-[60px]" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-[90px]" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Users card */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Skeleton className="h-7 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
            <Skeleton className="h-10 w-[120px] rounded-md" />
          </div>

          {/* User list skeleton */}
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center"
              >
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[160px]" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
                <Skeleton className="h-6 w-[90px] rounded-full" />
                <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

