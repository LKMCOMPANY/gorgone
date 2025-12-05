/**
 * Opinion Map Loading Skeleton - Enhanced
 * Elegant shimmer animation matching the 2/3 - 1/3 layout
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function TwitterOpinionMapSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Controls skeleton */}
      <Card className="shadow-sm">
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-10 w-full sm:w-48" />
          </div>
        </CardContent>
      </Card>

      {/* Main content skeleton - 2/3 + 1/3 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 3D viz + chart (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 3D canvas skeleton */}
          <Card className="border-border shadow-xl overflow-hidden">
            <div className="relative h-[600px] bg-gradient-to-br from-background via-background to-muted/10">
              <Skeleton className="absolute inset-0" />
              {/* Floating controls */}
              <div className="absolute top-4 right-4 space-y-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
              {/* Legend */}
              <div className="absolute top-4 left-4">
                <Skeleton className="h-24 w-64 rounded-lg" />
              </div>
              {/* Stats */}
              <div className="absolute bottom-4 left-4">
                <Skeleton className="h-10 w-40 rounded-lg" />
              </div>
              {/* Info */}
              <div className="absolute bottom-4 right-4">
                <Skeleton className="h-20 w-64 rounded-lg" />
              </div>
            </div>
          </Card>

          {/* Chart skeleton */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent>
              {/* Chart area */}
              <Skeleton className="h-[320px] w-full rounded-lg" />
              
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Skeleton className="size-30" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="size-34" />
                  <Skeleton className="size-50" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="size-38" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar skeleton (1/3 width) */}
        <Card className="border-border shadow-sm">
          {/* Tabs skeleton */}
          <div className="border-b border-border">
            <div className="flex h-12">
              <div className="flex-1 flex items-center justify-center gap-2 border-b-2 border-primary">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <div className="flex-1 flex items-center justify-center gap-2">
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="p-4 space-y-4">
            {/* Cluster cards */}
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors duration-150"
                >
                  <Skeleton className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="size-30" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
