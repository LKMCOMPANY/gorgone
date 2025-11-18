'use client'

/**
 * Cluster List Sidebar
 * Displays all clusters with stats and selection
 */

import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { TwitterOpinionCluster, OpinionSelectionState } from '@/types'
import { getOpinionClusterColor } from '@/types'
import { cn } from '@/lib/utils'

interface TwitterOpinionClusterListProps {
  clusters: TwitterOpinionCluster[]
  selection: OpinionSelectionState
  onSelectCluster: (clusterId: number) => void
}

export function TwitterOpinionClusterList({
  clusters,
  selection,
  onSelectCluster
}: TwitterOpinionClusterListProps) {
  // Sort by tweet count (largest first)
  const sortedClusters = [...clusters].sort((a, b) => b.tweet_count - a.tweet_count)

  return (
    <ScrollArea className="h-[900px]">
      <div className="space-y-3 p-4">
        {sortedClusters.map((cluster, i) => {
          const isSelected = selection.type === 'selected' && 
                            selection.clusterId === cluster.cluster_id
          const color = getOpinionClusterColor(cluster.cluster_id)
          const percentage = ((cluster.tweet_count / clusters.reduce((sum, c) => sum + c.tweet_count, 0)) * 100).toFixed(1)

          return (
            <Card
              key={cluster.cluster_id}
              className={cn(
                'p-3 cursor-pointer transition-all duration-[150ms]',
                isSelected 
                  ? 'border-primary shadow-sm' 
                  : 'hover:border-primary/50'
              )}
              onClick={() => onSelectCluster(cluster.cluster_id)}
            >
              <div className="flex items-start gap-3">
                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: color }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Label */}
                  <h4 className="text-body font-medium truncate">
                    {cluster.label}
                  </h4>

                  {/* Stats */}
                  <p className="text-body-sm text-muted-foreground">
                    {cluster.tweet_count.toLocaleString()} tweets ({percentage}%)
                  </p>

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cluster.keywords.slice(0, 4).map(keyword => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="text-xs"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>

                  {/* Sentiment if available */}
                  {cluster.avg_sentiment !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-caption">Sentiment:</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                          style={{
                            width: '100%',
                            marginLeft: `${((cluster.avg_sentiment + 1) / 2) * 100}%`,
                            transform: 'translateX(-50%)'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* AI reasoning (if selected) */}
                  {isSelected && cluster.reasoning && (
                    <p className="text-caption text-muted-foreground mt-2 italic">
                      {cluster.reasoning}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}

