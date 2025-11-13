import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientsTableSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Search bar skeleton */}
        <Skeleton className="h-10 w-full max-w-sm rounded-md" />

        {/* Table rows skeleton - mobile friendly */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:gap-4"
            >
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-[180px]" />
                <Skeleton className="h-3 w-[140px] md:hidden" />
              </div>
              <div className="flex items-center gap-4 md:contents">
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-6 w-[70px] rounded-full" />
                <Skeleton className="hidden h-4 w-[90px] md:block" />
                <Skeleton className="ml-auto h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

