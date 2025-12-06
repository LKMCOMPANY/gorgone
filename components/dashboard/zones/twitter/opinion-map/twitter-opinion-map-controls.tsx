'use client'

/**
 * Opinion Map Control Panel - Enhanced Real-Time Progress Display
 * Period selection, generation controls, and detailed progress tracking
 */

import { useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, X, Clock, Database, Brain } from 'lucide-react'
import { subDays, subHours } from 'date-fns'
import { cn } from '@/lib/utils'
import type { TwitterOpinionSession } from '@/types'

interface TwitterOpinionMapControlsProps {
  session: TwitterOpinionSession | null
  onGenerate: (config: {
    start_date: string
    end_date: string
    sample_size: number
  }) => void
  onCancel: () => void
}

type TimePeriod = '3h' | '6h' | '12h' | '24h' | '3d' | '7d' | '30d'

// Phase information for user-friendly display
const PHASE_INFO = {
  pending: { icon: Clock, label: 'Initializing', color: 'text-primary' },
  vectorizing: { icon: Database, label: 'Vectorizing Posts', color: 'text-primary' },
  reducing: { icon: Brain, label: 'Reducing Dimensions', color: 'text-primary' },
  clustering: { icon: Brain, label: 'Clustering Opinions', color: 'text-primary' },
  labeling: { icon: Sparkles, label: 'Generating Labels', color: 'text-primary' },
}

export function TwitterOpinionMapControls({
  session,
  onGenerate,
  onCancel
}: TwitterOpinionMapControlsProps) {
  const [period, setPeriod] = useState<TimePeriod>('24h')
  const [sampleSize, setSampleSize] = useState(5000)

  const isGenerating = Boolean(session && [
    'pending',
    'vectorizing',
    'reducing',
    'clustering',
    'labeling'
  ].includes(session.status))

  const handleGenerateClick = () => {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case '3h':
        startDate = subHours(now, 3)
        break
      case '6h':
        startDate = subHours(now, 6)
        break
      case '12h':
        startDate = subHours(now, 12)
        break
      case '24h':
        startDate = subHours(now, 24)
        break
      case '3d':
        startDate = subDays(now, 3)
        break
      case '7d':
        startDate = subDays(now, 7)
        break
      case '30d':
        startDate = subDays(now, 30)
        break
    }

    onGenerate({
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      sample_size: sampleSize
    })
  }

  const phaseInfo = session && PHASE_INFO[session.status as keyof typeof PHASE_INFO]
  const PhaseIcon = phaseInfo?.icon

  return (
    <Card className="shadow-xs p-6">
        <div className="space-y-4">
          {/* Configuration */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Time Period */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">
                  Period:
                </span>
                <Select 
                  value={period} 
                  onValueChange={(v) => setPeriod(v as TimePeriod)}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3h">Last 3 hours</SelectItem>
                    <SelectItem value="6h">Last 6 hours</SelectItem>
                    <SelectItem value="12h">Last 12 hours</SelectItem>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="3d">Last 3 days</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sample Size */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">
                  Sample:
                </span>
                <Select 
                  value={sampleSize.toString()} 
                  onValueChange={(v) => setSampleSize(parseInt(v))}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">500 posts</SelectItem>
                    <SelectItem value="1000">1,000 posts</SelectItem>
                    <SelectItem value="2500">2,500 posts</SelectItem>
                    <SelectItem value="5000">5,000 posts</SelectItem>
                    <SelectItem value="7500">7,500 posts</SelectItem>
                    <SelectItem value="10000">10,000 posts (max)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sample Size Warning */}
            {sampleSize > 5000 && !isGenerating && (
              <div className="text-xs text-tactical-amber flex items-center gap-1.5">
                <Clock className="size-3.5" />
                <span>Large samples may take up to 15 minutes to process</span>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerateClick}
              disabled={isGenerating}
              size="default"
              className="w-full sm:w-auto transition-all duration-[var(--transition-fast)]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <div className="relative size-4 mr-2">
                    <Image
                      src="/GorgoneWhite.svg"
                      alt="Gorgone"
                      fill
                      className="object-contain"
                    />
                  </div>
                  Generate Opinion Map
                </>
              )}
            </Button>
          </div>

          {/* Enhanced Progress Display (when generating) */}
          {isGenerating && session && (
            <div className="space-y-4 pt-2 border-t border-border animate-in fade-in-0 slide-in-from-top-2 duration-200">
              {/* Phase Badge and Cancel */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {PhaseIcon && (
                    <div className={cn(
                      'p-2.5 rounded-lg bg-muted/50 transition-all duration-300', 
                      phaseInfo.color
                    )}>
                      <PhaseIcon className="size-4 animate-spin" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {phaseInfo?.label || 'Processing'}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className="text-xs font-medium px-2 py-0.5"
                      >
                        {session.progress}%
                      </Badge>
                    </div>
                    {session.phase_message && (
                      <p className="text-xs text-muted-foreground">
                        {session.phase_message}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-all duration-[var(--transition-fast)]"
                  onClick={onCancel}
                  title="Cancel Generation"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Progress Bar with smooth animation */}
              <div className="space-y-2">
                <Progress 
                  value={session.progress} 
                  className="h-2.5 transition-all duration-300"
                />
                
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {session.vectorized_tweets > 0 && session.total_tweets ? (
                      <>
                        {session.vectorized_tweets.toLocaleString()} / {session.total_tweets.toLocaleString()} posts
                      </>
                    ) : (
                      'Preparing data...'
                    )}
                  </span>
                  {session.total_clusters && (
                    <span className="font-medium">
                      {session.total_clusters} clusters detected
                    </span>
                  )}
                </div>
              </div>

              {/* Phase Timeline with smooth transitions */}
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
                        'flex-1 h-1 rounded-full transition-all duration-500',
                        isPast || isCurrent ? 'bg-primary' : 'bg-muted',
                        isCurrent && 'animate-pulse'
                      )}
                      title={info.label}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed State */}
          {session?.status === 'completed' && !isGenerating && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-tactical-green/30 bg-tactical-green/5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-full bg-tactical-green/10">
                  <div className="relative size-4">
                    <Image
                      src="/GorgoneBlack.svg"
                      alt="Gorgone"
                      fill
                      className="object-contain dark:hidden"
                    />
                    <Image
                      src="/GorgoneWhite.svg"
                      alt="Gorgone"
                      fill
                      className="object-contain hidden dark:block"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium">
                  Opinion map generated successfully
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{session.total_tweets?.toLocaleString()} posts</span>
                  <span>•</span>
                  <span>{session.total_clusters} clusters</span>
                  {session.execution_time_ms && (
                    <>
                      <span>•</span>
                      <span>{(session.execution_time_ms / 1000).toFixed(1)}s</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Failed State */}
          {session?.status === 'failed' && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-tactical-red/30 bg-tactical-red/5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-full bg-tactical-red/10">
                  <X className="size-4 text-tactical-red" />
                </div>
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium text-tactical-red">
                  Generation failed
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.error_message || 'An unknown error occurred'}
                </p>
              </div>
            </div>
          )}
        </div>
    </Card>
  )
}
