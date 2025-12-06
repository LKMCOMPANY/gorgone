'use client'

/**
 * Tweet Slider Component - Using Feed Card Design
 * Horizontal carousel for browsing cluster tweets with consistent design
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Heart, Repeat2, MessageCircle, Layers } from 'lucide-react'
import { TwitterFeedCard } from '../twitter-feed-card'
import { mapProjectionToTweet, sortByEngagement } from '@/lib/data/twitter/opinion-map/mapping'
import type { 
  EnrichedTwitterProjection,
  TwitterOpinionCluster,
  OpinionSelectionState
} from '@/types'
import { getOpinionClusterColor } from '@/types'
import { cn } from '@/lib/utils'

interface TwitterOpinionTweetSliderProps {
  projections: EnrichedTwitterProjection[]
  cluster: TwitterOpinionCluster
  selection: OpinionSelectionState
  zoneId: string
  onTweetChange: (tweetId: string) => void
}

export function TwitterOpinionTweetSlider({
  projections,
  cluster,
  selection,
  zoneId,
  onTweetChange
}: TwitterOpinionTweetSliderProps) {
  // Filter projections for this cluster
  const clusterTweets = projections.filter(p => p.cluster_id === cluster.cluster_id)

  // Sort by engagement (highest first)
  const sortedTweets = sortByEngagement(clusterTweets)

  // Find current index
  const currentIndex = selection.type === 'selected'
    ? sortedTweets.findIndex(t => t.tweet_id === selection.tweetId)
    : 0

  const validIndex = currentIndex >= 0 ? currentIndex : 0
  const currentTweet = sortedTweets[validIndex]

  // Navigate to next/previous tweet
  const handleNext = () => {
    if (validIndex < sortedTweets.length - 1) {
      const nextTweet = sortedTweets[validIndex + 1]
      onTweetChange(nextTweet.tweet_id)
    }
  }

  const handlePrevious = () => {
    if (validIndex > 0) {
      const prevTweet = sortedTweets[validIndex - 1]
      onTweetChange(prevTweet.tweet_id)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        handlePrevious()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [validIndex, sortedTweets])

  if (!currentTweet) {
    return (
      <div className="flex items-center justify-center py-16 px-6">
        <p className="text-sm text-muted-foreground">
          No posts in this cluster
        </p>
      </div>
    )
  }

  const color = getOpinionClusterColor(cluster.cluster_id)

  // Map current tweet to feed format
  const tweet = mapProjectionToTweet(currentTweet)

  return (
    <div className="space-y-0 bg-muted/5 border-t border-border/60">
      {/* Navigation Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/60 bg-background/50 backdrop-blur-sm">
        <Button
          variant="outline"
          size="icon"
          className="size-8 shadow-xs bg-background"
          onClick={handlePrevious}
          disabled={validIndex === 0}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <div
              className="w-2.5 h-2.5 rounded-full shadow-sm"
            style={{ backgroundColor: color }}
          />
            <span className="text-sm font-semibold truncate max-w-[200px]">
            {cluster.label}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {validIndex + 1} / {sortedTweets.length} posts
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="size-8 shadow-xs bg-background"
          onClick={handleNext}
          disabled={validIndex === sortedTweets.length - 1}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Progress indicators */}
      <div className="px-4 h-1 bg-muted/20 w-full flex">
            <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${((validIndex + 1) / sortedTweets.length) * 100}%` }}
            />
      </div>

      {/* Tweet Display using TwitterFeedCard */}
      <div className="p-6 space-y-6 animate-in fade-in-0 duration-300">
        {/* Tweet Card - Constrained width */}
        <div className="max-w-2xl mx-auto">
          <TwitterFeedCard
            tweet={tweet}
            tags={[]} // Profile tags not available in projections
            zoneId={zoneId}
            showEngagementChart={true} // Show chart in slider for detailed view
            chartPosition="below" // Chart below tweet for narrow sidebar layout
          />
        </div>

        {/* Cluster Info (Nested Card Pattern) */}
        {cluster.keywords && cluster.keywords.length > 0 && (
          <div className="max-w-2xl mx-auto rounded-xl bg-background border border-border/60 shadow-xs p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
              Cluster Keywords
            </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cluster.keywords.map((keyword, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs bg-muted/50 text-muted-foreground border-border/50 font-mono"
                >
                  #{keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Surrounding tweets preview (Nested Card Pattern) */}
        {sortedTweets.length > 1 && (
          <div className="max-w-2xl mx-auto space-y-3">
            <h4 className="text-sm font-semibold text-foreground pl-1">
              Other High-Engagement Posts
            </h4>
            <div className="space-y-2">
              {sortedTweets
                .filter((_, i) => i !== validIndex)
                .slice(0, 3)
                .map((proj) => (
                  <button
                    key={proj.tweet_id}
                    onClick={() => onTweetChange(proj.tweet_id)}
                    className="w-full text-left p-3 rounded-xl bg-background border border-border/60 shadow-xs hover:border-primary/30 hover:shadow-sm transition-all duration-[var(--transition-fast)] group"
                  >
                    <p className="text-sm text-foreground/90 line-clamp-2 break-words font-medium group-hover:text-primary transition-colors">
                      {proj.text}
                    </p>
                    <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Heart className="size-3.5 text-chart-1" />
                        <span className="font-mono">{proj.like_count.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Repeat2 className="size-3.5 text-chart-2" />
                        <span className="font-mono">{proj.retweet_count.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="size-3.5 text-chart-3" />
                        <span className="font-mono">{proj.reply_count.toLocaleString()}</span>
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
