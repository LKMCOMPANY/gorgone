/**
 * Opinion Map Loading Skeleton
 * Following Gorgone V2 skeleton pattern with elegant shimmer
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function TwitterOpinionMapSkeleton() {
  return (
    <div className="space-y-6">
      {/* Controls skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-32 skeleton-shimmer rounded-md" />
            <div className="h-10 w-32 skeleton-shimmer rounded-md" />
            <div className="h-10 w-40 skeleton-shimmer rounded-md" />
          </div>
        </CardContent>
      </Card>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: 3D viz + chart */}
        <div className="lg:col-span-3 space-y-6">
          {/* 3D canvas skeleton */}
          <Card>
            <div className="h-[600px] skeleton-shimmer" />
          </Card>

          {/* Chart skeleton */}
          <Card>
            <CardHeader>
              <div className="h-6 w-48 skeleton-shimmer rounded-md" />
              <div className="h-4 w-64 skeleton-shimmer rounded-md mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] skeleton-shimmer rounded-lg" />
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar skeleton */}
        <Card>
          <div className="p-4 space-y-4">
            <div className="h-10 w-full skeleton-shimmer rounded-md" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 skeleton-shimmer rounded-lg" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

