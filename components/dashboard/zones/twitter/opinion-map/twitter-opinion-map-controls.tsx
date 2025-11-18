'use client'

/**
 * Opinion Map Control Panel
 * Period selection and generation controls
 */

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Loader2, Sparkles, X } from 'lucide-react'
import { subDays, subHours } from 'date-fns'
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

export function TwitterOpinionMapControls({
  session,
  onGenerate,
  onCancel
}: TwitterOpinionMapControlsProps) {
  const [period, setPeriod] = useState<TimePeriod>('24h')
  const [sampleSize, setSampleSize] = useState(10000)

  const isGenerating = session && [
    'pending',
    'vectorizing',
    'reducing',
    'clustering',
    'labeling'
  ].includes(session.status)

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

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Configuration */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Time Period */}
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-muted-foreground shrink-0">
                Period:
              </span>
              <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
                <SelectTrigger className="w-32 h-9">
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
              <span className="text-body-sm text-muted-foreground shrink-0">
                Sample:
              </span>
              <Select value={sampleSize.toString()} onValueChange={(v) => setSampleSize(parseInt(v))}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1,000 tweets</SelectItem>
                  <SelectItem value="5000">5,000 tweets</SelectItem>
                  <SelectItem value="10000">10,000 tweets</SelectItem>
                  <SelectItem value="20000">20,000 tweets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="ml-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Opinion Map
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar (when generating) */}
          {isGenerating && session && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-muted-foreground">
                  {session.phase_message || 'Processing...'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{session.progress}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onCancel}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Progress value={session.progress} className="h-2" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

