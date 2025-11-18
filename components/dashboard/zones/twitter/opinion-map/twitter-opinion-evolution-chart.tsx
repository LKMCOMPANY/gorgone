'use client'

/**
 * Opinion Evolution Chart
 * Shows how clusters evolve over time using stacked area chart
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { 
  OpinionEvolutionData,
  TwitterOpinionCluster,
  OpinionSelectionState 
} from '@/types'
import { getOpinionClusterColor } from '@/types'

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-2">Opinion Evolution</CardTitle>
        <CardDescription className="text-body-sm">
          Distribution of opinion clusters over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart 
            data={data}
            onClick={handleClick}
            className="cursor-pointer"
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem'
              }}
              labelStyle={{
                color: 'var(--foreground)',
                fontWeight: 600,
                marginBottom: '0.5rem'
              }}
            />
            
            <Legend
              wrapperStyle={{
                fontSize: '0.75rem',
                paddingTop: '1rem'
              }}
              iconType="circle"
            />
            
            {/* Render areas for each cluster */}
            {clusters.map((cluster, i) => {
              const dataKey = `cluster_${cluster.cluster_id}`
              const color = getOpinionClusterColor(cluster.cluster_id)
              const isSelected = selection.type === 'selected' && 
                                selection.clusterId === cluster.cluster_id

              return (
                <Area
                  key={cluster.cluster_id}
                  type="monotone"
                  dataKey={dataKey}
                  stackId="1"
                  stroke={color}
                  fill={color}
                  fillOpacity={isSelected ? 0.8 : 0.6}
                  strokeWidth={isSelected ? 2 : 1}
                  name={cluster.label}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

