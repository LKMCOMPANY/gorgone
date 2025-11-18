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

      {/* Tweet Card (reuse from feed) */}
      <div className="animate-in">
        <TwitterFeedCard
          tweet={{
            id: currentTweet.tweet_db_id,
            tweet_id: currentTweet.tweet_id,
            text: currentTweet.text,
            twitter_created_at: currentTweet.twitter_created_at,
            retweet_count: currentTweet.retweet_count,
            reply_count: currentTweet.reply_count,
            like_count: currentTweet.like_count,
            quote_count: currentTweet.quote_count,
            view_count: currentTweet.view_count,
            total_engagement: currentTweet.total_engagement,
            has_media: currentTweet.has_media,
            has_links: currentTweet.has_links,
            has_hashtags: currentTweet.has_hashtags,
            raw_data: currentTweet.raw_data,
            zone_id: currentTweet.zone_id,
            author_profile_id: currentTweet.author_profile_id,
            conversation_id: null,
            lang: null,
            source: null,
            collected_at: currentTweet.created_at,
            has_mentions: false,
            is_reply: false,
            in_reply_to_tweet_id: null,
            in_reply_to_user_id: null,
            in_reply_to_username: null,
            tweet_url: null,
            twitter_url: null,
            is_processed: true,
            sentiment_score: null,
            embedding: null,
            embedding_model: null,
            embedding_created_at: null,
            created_at: currentTweet.created_at,
            updated_at: currentTweet.created_at
          }}
          zone_id={zoneId}
        />
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

