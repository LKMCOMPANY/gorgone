"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, RefreshCw, TrendingUp, Eye, Pause, Activity, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn, formatCompactNumber } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { TweetPredictions } from "@/types";

interface EngagementDataPoint {
  timestamp: string;
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  view_count: number;
  total_engagement: number;
  type: "initial" | "snapshot" | "prediction";
}

interface EngagementHistoryData {
  success: boolean;
  tweet: {
    id: string;
    tweet_id: string;
    twitter_created_at: string;
    collected_at: string;
  } | null;
  initial_metrics: EngagementDataPoint | null;
  snapshots: EngagementDataPoint[];
  predictions: TweetPredictions | null;
  tracking_status: {
    tier: string;
    update_count: number;
    last_updated_at: string;
  } | null;
}

interface TwitterEngagementChartProps {
  tweetId: string;
  onMetricsUpdate?: (metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    view_count: number;
  }) => void;
  onTrackingStatusUpdate?: (isCold: boolean) => void;
  onRefreshReady?: (refreshFn: () => Promise<void>) => void;
}

// Chart configurations using Shadcn theming
const reachChartConfig = {
  view_count: {
    label: "Views",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const engagementChartConfig = {
  like_count: {
    label: "Likes",
    color: "var(--chart-1)",
  },
  retweet_count: {
    label: "Retweets",
    color: "var(--chart-2)",
  },
  reply_count: {
    label: "Replies",
    color: "var(--chart-3)",
  },
  quote_count: {
    label: "Quotes",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

// Format timestamp for chart X-axis
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function TwitterEngagementChart({ tweetId, onMetricsUpdate, onTrackingStatusUpdate, onRefreshReady }: TwitterEngagementChartProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<EngagementHistoryData | null>(null);
  const [activeTab, setActiveTab] = useState<"reach" | "engagement">("reach");

  // Fetch engagement history (initial load only)
  const fetchEngagementHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/twitter/engagement/${tweetId}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
        // Notify parent of latest metrics
        const dataPoints = result.snapshots || [];
        const latest = dataPoints.length > 0 
          ? dataPoints[dataPoints.length - 1] 
          : result.initial_metrics;
          
        if (latest && onMetricsUpdate) {
          onMetricsUpdate({
            like_count: latest.like_count,
            retweet_count: latest.retweet_count,
            reply_count: latest.reply_count,
            quote_count: latest.quote_count,
            view_count: latest.view_count,
          });
        }

        // Notify parent of tracking status
        if (onTrackingStatusUpdate && result.tracking_status) {
          onTrackingStatusUpdate(result.tracking_status.tier === "cold");
        }
      } else {
        toast.error("Failed to load engagement data");
      }
    } catch (error) {
      console.error("Failed to fetch engagement history:", error);
      toast.error("Failed to load engagement data");
    } finally {
      setLoading(false);
    }
  }, [tweetId]);

  // Refresh data without full reload
  const refreshData = useCallback(async () => {
    try {
      const response = await fetch(`/api/twitter/engagement/${tweetId}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
        // Notify parent of latest metrics on refresh
        const dataPoints = result.snapshots || [];
        const latest = dataPoints.length > 0 
          ? dataPoints[dataPoints.length - 1] 
          : result.initial_metrics;
          
        if (latest && onMetricsUpdate) {
          onMetricsUpdate({
            like_count: latest.like_count,
            retweet_count: latest.retweet_count,
            reply_count: latest.reply_count,
            quote_count: latest.quote_count,
            view_count: latest.view_count,
          });
        }
      }
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  }, [tweetId]);

  // Trigger manual snapshot
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/twitter/engagement/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweet_id: tweetId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Snapshot created");
        await refreshData();
      } else {
        if (response.status === 404) {
          toast.error("Tweet no longer available");
        } else if (response.status === 503) {
          toast.error("Twitter API unavailable");
        } else {
          toast.error(result.error || "Refresh failed");
        }
      }
    } catch (error) {
      console.error("Failed to refresh:", error);
      toast.error("Network error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEngagementHistory();
  }, [fetchEngagementHistory]);

  // Expose refresh function to parent (once only, on mount)
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(handleRefresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefreshReady]); // Intentionally omit handleRefresh to avoid infinite loop

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="size-40" />
            <Skeleton className="size-34" />
          </div>
          <Skeleton className="size-80" />
        </div>
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-[220px] w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border/60">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || (!data.initial_metrics && data.snapshots.length === 0)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3 max-w-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <TrendingUp className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No data yet</p>
            <p className="text-xs text-muted-foreground">
              Engagement tracking will start soon
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const allDataPoints = [data.initial_metrics, ...data.snapshots].filter(
    (point): point is EngagementDataPoint => point !== null
  );

  // Add prediction points if available
  const predictionPoints: EngagementDataPoint[] = [];
  if (data.predictions && data.snapshots.length > 0) {
    const lastSnapshot = data.snapshots[data.snapshots.length - 1];
    const lastTimestamp = new Date(lastSnapshot.timestamp);

    [1, 2, 3].forEach((hours) => {
      const predTimestamp = new Date(lastTimestamp.getTime() + hours * 60 * 60 * 1000);
      predictionPoints.push({
        timestamp: predTimestamp.toISOString(),
        retweet_count: data.predictions!.engagement.retweets[`p${hours}h` as keyof typeof data.predictions.engagement.retweets] as number,
        reply_count: data.predictions!.engagement.replies[`p${hours}h` as keyof typeof data.predictions.engagement.replies] as number,
        like_count: data.predictions!.engagement.likes[`p${hours}h` as keyof typeof data.predictions.engagement.likes] as number,
        quote_count: data.predictions!.engagement.quotes[`p${hours}h` as keyof typeof data.predictions.engagement.quotes] as number,
        view_count: data.predictions!.reach.views[`p${hours}h` as keyof typeof data.predictions.reach.views] as number,
        total_engagement: 0,
        type: "prediction",
      });
    });
  }

  // Prepare chart data - single unified dataset
  const chartData = [...allDataPoints, ...predictionPoints].map((point) => ({
    time: formatTimestamp(point.timestamp),
    timestamp: point.timestamp,
    type: point.type,
    like_count: point.like_count,
    retweet_count: point.retweet_count,
    reply_count: point.reply_count,
    quote_count: point.quote_count,
    view_count: point.view_count,
  }));

  const latestMetrics = (data.snapshots.length > 0
    ? data.snapshots[data.snapshots.length - 1]
    : data.initial_metrics) || {
      like_count: 0,
      retweet_count: 0,
      reply_count: 0,
      quote_count: 0,
      view_count: 0
    };

  const trackingStatus = data.tracking_status;
  const isCold = trackingStatus?.tier === "cold";
  const hasLimitedData = data.snapshots.length < 3;
  
  // Initial state: 0 snapshots (only initial data) OR only 1 total data point
  // This forces the Big Numbers view until we have at least 1 historical snapshot
  const isInitialState = data.snapshots.length === 0 || allDataPoints.length <= 1;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Tabs with charts - flex-1 to take available space */}
      <div className="flex-1">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "reach" | "engagement")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="engagement" className="gap-1.5 data-[state=active]:shadow-none">
            <TrendingUp className="size-4" />
            <span className="hidden sm:inline">Engagement</span>
          </TabsTrigger>
          <TabsTrigger value="reach" className="gap-1.5 data-[state=active]:shadow-none">
            <Eye className="size-4" />
            <span className="hidden sm:inline">Reach</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-3 mt-4 w-full">
          {isInitialState ? (
            // Initial State View - Big Numbers instead of Chart
            <div className="h-[220px] w-full flex flex-col items-center justify-center gap-6 panel-hud bg-muted/10 border-dashed">
              <div className="grid grid-cols-4 gap-8 text-center">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Likes</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground" style={{ color: "var(--chart-1)" }}>
                    {formatCompactNumber(latestMetrics.like_count)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Retweets</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground" style={{ color: "var(--chart-2)" }}>
                    {formatCompactNumber(latestMetrics.retweet_count)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Replies</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground" style={{ color: "var(--chart-3)" }}>
                    {formatCompactNumber(latestMetrics.reply_count)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Quotes</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground" style={{ color: "var(--chart-4)" }}>
                    {formatCompactNumber(latestMetrics.quote_count)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground/80 mt-2">
                <Clock className="size-3.5 shrink-0" />
                <p className="text-xs leading-tight">
                  Metrics will update hourly to build the trend curve.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chart with smooth data transitions */}
              <ChartContainer config={engagementChartConfig} className="h-[220px] w-full">
                <LineChart 
                  data={chartData} 
                  margin={{ left: 0, right: 12, top: 12, bottom: 12 }}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={formatCompactNumber}
                    width={40}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent className="w-40 bg-background/95 backdrop-blur-sm border-border shadow-lg" />} />
                  
                  {/* Single continuous line per metric */}
              <Line
                dataKey="like_count"
                type="monotone"
                stroke="var(--color-like_count)"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      const key = `like-${index}-${payload.timestamp || payload.snapshot_at}-${payload.type}`;
                      
                      if (payload.type === "prediction") {
                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill="none"
                            stroke="var(--color-like_count)"
                            strokeWidth={2}
                            strokeDasharray="2 2"
                          />
                        );
                      }
                      if (payload.type === "initial") {
                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="var(--color-like_count)"
                            stroke="var(--background)"
                            strokeWidth={2}
                          />
                        );
                      }
                      return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-like_count)" />;
                    }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
              <Line
                dataKey="retweet_count"
                type="monotone"
                stroke="var(--color-retweet_count)"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      const key = `retweet-${index}-${payload.timestamp || payload.snapshot_at}-${payload.type}`;
                      
                      if (payload.type === "prediction") {
                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill="none"
                            stroke="var(--color-retweet_count)"
                            strokeWidth={2}
                            strokeDasharray="2 2"
                          />
                        );
                      }
                      if (payload.type === "initial") {
                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="var(--color-retweet_count)"
                            stroke="var(--background)"
                            strokeWidth={2}
                          />
                        );
                      }
                      return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-retweet_count)" />;
                    }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
              <Line
                dataKey="reply_count"
                type="monotone"
                stroke="var(--color-reply_count)"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      const key = `reply-${index}-${payload.timestamp || payload.snapshot_at}-${payload.type}`;
                      
                      if (payload.type === "prediction") {
                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill="none"
                            stroke="var(--color-reply_count)"
                            strokeWidth={2}
                            strokeDasharray="2 2"
                          />
                        );
                      }
                      if (payload.type === "initial") {
                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="var(--color-reply_count)"
                            stroke="var(--background)"
                            strokeWidth={2}
                          />
                        );
                      }
                      return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-reply_count)" />;
                    }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
              <Line
                dataKey="quote_count"
                type="monotone"
                stroke="var(--color-quote_count)"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      const key = `quote-${index}-${payload.timestamp || payload.snapshot_at}-${payload.type}`;
                      
                      if (payload.type === "prediction") {
                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill="none"
                            stroke="var(--color-quote_count)"
                            strokeWidth={2}
                            strokeDasharray="2 2"
                          />
                        );
                      }
                      if (payload.type === "initial") {
                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="var(--color-quote_count)"
                            stroke="var(--background)"
                            strokeWidth={2}
                          />
                        );
                      }
                      return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-quote_count)" />;
                    }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ChartContainer>

              {/* Stats Summary - Compact & Colored */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border/60">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Likes</p>
                  <p className="text-body font-semibold" style={{ color: "var(--chart-1)" }}>
                    {formatCompactNumber(latestMetrics.like_count)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Retweets</p>
                  <p className="text-body font-semibold" style={{ color: "var(--chart-2)" }}>
                    {formatCompactNumber(latestMetrics.retweet_count)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Replies</p>
                  <p className="text-body font-semibold" style={{ color: "var(--chart-3)" }}>
                    {formatCompactNumber(latestMetrics.reply_count)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Quotes</p>
                  <p className="text-body font-semibold" style={{ color: "var(--chart-4)" }}>
                    {formatCompactNumber(latestMetrics.quote_count)}
                  </p>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="reach" className="space-y-3 mt-4 w-full">
          {isInitialState ? (
            // Initial State View for Reach
            <div className="h-[220px] w-full flex flex-col items-center justify-center gap-6 panel-hud bg-muted/10 border-dashed">
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Views</p>
                <p className="text-4xl font-bold tabular-nums text-foreground" style={{ color: "var(--primary)" }}>
                  {formatCompactNumber(latestMetrics.view_count)}
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground/80">
                <Clock className="size-3.5 shrink-0" />
                <p className="text-xs">
                  Recent tweet. Metrics update hourly.
                </p>
              </div>
            </div>
          ) : (
            // Standard Chart View with smooth transitions
            <ChartContainer config={reachChartConfig} className="h-[220px] w-full">
              <LineChart 
                data={chartData} 
                margin={{ left: 0, right: 12, top: 12, bottom: 12 }}
                accessibilityLayer
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatCompactNumber}
                  width={40}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <ChartTooltip content={<ChartTooltipContent className="w-40 bg-background/95 backdrop-blur-sm border-border shadow-lg" />} />
                
                {/* Single continuous line */}
              <Line
                dataKey="view_count"
                type="monotone"
                stroke="var(--color-view_count)"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    const key = `view-${index}-${payload.timestamp || payload.snapshot_at}-${payload.type}`;
                    
                    if (payload.type === "prediction") {
                      return (
                        <circle
                          key={key}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="none"
                          stroke="var(--color-view_count)"
                          strokeWidth={2}
                          strokeDasharray="2 2"
                        />
                      );
                    }
                    if (payload.type === "initial") {
                      return (
                        <circle
                          key={key}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill="var(--color-view_count)"
                          stroke="var(--background)"
                          strokeWidth={2}
                        />
                      );
                    }
                    return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-view_count)" />;
                  }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          )}

          {/* Stats Summary - Hide in initial state */}
          {!isInitialState && (
            <div className="space-y-1 pt-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground">Total Views</p>
              <p className="text-body font-semibold" style={{ color: "var(--primary)" }}>
                {formatCompactNumber(latestMetrics.view_count)}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>

      {/* Info Message - Pinned to bottom with mt-auto */}
      {isCold && hasLimitedData && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-tactical-amber/5 border border-tactical-amber/20 mt-auto">
          <Info className="size-4 text-tactical-amber shrink-0" />
          <p className="text-xs text-muted-foreground leading-tight">
            Tracking paused due to low activity. <button onClick={handleRefresh} className="text-foreground underline hover:text-primary">Refresh</button> to resume.
          </p>
        </div>
      )}
    </div>
  );
}
