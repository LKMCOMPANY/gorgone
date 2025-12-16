"use client";

/**
 * Opinion Evolution Chart for Chat
 * Displays stacked area chart showing cluster distribution over time
 * Simplified version of TwitterOpinionEvolutionChart for chat context
 */

import * as React from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface ClusterInfo {
  id: number;
  label: string;
  color: string;
}

interface ChatOpinionEvolutionChartProps {
  title: string;
  description?: string;
  /** Time series data with date and cluster_X columns */
  data: Array<Record<string, string | number>>;
  /** Cluster metadata for legend and colors */
  clusters: ClusterInfo[];
  /** Chart config with colors */
  config: Record<string, { label: string; color: string }>;
}

export function ChatOpinionEvolutionChart({
  title,
  description,
  data,
  clusters,
  config,
}: ChatOpinionEvolutionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No evolution data available
        </p>
      </div>
    );
  }

  // Convert config to ChartConfig format
  const chartConfig: ChartConfig = Object.entries(config).reduce(
    (acc, [key, value]) => {
      acc[key] = {
        label: value.label,
        color: value.color,
      };
      return acc;
    },
    {} as ChartConfig
  );

  // Sort clusters by total volume (descending) for better stacking
  const sortedClusters = [...clusters].sort((a, b) => {
    const totalA = data.reduce((sum, d) => sum + (Number(d[`cluster_${a.id}`]) || 0), 0);
    const totalB = data.reduce((sum, d) => sum + (Number(d[`cluster_${b.id}`]) || 0), 0);
    return totalB - totalA;
  });

  return (
    <div className="rounded-xl border border-border/60 bg-background shadow-xs p-4">
      <div className="space-y-1 mb-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <AreaChart
          data={data}
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
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            minTickGap={50}
          />

          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={40}
            tickFormatter={(value) => {
              if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
              return value.toString();
            }}
          />

          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(value) => `${value}`}
                formatter={(value, name) => {
                  const cluster = clusters.find(
                    (c) => `cluster_${c.id}` === name
                  );
                  return [`${value} posts`, cluster?.label || String(name)];
                }}
              />
            }
            cursor={{
              stroke: "hsl(var(--muted-foreground))",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />

          {/* Render stacked areas for each cluster */}
          {sortedClusters.map((cluster) => {
            const dataKey = `cluster_${cluster.id}`;
            return (
              <Area
                key={cluster.id}
                type="monotone"
                dataKey={dataKey}
                stackId="1"
                stroke={cluster.color}
                fill={cluster.color}
                fillOpacity={0.7}
                strokeWidth={1.5}
                name={cluster.label}
                animationDuration={500}
              />
            );
          })}
        </AreaChart>
      </ChartContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/50">
        {sortedClusters.slice(0, 8).map((cluster) => (
          <div
            key={cluster.id}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-muted/50"
          >
            <div
              className="size-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: cluster.color }}
            />
            <span className="truncate max-w-[100px]">{cluster.label}</span>
          </div>
        ))}
        {sortedClusters.length > 8 && (
          <span className="text-xs text-muted-foreground">
            +{sortedClusters.length - 8} more
          </span>
        )}
      </div>
    </div>
  );
}

