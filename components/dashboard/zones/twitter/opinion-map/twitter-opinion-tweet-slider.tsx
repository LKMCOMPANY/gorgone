'use client'

/**
 * Tweet Slider Component
 * Horizontal carousel for browsing cluster tweets
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TwitterFeedCard } from '@/components/dashboard/zones/twitter/twitter-feed-card'
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
  const sortedTweets = [...clusterTweets].sort((a, b) => 
    b.total_engagement - a.total_engagement
  )

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
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [validIndex, sortedTweets])

  if (!currentTweet) {
    return (
      <div className="p-8 text-center">
        <p className="text-body-sm text-muted-foreground">
          No tweets in this cluster
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getOpinionClusterColor(cluster.cluster_id) }}
          />
          <Badge variant="secondary" className="text-xs">
            {cluster.label}
          </Badge>
        </div>
        <span className="text-caption text-muted-foreground">
          {validIndex + 1} of {sortedTweets.length}
        </span>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handlePrevious}
          disabled={validIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Progress dots */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {Array.from({ length: Math.min(sortedTweets.length, 10) }).map((_, i) => {
            const dotIndex = Math.floor((validIndex / sortedTweets.length) * 10)
            
            return (
              <div
                key={i}
                className={cn(
                  'h-1 rounded-full transition-all duration-[150ms]',
                  i === dotIndex
                    ? 'w-8 bg-primary'
                    : 'w-1 bg-muted-foreground/30'
                )}
              />
            )
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleNext}
          disabled={validIndex === sortedTweets.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Tweet Card (simplified display) */}
      <div className="animate-in">
        <Card className="p-4">
          <div className="space-y-3">
            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium">
                  {currentTweet.author_username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium truncate">
                  {currentTweet.author_name}
                </p>
                <p className="text-caption text-muted-foreground">
                  @{currentTweet.author_username}
                </p>
              </div>
            </div>

            {/* Tweet text */}
            <p className="text-body whitespace-pre-wrap">
              {currentTweet.text}
            </p>

            {/* Engagement stats */}
            <div className="flex items-center gap-4 text-caption text-muted-foreground">
              <span>❤️ {currentTweet.like_count.toLocaleString()}</span>
              <span>🔁 {currentTweet.retweet_count.toLocaleString()}</span>
              <span>💬 {currentTweet.reply_count.toLocaleString()}</span>
              {currentTweet.view_count > 0 && (
                <span>👁️ {currentTweet.view_count.toLocaleString()}</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Cluster confidence indicator */}
      <div className="flex items-center gap-2 px-2">
        <span className="text-caption">Cluster Confidence:</span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-[250ms]"
            style={{ width: `${currentTweet.cluster_confidence * 100}%` }}
          />
        </div>
        <span className="text-caption font-medium">
          {(currentTweet.cluster_confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

