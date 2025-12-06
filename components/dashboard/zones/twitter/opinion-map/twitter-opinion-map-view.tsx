'use client'

/**
 * Opinion Map Main View - Enhanced Real-Time Updates
 * Orchestrates all opinion map components with robust real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { TwitterOpinionMapControls } from './twitter-opinion-map-controls'
import { TwitterOpinionMap3D } from './twitter-opinion-map-3d'
import { TwitterOpinionEvolutionChart } from './twitter-opinion-evolution-chart'
import { TwitterOpinionClusterList } from './twitter-opinion-cluster-list'
import { TwitterOpinionTweetSlider } from './twitter-opinion-tweet-slider'
import { TwitterOpinionMapSkeleton } from './twitter-opinion-map-skeleton'
import { TwitterOpinionMapGeneratingOverlay } from './twitter-opinion-map-generating-overlay'
import { calculateGranularity } from '@/lib/data/twitter/opinion-map/time-series'
import { 
  eachHourOfInterval,
  eachDayOfInterval,
  startOfHour,
  startOfDay,
  format
} from 'date-fns'
import type {
  EnrichedTwitterProjection,
  TwitterOpinionCluster,
  TwitterOpinionSession,
  OpinionSelectionState,
  OpinionEvolutionData
} from '@/types'

interface TwitterOpinionMapViewProps {
  zoneId: string
}

// Polling interval
const POLLING_INTERVAL_GENERATING = 3000 // 3s during generation

export function TwitterOpinionMapView({ zoneId }: TwitterOpinionMapViewProps) {
  // State
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<TwitterOpinionSession | null>(null)
  const [projections, setProjections] = useState<EnrichedTwitterProjection[]>([])
  const [clusters, setClusters] = useState<TwitterOpinionCluster[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<OpinionEvolutionData[]>([])
  const [selection, setSelection] = useState<OpinionSelectionState>({ type: 'none' })
  const [activeTab, setActiveTab] = useState<'clusters' | 'tweets'>('clusters')
  
  // Refs for polling management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSessionIdRef = useRef<string | null>(null)
  const lastCompletedSessionIdRef = useRef<string | null>(null) // Track which session we showed toast for
  const mountedRef = useRef(true)

  const supabase = createClient()

  // Check if session is in generating state
  const isGenerating = Boolean(session && [
    'pending',
    'vectorizing',
    'reducing',
    'clustering',
    'labeling'
  ].includes(session.status))

  // Load session data
  const loadSessionData = useCallback(async (silent = false) => {
    try {
      if (!silent && !session) {
        setLoading(true)
      }

      const response = await fetch(
        `/api/twitter/opinion-map/latest?zone_id=${zoneId}`
      )

      if (!response.ok) {
        if (!silent) setLoading(false)
        return
      }

      const data = await response.json()

      if (!mountedRef.current) return

      // Update session
      const newSession = data.session as TwitterOpinionSession | null
      setSession(newSession)

      // Detect session change (new generation started)
      if (newSession && lastSessionIdRef.current !== newSession.session_id) {
        lastSessionIdRef.current = newSession.session_id

        // Clear previous results when new session starts
        if (newSession.status !== 'completed') {
          // Keep old results visible but show overlay
          // Don't clear projections/clusters yet
        }

        // Show toast for new generation
        if (['pending', 'vectorizing'].includes(newSession.status)) {
          toast.info('Opinion map generation started', {
            description: 'Processing posts. This may take a few minutes.'
          })
        }
      }

      // Update results if completed
      if (newSession?.status === 'completed' && data.projections && data.clusters) {
        setProjections(data.projections)
        setClusters(data.clusters)

        // Generate time series data client-side
        const startDate = new Date(newSession.config.start_date)
        const endDate = new Date(newSession.config.end_date)
        const timeSeries = generateTimeSeriesDataClient(
          data.projections,
          data.clusters,
          startDate,
          endDate
        )
        setTimeSeriesData(timeSeries)

        // Show success toast only if this is a NEW completion (not already shown)
        if (lastCompletedSessionIdRef.current !== newSession.session_id) {
          lastCompletedSessionIdRef.current = newSession.session_id
          toast.success('Opinion map generated successfully!', {
            description: `${newSession.total_tweets} posts analyzed in ${newSession.total_clusters} clusters`
          })
        }
      }

      if (!silent) {
        setLoading(false)
      }
    } catch (error) {
      console.error('[Opinion Map] Failed to load session', error)
      if (!silent) {
        setLoading(false)
      }
    }
  }, [zoneId, session])

  // Initial load
  useEffect(() => {
    loadSessionData(false)

    return () => {
      mountedRef.current = false
    }
  }, [zoneId])

  // Setup polling (more reliable than Realtime alone)
  useEffect(() => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Only poll if actively generating
    // Stop polling completely when session is completed to avoid unnecessary requests
    if (isGenerating) {
      pollingIntervalRef.current = setInterval(() => {
        loadSessionData(true)
      }, POLLING_INTERVAL_GENERATING)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isGenerating, loadSessionData])

  // Subscribe to Supabase Realtime (primary mechanism)
  useEffect(() => {
    const channel = supabase
      .channel(`opinion_map_${zoneId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'twitter_opinion_sessions',
          filter: `zone_id=eq.${zoneId}`
        },
        async (payload) => {
          const updatedSession = payload.new as TwitterOpinionSession

          if (!mountedRef.current) return

          setSession(updatedSession)

          // If completed, load results immediately
          if (updatedSession.status === 'completed') {
            await loadSessionData(true)
          } else if (updatedSession.status === 'failed') {
            toast.error('Opinion map generation failed', {
              description: updatedSession.error_message || 'Unknown error'
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'twitter_opinion_sessions',
          filter: `zone_id=eq.${zoneId}`
        },
        (payload) => {
          const newSession = payload.new as TwitterOpinionSession
          if (!mountedRef.current) return
          
          setSession(newSession)
          lastSessionIdRef.current = newSession.session_id
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [zoneId])

  // Client-side time series generation
  function generateTimeSeriesDataClient(
    projections: EnrichedTwitterProjection[],
    clusters: TwitterOpinionCluster[],
    startDate: Date,
    endDate: Date
  ): OpinionEvolutionData[] {
    const granularity = calculateGranularity(
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    )

    // Generate buckets
    const buckets = granularity === 'day'
      ? eachDayOfInterval({ start: startDate, end: endDate })
      : eachHourOfInterval({ start: startDate, end: endDate })

    // Initialize data
    const data: OpinionEvolutionData[] = buckets.map(bucket => {
      const dataPoint: OpinionEvolutionData = {
        date: format(bucket, granularity === 'day' ? 'MMM dd' : 'MMM dd HH:mm')
      }
      clusters.forEach(c => {
        dataPoint[`cluster_${c.cluster_id}`] = 0
      })
      return dataPoint
    })

    // Count tweets per bucket/cluster
    projections.forEach(proj => {
      const tweetDate = new Date(proj.twitter_created_at)
      const normalized = granularity === 'day' ? startOfDay(tweetDate) : startOfHour(tweetDate)
      
      const bucketIndex = buckets.findIndex(b => {
        const bucketNorm = granularity === 'day' ? startOfDay(b) : startOfHour(b)
        return bucketNorm.getTime() === normalized.getTime()
      })

      if (bucketIndex >= 0 && bucketIndex < data.length) {
        const key = `cluster_${proj.cluster_id}` as keyof OpinionEvolutionData
        const current = data[bucketIndex][key]
        if (typeof current === 'number') {
          data[bucketIndex][key] = current + 1
        }
      }
    })

    return data
  }

  const handleGenerate = async (config: {
    start_date: string
    end_date: string
    sample_size: number
  }) => {
    try {
      const response = await fetch('/api/twitter/opinion-map/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneId,
          ...config
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate opinion map')
      }

      const data = await response.json()

      // Create optimistic session state
      const newSession: TwitterOpinionSession = {
        id: data.session_id,
        zone_id: zoneId,
        session_id: data.session_id,
        status: 'pending',
        progress: 0,
        current_phase: null,
        phase_message: null,
        config,
        total_tweets: data.sampled_tweets,
        vectorized_tweets: 0,
        total_clusters: null,
        outlier_count: null,
        execution_time_ms: null,
        error_message: null,
        error_stack: null,
        started_at: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        created_by: null
      }

      setSession(newSession)
      lastSessionIdRef.current = data.session_id

      // Don't clear previous results immediately - they'll be visible under overlay
      // They'll be replaced when new generation completes

      toast.success('Opinion map generation started', {
        description: `Processing ${data.sampled_tweets} posts. Estimated time: ${Math.ceil(data.estimated_time_seconds / 60)} minutes`
      })

      // Trigger immediate poll to catch first update
      setTimeout(() => loadSessionData(true), 1000)
    } catch (error) {
      console.error('[Opinion Map] Generation failed', error)
      toast.error('Failed to start opinion map generation', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const handleCancel = async () => {
    if (!session) return

    try {
      const response = await fetch('/api/twitter/opinion-map/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.session_id })
      })

      if (response.ok) {
        toast.success('Opinion map generation cancelled')
        await loadSessionData(true)
      }
    } catch (error) {
      toast.error('Failed to cancel generation')
    }
  }

  const handleSelectCluster = useCallback((clusterId: number) => {
    // If same cluster or invalid, deselect
    if (clusterId < 0 || (selection.type === 'selected' && clusterId === selection.clusterId)) {
      setSelection({ type: 'none' })
      return
    }

    // Find first tweet in cluster by engagement
    const clusterTweets = projections.filter(p => p.cluster_id === clusterId)
    const firstTweet = clusterTweets.sort((a, b) => 
      b.total_engagement - a.total_engagement
    )[0]

    if (firstTweet) {
      setSelection({
        type: 'selected',
        tweetId: firstTweet.tweet_id,
        clusterId
      })
    }
  }, [projections, selection])

  const handleSelectTweet = useCallback((tweetId: string, clusterId: number) => {
    setSelection({ type: 'selected', tweetId, clusterId })
    setActiveTab('tweets')
  }, [])

  const handleTweetChange = useCallback((tweetId: string) => {
    const tweet = projections.find(p => p.tweet_id === tweetId)
    if (tweet) {
      setSelection({
        type: 'selected',
        tweetId: tweet.tweet_id,
        clusterId: tweet.cluster_id
      })
    }
  }, [projections])

  const handleHoverPoint = useCallback((tweetId: string | null) => {
    // Could add hover effects if needed
  }, [])

  // Initial loading state
  if (loading) {
    return <TwitterOpinionMapSkeleton />
  }

  // Empty state - no session at all
  if (!session || (session.status === 'completed' && projections.length === 0 && clusters.length === 0)) {
    return (
      <div className="space-y-6">
        <TwitterOpinionMapControls
          session={session}
          onGenerate={handleGenerate}
          onCancel={handleCancel}
        />
        
        <Card className="border-border shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="space-y-4 text-center max-w-md">
              <div className="mx-auto h-48 w-48 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-[var(--transition-base)] hover:bg-primary/15">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No Opinion Map Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Generate your first 3D opinion map to visualize opinion clusters and track their evolution over time
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const selectedCluster = selection.type === 'selected'
    ? clusters.find(c => c.cluster_id === selection.clusterId)
    : null

  // Show skeleton if generating and no previous results
  if (isGenerating && projections.length === 0) {
    return (
      <div className="space-y-6">
        <TwitterOpinionMapControls
          session={session}
          onGenerate={handleGenerate}
          onCancel={handleCancel}
        />
        <TwitterOpinionMapSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Controls */}
      <TwitterOpinionMapControls
        session={session}
        onGenerate={handleGenerate}
        onCancel={handleCancel}
      />

      {/* Main content */}
      <div className="relative">
        {/* Generating overlay - shows over existing results */}
        {isGenerating && projections.length > 0 && (
          <TwitterOpinionMapGeneratingOverlay session={session} />
        )}

        {/* Results display */}
        {projections.length > 0 && clusters.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: 3D viz + evolution chart (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* 3D Visualization */}
              <TwitterOpinionMap3D
                projections={projections}
                clusters={clusters}
                selection={selection}
                onSelectCluster={handleSelectCluster}
                onSelectTweet={handleSelectTweet}
                onHoverPoint={handleHoverPoint}
              />

              {/* Evolution Chart */}
              <TwitterOpinionEvolutionChart
                data={timeSeriesData}
                clusters={clusters}
                selection={selection}
                onSelectCluster={handleSelectCluster}
              />
            </div>

            {/* Right: Sidebar with tabs (1/3 width) */}
            <Card className="border-border">
              <Tabs 
                value={activeTab} 
                onValueChange={(v) => setActiveTab(v as 'clusters' | 'tweets')}
              >
                <div className="border-b border-border bg-muted/30">
                  <TabsList className="w-full h-auto bg-transparent p-1 rounded-none gap-1">
                    <TabsTrigger 
                      value="clusters" 
                      className="flex-1 h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all duration-[var(--transition-fast)] hover:text-foreground"
                    >
                      <span className="font-medium">Clusters</span>
                      <Badge variant="secondary" className="ml-2 text-xs font-medium px-1.5 py-0.5 bg-primary/10 text-foreground border-0">
                        {clusters.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="tweets" 
                      className="flex-1 h-10 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all duration-[var(--transition-fast)] hover:text-foreground"
                    >
                      <span className="font-medium">Posts</span>
                      {selectedCluster && (
                        <Badge variant="secondary" className="ml-2 text-xs font-medium px-1.5 py-0.5 bg-primary/10 text-foreground border-0">
                          {selectedCluster.tweet_count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Clusters Tab */}
                <TabsContent value="clusters" className="mt-0">
                  <TwitterOpinionClusterList
                    clusters={clusters}
                    selection={selection}
                    onSelectCluster={handleSelectCluster}
                  />
                </TabsContent>

                {/* Tweets Tab */}
                <TabsContent value="tweets" className="mt-0">
                  {!selectedCluster ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                      <div className="space-y-3 text-center max-w-xs">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                          <svg 
                            className="w-6 h-6 text-muted-foreground" 
                            fill="none" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="2" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Select a Cluster</p>
                          <p className="text-xs text-muted-foreground">
                            Click on the map or choose from the clusters tab to view posts
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <TwitterOpinionTweetSlider
                      projections={projections}
                      cluster={selectedCluster}
                      selection={selection}
                      zoneId={zoneId}
                      onTweetChange={handleTweetChange}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
