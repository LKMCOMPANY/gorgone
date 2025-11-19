'use client'

/**
 * Cluster List with Horizontal Card Slider
 * Modern card design with AI-generated descriptions
 */

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

  // Current cluster index for slider
  const currentIndex = selection.type === 'selected'
    ? sortedClusters.findIndex(c => c.cluster_id === selection.clusterId)
    : 0

  const validIndex = currentIndex >= 0 ? currentIndex : 0
  const currentCluster = sortedClusters[validIndex]

  // Navigate to next/previous cluster
  const handleNext = () => {
    if (validIndex < sortedClusters.length - 1) {
      const nextCluster = sortedClusters[validIndex + 1]
      onSelectCluster(nextCluster.cluster_id)
    }
  }

  const handlePrevious = () => {
    if (validIndex > 0) {
      const prevCluster = sortedClusters[validIndex - 1]
      onSelectCluster(prevCluster.cluster_id)
    }
  }

  // Keyboard navigation - Only when this component is active
  // Removed to avoid conflicts with tab navigation

  if (!currentCluster) {
    return (
      <div className="flex items-center justify-center py-16 px-6">
        <p className="text-body-sm text-muted-foreground">
          No clusters available
        </p>
      </div>
    )
  }

  const percentage = ((currentCluster.tweet_count / clusters.reduce((sum, c) => sum + c.tweet_count, 0)) * 100).toFixed(1)
  const color = getOpinionClusterColor(currentCluster.cluster_id)

  return (
    <div className="space-y-0">
      {/* Navigation Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handlePrevious}
          disabled={validIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-body-sm font-medium">
            Cluster {validIndex + 1} of {sortedClusters.length}
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleNext}
          disabled={validIndex === sortedClusters.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress indicators */}
      <div className="px-4 py-3 flex items-center gap-1.5 border-b border-border">
        {sortedClusters.map((cluster, i) => {
          const isActive = i === validIndex
          const clusterColor = getOpinionClusterColor(cluster.cluster_id)
          
          return (
            <button
              key={cluster.cluster_id}
              onClick={() => onSelectCluster(cluster.cluster_id)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-[250ms]',
                isActive ? 'flex-1' : 'w-1.5'
              )}
              style={{ 
                backgroundColor: isActive ? clusterColor : `${clusterColor}40`
              }}
              title={cluster.label}
            />
          )
        })}
      </div>

      {/* Cluster Card */}
      <div className="p-4 space-y-4 animate-in fade-in-0 duration-300">
          {/* Main Card */}
          <Card className="p-6 space-y-4 border-border shadow-sm">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: `${color}20`,
                  border: `2px solid ${color}40`
                }}
              >
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Title */}
                <h3 className="text-heading-3 font-semibold text-foreground">
                  {currentCluster.label}
                </h3>

                {/* Stats */}
                <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
                  <span className="font-medium">
                    {currentCluster.tweet_count.toLocaleString()} posts
                  </span>
                  <span>•</span>
                  <span>{percentage}% of total</span>
                </div>
              </div>
            </div>

            {/* AI-Generated Description */}
            {currentCluster.reasoning && (
              <div className="space-y-2">
                <h4 className="text-body-sm font-semibold text-foreground">
                  Analysis
                </h4>
                <p className="text-body-sm text-muted-foreground leading-relaxed">
                  {currentCluster.reasoning}
                </p>
              </div>
            )}

            {/* Keywords */}
            <div className="space-y-2">
              <h4 className="text-body-sm font-semibold text-foreground">
                Key Topics
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {currentCluster.keywords.slice(0, 8).map((keyword, idx) => (
                  <Badge
                    key={`${keyword}-${idx}`}
                    variant="secondary"
                    className="text-xs font-medium"
                    style={{
                      backgroundColor: `${color}15`,
                      borderColor: `${color}30`,
                      color: 'var(--foreground)'
                    }}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sentiment Indicator */}
            {currentCluster.avg_sentiment !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-body-sm font-semibold text-foreground">
                    Sentiment
                  </h4>
                  <span className="text-caption font-medium text-muted-foreground">
                    {currentCluster.avg_sentiment > 0.2 ? 'Positive' : 
                     currentCluster.avg_sentiment < -0.2 ? 'Negative' : 'Neutral'}
                  </span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full rounded-full transition-all duration-[250ms]"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(to right, hsl(var(--destructive)), hsl(var(--chart-4)), hsl(var(--chart-1)))',
                      opacity: 0.3
                    }}
                  />
                  <div
                    className="absolute h-full w-1 bg-foreground rounded-full transition-all duration-[250ms]"
                    style={{
                      left: `${((currentCluster.avg_sentiment + 1) / 2) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-caption text-muted-foreground">
                  <span>Negative</span>
                  <span>Neutral</span>
                  <span>Positive</span>
                </div>
              </div>
            )}

            {/* Coherence Score */}
            {currentCluster.coherence_score !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-body-sm font-semibold text-foreground">
                    Cluster Quality
                  </h4>
                  <span className="text-body-sm font-medium">
                    {(currentCluster.coherence_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-[250ms]"
                    style={{
                      width: `${currentCluster.coherence_score * 100}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
                <p className="text-caption text-muted-foreground">
                  Indicates how cohesive the cluster's topics are
                </p>
              </div>
            )}
          </Card>

          {/* Quick Navigation Grid */}
          <div className="grid grid-cols-2 gap-2">
            {sortedClusters.slice(0, 6).map((cluster, i) => {
              const isActive = cluster.cluster_id === currentCluster.cluster_id
              const clusterColor = getOpinionClusterColor(cluster.cluster_id)
              
              return (
                <button
                  key={cluster.cluster_id}
                  onClick={() => onSelectCluster(cluster.cluster_id)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all duration-[150ms]',
                    isActive 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: clusterColor }}
                    />
                    <span className="text-body-sm font-medium truncate">
                      {cluster.label}
                    </span>
                  </div>
                  <p className="text-caption text-muted-foreground mt-1">
                    {cluster.tweet_count.toLocaleString()} posts
                  </p>
                </button>
              )
            })}
          </div>
      </div>
    </div>
  )
}
