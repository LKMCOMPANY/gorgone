"use client";

import * as React from "react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

interface ChatChartProps {
  type: "line" | "bar" | "area";
  title: string;
  data: Array<{ timestamp: string; value: number; label: string }>;
  config: ChartConfig;
}

export function ChatChart({ type, title, data, config }: ChatChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No data available for visualization
        </p>
      </div>
    );
  }

  // Common chart props
  const commonProps = {
    data,
    margin: { top: 5, right: 10, left: 10, bottom: 5 },
  };

  const commonGridProps = {
    strokeDasharray: "3 3",
    stroke: "var(--border)",
    opacity: 0.3,
  };

  const commonAxisProps = {
    stroke: "var(--muted-foreground)",
    fontSize: 12,
    tickLine: false,
    axisLine: false,
  };

  return (
    <div className="my-3 rounded-xl border border-border/60 bg-background shadow-xs p-3 max-w-full overflow-hidden">
      <h4 className="text-sm font-semibold mb-3 break-words uppercase tracking-wider text-muted-foreground">{title}</h4>
      
      {type === "line" && (
        <ChartContainer config={config} className="h-[180px] w-full max-w-full">
          <LineChart {...commonProps}>
            <CartesianGrid {...commonGridProps} vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              {...commonAxisProps}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickMargin={6}
            />
            <YAxis
              {...commonAxisProps}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickFormatter={(value) => value.toLocaleString()}
              tickMargin={6}
              width={35}
            />
            <ChartTooltip content={<ChartTooltipContent className="text-xs" />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ fill: "var(--chart-1)", r: 3 }}
              activeDot={{ r: 5, fill: "var(--chart-1)" }}
            />
          </LineChart>
        </ChartContainer>
      )}

      {type === "bar" && (
        <ChartContainer config={config} className="h-[180px] w-full max-w-full">
          <BarChart {...commonProps}>
            <CartesianGrid {...commonGridProps} vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              {...commonAxisProps}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickMargin={6}
            />
            <YAxis
              {...commonAxisProps}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickFormatter={(value) => value.toLocaleString()}
              tickMargin={6}
              width={35}
            />
            <ChartTooltip content={<ChartTooltipContent className="text-xs" />} />
            <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}

      {type === "area" && (
        <ChartContainer config={config} className="h-[180px] w-full max-w-full">
          <AreaChart {...commonProps}>
            <CartesianGrid {...commonGridProps} vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              {...commonAxisProps}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickMargin={6}
            />
            <YAxis
              {...commonAxisProps}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickFormatter={(value) => value.toLocaleString()}
              tickMargin={6}
              width={35}
            />
            <ChartTooltip content={<ChartTooltipContent className="text-xs" />} />
            <Area
              type="monotone"
              dataKey="value"
              fill="var(--chart-1)"
              fillOpacity={0.2}
              stroke="var(--chart-1)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
