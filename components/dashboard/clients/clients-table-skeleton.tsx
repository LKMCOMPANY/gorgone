import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientsTableSkeleton() {
  return (
    <Card className="card-padding">
      <div className="space-y-5">
        {/* Search bar skeleton */}
        <Skeleton className="h-10 w-full max-w-sm" />

        {/* Table header skeleton - desktop only */}
        <div className="hidden items-center gap-4 border-b pb-3 md:flex">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[70px]" />
        </div>

        {/* Table rows skeleton */}
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:gap-4"
            >
              {/* Client name */}
              <div className="w-full flex-1 space-y-2 md:w-[200px]">
                <Skeleton className="h-5 w-[160px]" />
                <Skeleton className="h-3 w-[120px] md:hidden" />
              </div>

              {/* Stats and actions */}
              <div className="flex items-center gap-4 md:contents">
                {/* Users count */}
                <div className="w-[100px]">
                  <Skeleton className="h-4 w-[70px]" />
                </div>

                {/* Status badge */}
                <div className="w-[80px]">
                  <Skeleton className="h-6 w-[60px] rounded-full" />
                </div>

                {/* Created date - desktop only */}
                <div className="hidden w-[100px] md:block">
                  <Skeleton className="h-4 w-[80px]" />
                </div>

                {/* Actions menu */}
                <div className="ml-auto w-[60px]">
                  <Skeleton className="ml-auto size-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

