'use client'

/**
 * Tweet Slider Component - Simplified & Clean
 * Horizontal carousel for browsing cluster tweets
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
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
      <div className="p-8 text-center">
        <p className="text-body-sm text-muted-foreground">
          No tweets in this cluster
        </p>
      </div>
    )
  }

  const color = getOpinionClusterColor(cluster.cluster_id)
  const maxEngagement = Math.max(...sortedTweets.map(t => t.total_engagement))

  return (
    <div className="flex flex-col h-[900px]">
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
          <Badge variant="secondary" className="text-xs font-medium">
            {cluster.label}
          </Badge>
          <span className="text-body-sm text-muted-foreground">
            {validIndex + 1} / {sortedTweets.length}
          </span>
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

      {/* Progress indicators */}
      <div className="px-4 py-3 flex items-center gap-1 border-b border-border overflow-x-auto">
        {Array.from({ length: Math.min(sortedTweets.length, 20) }).map((_, i) => {
          const segmentSize = Math.ceil(sortedTweets.length / 20)
          const segmentIndex = Math.floor(validIndex / segmentSize)
          const isActive = i === segmentIndex
          
          return (
            <div
              key={i}
              className={cn(
                'h-1 rounded-full transition-all duration-[250ms]',
                isActive ? 'w-8 bg-primary' : 'w-1 bg-muted-foreground/30'
              )}
            />
          )
        })}
      </div>

      {/* Tweet Display */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Main tweet card */}
          <div className="animate-in fade-in-0 duration-300">
            <div className="rounded-lg border border-border bg-card p-6 space-y-4 shadow-sm">
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-border">
                  <span className="text-body font-semibold text-primary">
                    {currentTweet.author_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body font-semibold truncate">
                      {currentTweet.author_name}
                    </p>
                    {currentTweet.author_verified && (
                      <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-body-sm text-muted-foreground">
                    @{currentTweet.author_username}
                  </p>
                </div>
              </div>

              {/* Tweet text */}
              <p className="text-body whitespace-pre-wrap leading-relaxed">
                {currentTweet.text}
              </p>

              {/* Engagement stats with icons */}
              <div className="flex items-center gap-4 text-body-sm border-t border-border pt-4">
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span className="font-medium">{currentTweet.like_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                  </svg>
                  <span className="font-medium">{currentTweet.retweet_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                  </svg>
                  <span className="font-medium">{currentTweet.reply_count.toLocaleString()}</span>
                </div>
                {currentTweet.view_count > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span className="font-medium">{currentTweet.view_count.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Total Engagement */}
              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-semibold">Total Engagement</span>
                  <span className="text-body-sm font-medium">
                    {currentTweet.total_engagement.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-[250ms]"
                    style={{
                      width: `${Math.min((currentTweet.total_engagement / maxEngagement) * 100, 100)}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </div>

              {/* Cluster confidence indicator */}
              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-semibold">Cluster Confidence</span>
                  <span className="text-body-sm font-medium">
                    {(currentTweet.cluster_confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-[250ms]"
                    style={{ width: `${currentTweet.cluster_confidence * 100}%` }}
                  />
                </div>
                <p className="text-caption text-muted-foreground">
                  How well this tweet fits in the cluster
                </p>
              </div>

              {/* View on X button */}
              <a
                href={`https://twitter.com/${currentTweet.author_username}/status/${currentTweet.tweet_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button 
                  variant="outline" 
                  className="w-full gap-2 transition-all duration-[150ms]"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  View on X
                </Button>
              </a>
            </div>
          </div>

          {/* Surrounding tweets preview */}
          {sortedTweets.length > 1 && (
            <div className="space-y-3">
              <h4 className="text-body-sm font-semibold text-foreground px-1">
                Other High-Engagement Tweets
              </h4>
              <div className="grid gap-2">
                {sortedTweets
                  .filter((_, i) => i !== validIndex)
                  .slice(0, 3)
                  .map((tweet) => (
                    <button
                      key={tweet.tweet_id}
                      onClick={() => onTweetChange(tweet.tweet_id)}
                      className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all duration-[150ms]"
                    >
                      <p className="text-body-sm text-foreground line-clamp-2">
                        {tweet.text}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-caption text-muted-foreground">
                        <span>❤️ {tweet.like_count.toLocaleString()}</span>
                        <span>🔁 {tweet.retweet_count.toLocaleString()}</span>
                        <span>💬 {tweet.reply_count.toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
