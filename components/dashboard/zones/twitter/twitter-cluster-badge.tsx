"use client";

import { cn } from "@/lib/utils";
import type { TwitterOpinionCluster } from "@/types";
import { getOpinionClusterColor } from "@/types";

interface TwitterClusterBadgeProps {
  cluster: TwitterOpinionCluster;
  className?: string;
}

/**
 * Displays opinion cluster information for a tweet
 * Matches the Analysis page design with sentiment bar
 * 
 * Shows: Color dot + Label + Tweet count + Sentiment bar
 * Used in: TwitterFeedCard (below tweet text)
 */
export function TwitterClusterBadge({ 
  cluster, 
  className 
}: TwitterClusterBadgeProps) {
  const clusterColor = getOpinionClusterColor(cluster.cluster_id);
  
  // Get sentiment label
  const sentimentLabel = cluster.avg_sentiment !== null
    ? cluster.avg_sentiment > 0.2 ? 'Positive' 
      : cluster.avg_sentiment < -0.2 ? 'Negative' 
      : 'Neutral'
    : null;

  return (
    <div 
      className={cn(
        "flex flex-col gap-2 transition-all duration-[var(--transition-fast)]",
        className
      )}
    >
      {/* Top row: Color dot + Label + Tweet count */}
      <div className="flex items-center gap-2">
        {/* Color dot - matches Analysis page design */}
        <div 
          className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-background shadow-sm"
          style={{ backgroundColor: clusterColor }}
          aria-hidden="true"
        />
        
        {/* Cluster label */}
        <span className="text-xs font-medium text-foreground">
          {cluster.label}
        </span>
        
        {/* Tweet count */}
        <span className="text-xs text-muted-foreground ml-auto">
          {cluster.tweet_count.toLocaleString()} {cluster.tweet_count === 1 ? 'tweet' : 'tweets'}
        </span>
      </div>

      {/* Sentiment bar - matches Analysis page */}
      {cluster.avg_sentiment !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Sentiment
            </span>
            <span className={cn(
              "text-xs font-medium",
              cluster.avg_sentiment > 0.2 ? "text-tactical-green" :
              cluster.avg_sentiment < -0.2 ? "text-tactical-red" :
              "text-muted-foreground"
            )}>
              {sentimentLabel}
            </span>
          </div>
          
          {/* Gradient bar with position indicator */}
          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
            {/* Gradient background using tactical colors */}
            <div 
              className="absolute h-full w-full rounded-full"
              style={{
                background: 'linear-gradient(to right, var(--tactical-red), var(--tactical-amber), var(--tactical-green))',
                opacity: 0.3
              }}
            />
            
            {/* Position indicator */}
            <div
              className="absolute h-full w-1 bg-foreground rounded-full transition-all duration-[var(--transition-base)] shadow-sm"
              style={{
                left: `${((cluster.avg_sentiment + 1) / 2) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


