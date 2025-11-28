import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function AttilaMonitoringSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((i) => (
        <div key={i} className="relative">
          <div className="absolute top-12 left-8 bottom-0 w-0.5 bg-border -z-10 hidden lg:block" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_40px_1fr] gap-4 items-start">
            {/* Target Skeleton */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
            </Card>

            <div className="hidden lg:block" />

            {/* Response Skeleton */}
            <div className="space-y-4">
              <Card className="p-4 space-y-4 border-l-4 border-primary/20">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-[120px]" />
                    <Skeleton className="h-2 w-[100px]" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
              </Card>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

