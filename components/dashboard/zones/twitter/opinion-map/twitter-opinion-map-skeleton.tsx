/**
 * Opinion Map Loading Skeleton - Enhanced
 * Elegant shimmer animation matching the new 2/3 - 1/3 layout
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function TwitterOpinionMapSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Controls skeleton */}
      <Card className="border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-10 w-48" />
          </div>
        </CardContent>
      </Card>

      {/* Main content skeleton - 2/3 + 1/3 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 3D viz + chart (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 3D canvas skeleton */}
          <Card className="border-border">
            <div className="relative h-[600px]">
              <Skeleton className="absolute inset-0" />
              {/* Floating elements to simulate controls */}
              <div className="absolute top-4 right-4 space-y-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
              <div className="absolute bottom-4 left-4">
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>
            </div>
          </Card>

          {/* Chart skeleton */}
          <Card className="border-border">
            <CardHeader className="space-y-1.5">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-[320px] w-full rounded-lg" />
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar skeleton (1/3 width) */}
        <Card className="border-border">
          {/* Tabs skeleton */}
          <div className="border-b border-border">
            <div className="flex h-12">
              <Skeleton className="flex-1 h-full rounded-none" />
              <Skeleton className="flex-1 h-full rounded-none" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="p-4 space-y-4">
            {/* Navigation header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 pb-4 border-b border-border">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-1.5 flex-1" />
              ))}
            </div>

            {/* Main card */}
            <div className="space-y-4">
              <Card className="p-6 space-y-4 border-border">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex flex-wrap gap-1.5">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-6 w-16" />
                    ))}
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </Card>

              {/* Quick nav grid */}
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
