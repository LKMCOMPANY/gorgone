'use client'

/**
 * Opinion Evolution Chart - Modern Shadcn Implementation
 * Shows cluster evolution over time with interactive selection
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@/components/ui/chart'
import { 
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts'
import type { 
  OpinionEvolutionData,
  TwitterOpinionCluster,
  OpinionSelectionState 
} from '@/types'
import { getOpinionClusterColor } from '@/types'
import { cn } from '@/lib/utils'

interface TwitterOpinionEvolutionChartProps {
  data: OpinionEvolutionData[]
  clusters: TwitterOpinionCluster[]
  selection: OpinionSelectionState
  onSelectCluster: (clusterId: number) => void
}

export function TwitterOpinionEvolutionChart({
  data,
  clusters,
  selection,
  onSelectCluster
}: TwitterOpinionEvolutionChartProps) {
  // Build chart config from clusters
  const chartConfig: ChartConfig = clusters.reduce((config, cluster) => {
    const dataKey = `cluster_${cluster.cluster_id}`
    config[dataKey] = {
      label: cluster.label,
      color: getOpinionClusterColor(cluster.cluster_id)
    }
    return config
  }, {} as ChartConfig)

  const handleClick = (data: any) => {
    // Extract cluster ID from clicked area
    if (data && data.activePayload && data.activePayload[0]) {
      const dataKey = data.activePayload[0].dataKey as string
      const clusterIdMatch = dataKey.match(/cluster_(\d+)/)
      
      if (clusterIdMatch) {
        const clusterId = parseInt(clusterIdMatch[1])
        onSelectCluster(clusterId)
      }
    }
  }

  const selectedClusterId = selection.type === 'selected' ? selection.clusterId : null

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Opinion Evolution</CardTitle>
        <CardDescription>
          Distribution of opinion clusters over time. Click on areas to explore clusters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart 
            data={data}
            onClick={handleClick}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke="hsl(var(--border))"
              opacity={0.5}
            />
            
            <XAxis
              dataKey="date"
              tick={{ 
                fill: 'hsl(var(--muted-foreground))', 
                fontSize: 11 
              }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            
            <YAxis
              tick={{ 
                fill: 'hsl(var(--muted-foreground))', 
                fontSize: 11 
              }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
              tickFormatter={(value) => {
                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
                return value.toString()
              }}
            />
            
            <ChartTooltip
              content={
                <ChartTooltipContent 
                  indicator="line"
                  labelFormatter={(value) => {
                    return `${value}`
                  }}
                  formatter={(value, name) => {
                    const cluster = clusters.find(c => `cluster_${c.cluster_id}` === name)
                    return [
                      `${value} posts`,
                      cluster?.label || name
                    ]
                  }}
                />
              }
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            
            {/* Render areas for each cluster */}
            {clusters
              .sort((a, b) => b.tweet_count - a.tweet_count) // Largest clusters at bottom
              .map((cluster) => {
                const dataKey = `cluster_${cluster.cluster_id}`
                const color = getOpinionClusterColor(cluster.cluster_id)
                const isSelected = selectedClusterId === cluster.cluster_id

                return (
                  <Area
                    key={cluster.cluster_id}
                    type="monotone"
                    dataKey={dataKey}
                    stackId="1"
                    stroke={color}
                    fill={color}
                    fillOpacity={
                      selectedClusterId === null 
                        ? 0.7  // No selection - normal
                        : isSelected 
                          ? 0.9  // Selected cluster - prominent
                          : 0.2  // Other clusters - faded
                    }
                    strokeWidth={isSelected ? 3 : 1.5}
                    strokeOpacity={
                      selectedClusterId === null
                        ? 1
                        : isSelected
                          ? 1
                          : 0.3
                    }
                    name={cluster.label}
                    animationDuration={500}
                    animationEasing="ease-out"
                    className={cn(
                      'transition-all duration-300 cursor-pointer',
                      isSelected && 'drop-shadow-lg'
                    )}
                    style={{
                      filter: isSelected ? `drop-shadow(0 0 8px ${color})` : undefined
                    }}
                  />
                )
              })}
          </AreaChart>
        </ChartContainer>

        {/* Custom Legend - Responsive */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          {clusters
            .sort((a, b) => b.tweet_count - a.tweet_count)
            .map((cluster) => {
              const isSelected = selectedClusterId === cluster.cluster_id
              const color = getOpinionClusterColor(cluster.cluster_id)
              
              return (
                <button
                  key={cluster.cluster_id}
                  onClick={() => onSelectCluster(cluster.cluster_id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-[var(--transition-fast)]',
                    'border hover:border-primary/50 hover:bg-muted/50',
                    isSelected 
                      ? 'border-primary/50 bg-primary/10 text-foreground' 
                      : 'border-border bg-background text-muted-foreground'
                  )}
                >
                  <div
                    className="size-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {cluster.label}
                  </span>
                </button>
              )
            })}
        </div>

        {/* Selection Info */}
        {selectedClusterId !== null && (
          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 animate-in fade-in-0 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getOpinionClusterColor(selectedClusterId) }}
                />
                <span className="text-sm font-medium">
                  {clusters.find(c => c.cluster_id === selectedClusterId)?.label}
                </span>
              </div>
              <button
                onClick={() => onSelectCluster(-1)} // Deselect
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-[var(--transition-fast)] flex-shrink-0"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-6 pt-4 mt-2 border-t border-border">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Data Points</p>
            <p className="text-2xl font-bold tracking-tight">{data.length}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Time Range</p>
            <p className="text-sm font-medium truncate">
              {data.length > 0 ? `${data[0].date} - ${data[data.length - 1].date}` : 'N/A'}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Clusters</p>
            <p className="text-2xl font-bold tracking-tight">{clusters.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
