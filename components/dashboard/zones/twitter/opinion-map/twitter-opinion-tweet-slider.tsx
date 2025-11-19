'use client'

/**
 * Tweet Slider Component - Using Feed Card Design
 * Horizontal carousel for browsing cluster tweets with consistent design
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
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
      <div className="p-8 text-center">
        <p className="text-body-sm text-muted-foreground">
          No tweets in this cluster
        </p>
      </div>
    )
  }

  const color = getOpinionClusterColor(cluster.cluster_id)

  // Map current tweet to feed format
  const tweet = mapProjectionToTweet(currentTweet)

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Navigation Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
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
      <div className="flex-shrink-0 px-4 py-3 flex items-center gap-1 border-b border-border overflow-x-auto">
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

      {/* Tweet Display using TwitterFeedCard */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4 animate-in fade-in-0 duration-300">
          {/* Tweet Card - Full width in container */}
          <div className="w-full">
            <TwitterFeedCard
              tweet={tweet}
              tags={[]} // Profile tags not available in projections
              zoneId={zoneId}
              showEngagementChart={true} // Show chart in slider for detailed view
              chartPosition="below" // Chart below tweet for narrow sidebar layout
            />
          </div>

          {/* Cluster Info */}
          {cluster.keywords && cluster.keywords.length > 0 && (
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <p className="text-caption font-semibold text-foreground mb-2">
                Cluster Keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cluster.keywords.map((keyword, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-caption bg-card"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Surrounding tweets preview */}
          {sortedTweets.length > 1 && (
            <div className="space-y-3">
              <h4 className="text-body-sm font-semibold text-foreground">
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
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all duration-[150ms]"
                    >
                      <p className="text-body-sm text-foreground line-clamp-2 break-words">
                        {proj.text}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-caption text-muted-foreground">
                        <span>❤️ {proj.like_count.toLocaleString()}</span>
                        <span>🔁 {proj.retweet_count.toLocaleString()}</span>
                        <span>💬 {proj.reply_count.toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Bottom spacing for better scrolling UX */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  )
}
