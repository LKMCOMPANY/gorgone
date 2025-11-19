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
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-heading-2">Opinion Evolution</CardTitle>
        <CardDescription className="text-body-sm">
          Distribution of opinion clusters over time. Click on areas to explore clusters.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <AreaChart 
            data={data}
            onClick={handleClick}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                fontSize: 12 
              }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            
            <YAxis
              tick={{ 
                fill: 'hsl(var(--muted-foreground))', 
                fontSize: 12 
              }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.toLocaleString()}
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
                      `${value} tweets`,
                      cluster?.label || name
                    ]
                  }}
                />
              }
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            
            <ChartLegend 
              content={
                <ChartLegendContent 
                  nameKey="label"
                  className="flex-wrap gap-2 text-body-sm"
                />
              }
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

        {/* Selection Info */}
        {selectedClusterId !== null && (
          <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/5 animate-in fade-in-0 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getOpinionClusterColor(selectedClusterId) }}
                />
                <span className="text-body-sm font-medium">
                  {clusters.find(c => c.cluster_id === selectedClusterId)?.label}
                </span>
              </div>
              <button
                onClick={() => onSelectCluster(-1)} // Deselect
                className="text-body-sm text-muted-foreground hover:text-foreground transition-colors duration-[150ms]"
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-caption text-muted-foreground">Total Data Points</p>
            <p className="text-heading-3 font-semibold">{data.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-caption text-muted-foreground">Time Range</p>
            <p className="text-body-sm font-medium">
              {data.length > 0 ? `${data[0].date} - ${data[data.length - 1].date}` : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-caption text-muted-foreground">Active Clusters</p>
            <p className="text-heading-3 font-semibold">{clusters.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
