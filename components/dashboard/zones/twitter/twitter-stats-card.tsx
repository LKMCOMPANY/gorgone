"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart } from "recharts";
import { formatCompactNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TrendDataPoint {
  timestamp: string;
  value: number;
}

interface TwitterStatsCardProps {
  label: string;
  value: number;
  previousValue: number;
  trendData: TrendDataPoint[];
}

/**
 * Stats card with value, change indicator, and mini sparkline
 * Compact layout with label + badge on same line
 * Displays metric with percentage change and trend visualization
 */
export function TwitterStatsCard({
  label,
  value,
  previousValue,
  trendData,
}: TwitterStatsCardProps) {
  const percentageChange = calculatePercentageChange(value, previousValue);
  const isPositive = percentageChange > 0;
  const isNeutral = percentageChange === 0;

  // Chart config for the sparkline (using primary color)
  const chartConfig = {
    value: {
      label: label,
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden glass-card",
        "p-4 transition-all duration-[var(--transition-base)]",
        "hover:shadow-xl hover:-translate-y-0.5",
        "border-border/60 hover:border-primary/20"
      )}
    >
      {/* Subtle background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--transition-base)]" />
      
      <div className="relative space-y-3">
        {/* Label + Change Badge on same line */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
            {label}
          </p>
          {!isNeutral && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 px-1.5 font-medium border transition-all duration-200",
                isPositive
                  ? "bg-[var(--tactical-green)]/10 text-[var(--tactical-green)] border-[var(--tactical-green)]/20"
                  : "bg-[var(--tactical-red)]/10 text-[var(--tactical-red)] border-[var(--tactical-red)]/20"
              )}
            >
              {isPositive ? "↑" : "↓"} {Math.abs(percentageChange)}%
            </Badge>
          )}
          {isNeutral && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
              →
            </Badge>
          )}
        </div>

        {/* Value */}
        <div>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {formatCompactNumber(value)}
          </p>
        </div>

        {/* Mini Sparkline (no axes, clean) */}
        {trendData.length > 0 && (
          <div className="h-8 -mb-1 -mx-1">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${label.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7f66ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7f66ff" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#7f66ff"
                  strokeWidth={2}
                  fill={`url(#gradient-${label.replace(/\s+/g, '-')})`}
                  fillOpacity={1}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Calculate percentage change between two values
 */
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

