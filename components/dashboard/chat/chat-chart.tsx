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
    <div className="my-4 rounded-lg border border-border bg-card p-4 max-w-full overflow-hidden">
      <h4 className="text-body font-semibold mb-4 break-words">{title}</h4>
      
      {type === "line" && (
        <ChartContainer config={config} className="h-[200px] w-full max-w-full">
          <LineChart {...commonProps}>
            <CartesianGrid {...commonGridProps} />
            <XAxis dataKey="timestamp" {...commonAxisProps} />
            <YAxis
              {...commonAxisProps}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ fill: "var(--primary)", r: 3 }}
              activeDot={{ r: 5, fill: "var(--primary)" }}
            />
          </LineChart>
        </ChartContainer>
      )}

      {type === "bar" && (
        <ChartContainer config={config} className="h-[200px] w-full max-w-full">
          <BarChart {...commonProps}>
            <CartesianGrid {...commonGridProps} />
            <XAxis dataKey="timestamp" {...commonAxisProps} />
            <YAxis
              {...commonAxisProps}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}

      {type === "area" && (
        <ChartContainer config={config} className="h-[200px] w-full max-w-full">
          <AreaChart {...commonProps}>
            <CartesianGrid {...commonGridProps} />
            <XAxis dataKey="timestamp" {...commonAxisProps} />
            <YAxis
              {...commonAxisProps}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="value"
              fill="var(--primary)"
              fillOpacity={0.2}
              stroke="var(--primary)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
