/**
 * Opinion Map Generating Overlay
 * Ultra-professional loading overlay with live progress
 */

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, Database, Brain, Sparkles, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TwitterOpinionSession } from '@/types'

interface TwitterOpinionMapGeneratingOverlayProps {
  session: TwitterOpinionSession
}

// Phase information for display
const PHASE_INFO = {
  pending: { 
    icon: Clock, 
    label: 'Initializing', 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  vectorizing: { 
    icon: Database, 
    label: 'Vectorizing Tweets', 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  reducing: { 
    icon: Brain, 
    label: 'Reducing Dimensions', 
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10'
  },
  clustering: { 
    icon: Brain, 
    label: 'Clustering Opinions', 
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10'
  },
  labeling: { 
    icon: Sparkles, 
    label: 'Generating Labels', 
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10'
  },
}

export function TwitterOpinionMapGeneratingOverlay({
  session
}: TwitterOpinionMapGeneratingOverlayProps) {
  const phaseInfo = PHASE_INFO[session.status as keyof typeof PHASE_INFO]
  const PhaseIcon = phaseInfo?.icon || Loader2

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in-0 duration-300">
      <Card className="max-w-md w-full mx-4 border-border shadow-2xl">
        <div className="p-8 space-y-6">
          {/* Icon and title */}
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300',
              phaseInfo?.bgColor || 'bg-primary/10'
            )}>
              <PhaseIcon className={cn(
                'w-7 h-7 animate-spin',
                phaseInfo?.color || 'text-primary'
              )} />
            </div>
            <div className="flex-1 space-y-1.5 pt-1">
              <h3 className="text-heading-3">
                {phaseInfo?.label || 'Processing'}
              </h3>
              <p className="text-body-sm text-muted-foreground">
                {session.phase_message || 'Please wait while we process your data...'}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body-sm font-medium">
                Progress
              </span>
              <Badge variant="secondary" className="text-xs font-semibold">
                {session.progress}%
              </Badge>
            </div>
            <Progress 
              value={session.progress} 
              className="h-3"
            />
          </div>

          {/* Stats */}
          {session.vectorized_tweets > 0 && session.total_tweets && (
            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-caption text-muted-foreground">
                    Processed
                  </p>
                  <p className="text-body font-semibold">
                    {session.vectorized_tweets.toLocaleString()} / {session.total_tweets.toLocaleString()}
                  </p>
                </div>
                {session.total_clusters && (
                  <div className="space-y-1">
                    <p className="text-caption text-muted-foreground">
                      Clusters
                    </p>
                    <p className="text-body font-semibold">
                      {session.total_clusters}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase timeline */}
          <div className="space-y-2">
            <p className="text-caption text-muted-foreground">
              Pipeline stages
            </p>
            <div className="flex items-center gap-1.5">
              {Object.entries(PHASE_INFO).map(([phase, info], index) => {
                const phaseOrder = ['pending', 'vectorizing', 'reducing', 'clustering', 'labeling']
                const currentIndex = phaseOrder.indexOf(session.status)
                const isPast = currentIndex > index
                const isCurrent = session.status === phase
                
                return (
                  <div
                    key={phase}
                    className={cn(
                      'flex-1 h-1.5 rounded-full transition-all duration-500',
                      isPast || isCurrent ? 'bg-primary' : 'bg-muted',
                      isCurrent && 'animate-pulse'
                    )}
                    title={info.label}
                  />
                )
              })}
            </div>
          </div>

          {/* Help text */}
          <p className="text-caption text-muted-foreground text-center pt-2">
            This process may take several minutes. The page will update automatically when complete.
          </p>
        </div>
      </Card>
    </div>
  )
}

