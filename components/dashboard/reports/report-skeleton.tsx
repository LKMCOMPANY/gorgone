"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Shimmer skeleton component for elegant loading states
function SkeletonShimmer({ 
  className, 
  style 
}: { 
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={cn("skeleton-shimmer rounded", className)} style={style} />;
}

export function ReportListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card 
          key={i} 
          className="overflow-hidden"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex items-center gap-4 p-4">
            {/* Icon placeholder */}
            <SkeletonShimmer className="size-10 rounded-lg shrink-0" />
            
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonShimmer className="h-5 w-48" />
                <SkeletonShimmer className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonShimmer className="h-3 w-24" />
                <SkeletonShimmer className="h-3 w-20" />
                <SkeletonShimmer className="h-3 w-16" />
              </div>
            </div>
            
            {/* Actions placeholder */}
            <SkeletonShimmer className="size-8 rounded shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ReportEditorSkeleton() {
  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SkeletonShimmer className="size-8" />
          <div className="space-y-2">
            <SkeletonShimmer className="h-6 w-64" />
            <SkeletonShimmer className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonShimmer className="h-9 w-24 rounded-md" />
          <SkeletonShimmer className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-border overflow-hidden shadow-xs">
        {/* Toolbar */}
        <div className="p-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonShimmer 
                key={i} 
                className="size-8" 
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          <SkeletonShimmer className="h-10 w-3/4" />
          <SkeletonShimmer className="h-4 w-full" />
          <SkeletonShimmer className="h-4 w-full" />
          <SkeletonShimmer className="h-4 w-2/3" />
          <div className="py-4" />
          <SkeletonShimmer className="h-8 w-1/2" />
          <SkeletonShimmer className="h-4 w-full" />
          <SkeletonShimmer className="h-4 w-full" />
          <SkeletonShimmer className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

