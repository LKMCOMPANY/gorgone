"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, TrendingUp, Eye, Pause, Activity, Clock, Info } from "lucide-react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

interface EngagementDataPoint {
  timestamp: string;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  total_engagement: number;
  type: "initial" | "snapshot" | "prediction";
}

interface EngagementHistoryData {
  success: boolean;
  video: {
    id: string;
    video_id: string;
    tiktok_created_at: string;
    collected_at: string;
  } | null;
  initial_metrics: EngagementDataPoint | null;
  snapshots: EngagementDataPoint[];
  predictions: any | null;
  tracking_status: {
    tier: string;
    update_count: number;
    last_updated_at: string;
  } | null;
}

interface TikTokEngagementChartProps {
  videoId: string;
  currentStats?: {
    play_count: number;
    digg_count: number;
    comment_count: number;
    share_count: number;
    collect_count: number;
  };
  onTrackingStatusUpdate?: (isCold: boolean) => void;
  onRefreshReady?: (refreshFn: () => Promise<void>) => void;
}

// Chart configurations using Shadcn theming
const reachChartConfig = {
  play_count: {
    label: "Views",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const engagementChartConfig = {
  digg_count: {
    label: "Likes",
    color: "var(--chart-1)",
  },
  comment_count: {
    label: "Comments",
    color: "var(--chart-2)",
  },
  share_count: {
    label: "Shares",
    color: "var(--chart-3)",
  },
  collect_count: {
    label: "Saves",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

// Format timestamp for X-axis (SAME AS TWITTER)
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function TikTokEngagementChart({ videoId, currentStats, onTrackingStatusUpdate, onRefreshReady }: TikTokEngagementChartProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<EngagementHistoryData | null>(null);
  const [activeTab, setActiveTab] = useState<"reach" | "engagement">("reach");

  // Fetch engagement history (SAME AS TWITTER)
  const fetchEngagementHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tiktok/engagement/${videoId}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
        
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
  }, [videoId, onTrackingStatusUpdate]);

  // Refresh data without full reload (SAME AS TWITTER)
  const refreshData = useCallback(async () => {
    try {
      const response = await fetch(`/api/tiktok/engagement/${videoId}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  }, [videoId]);

  // Trigger manual snapshot (SAME AS TWITTER)
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/tiktok/engagement/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_db_id: videoId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Snapshot created");
        await refreshData();
      } else {
        if (response.status === 404) {
          toast.error("Video no longer available");
        } else {
          toast.error(result.error || "Refresh failed");
        }
      }
    } catch (error) {
      console.error("Failed to refresh:", error);
      toast.error("Failed to refresh");
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

  // Loading skeleton (SAME AS TWITTER)
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // No data state (SAME AS TWITTER)
  if (!data || !data.initial_metrics) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold">Engagement Evolution</p>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <div className="space-y-2">
            <p className="text-sm font-medium">No tracking data</p>
            <p className="text-xs text-muted-foreground">
              Engagement tracking will begin once the video is collected
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data (SAME AS TWITTER)
  const allDataPoints = [data.initial_metrics, ...data.snapshots];

  // Add prediction points if available (SAME AS TWITTER)
  const predictionPoints: EngagementDataPoint[] = [];
  if (data.predictions && data.snapshots.length > 0) {
    const lastSnapshot = data.snapshots[data.snapshots.length - 1];
    const lastTimestamp = new Date(lastSnapshot.timestamp);

    [1, 2, 3].forEach((hours) => {
      const predTimestamp = new Date(lastTimestamp.getTime() + hours * 60 * 60 * 1000);
      predictionPoints.push({
        timestamp: predTimestamp.toISOString(),
        play_count: data.predictions!.reach.views[`p${hours}h` as 'p1h' | 'p2h' | 'p3h'],
        digg_count: data.predictions!.engagement.likes[`p${hours}h` as 'p1h' | 'p2h' | 'p3h'],
        comment_count: data.predictions!.engagement.comments[`p${hours}h` as 'p1h' | 'p2h' | 'p3h'],
        share_count: data.predictions!.engagement.shares[`p${hours}h` as 'p1h' | 'p2h' | 'p3h'],
        collect_count: data.predictions!.engagement.saves[`p${hours}h` as 'p1h' | 'p2h' | 'p3h'],
        total_engagement: 0,
        type: "prediction",
      });
    });
  }

  // Prepare chart data - single unified dataset (SAME AS TWITTER)
  const chartData = [...allDataPoints, ...predictionPoints].map((point) => ({
    time: formatTimestamp(point.timestamp),
    timestamp: point.timestamp,
    type: point.type,
    play_count: point.play_count,
    digg_count: point.digg_count,
    comment_count: point.comment_count,
    share_count: point.share_count,
    collect_count: point.collect_count,
  }));

  const latestMetrics = data.snapshots.length > 0
    ? data.snapshots[data.snapshots.length - 1]
    : data.initial_metrics;

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
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="engagement" className="gap-1.5 data-[state=active]:shadow-none h-7 text-xs">
            <TrendingUp className="size-3.5" />
            <span className="hidden sm:inline">Engagement</span>
            <span className="sm:hidden">Eng.</span>
          </TabsTrigger>
          <TabsTrigger value="reach" className="gap-1.5 data-[state=active]:shadow-none h-7 text-xs">
            <Eye className="size-3.5" />
            Reach
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
                    {formatCompactNumber(latestMetrics.digg_count)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Comments</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground" style={{ color: "var(--chart-2)" }}>
                    {formatCompactNumber(latestMetrics.comment_count)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Shares</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground" style={{ color: "var(--chart-3)" }}>
                    {formatCompactNumber(latestMetrics.share_count)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Saves</p>
                  <p className="text-3xl font-bold tabular-nums text-foreground" style={{ color: "var(--chart-4)" }}>
                    {formatCompactNumber(latestMetrics.collect_count)}
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
                dataKey="digg_count"
                type="monotone"
                stroke="var(--color-digg_count)"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  const key = `likes-${index}`;
                  if (payload.type === "prediction") {
                    return (
                      <circle
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="none"
                        stroke="var(--color-digg_count)"
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
                        fill="var(--color-digg_count)"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-digg_count)" />;
                }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              
              {/* Comments Line */}
              <Line
                dataKey="comment_count"
                type="monotone"
                stroke="var(--color-comment_count)"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  const key = `comments-${index}-${payload.timestamp || payload.snapshot_at}-${payload.type}`;
                  
                  if (payload.type === "prediction") {
                    return (
                      <circle
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="none"
                        stroke="var(--color-comment_count)"
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
                        fill="var(--color-comment_count)"
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-comment_count)" />;
                }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              
              {/* Shares Line */}
              <Line
                dataKey="share_count"
                type="monotone"
                stroke="var(--color-share_count)"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  const key = `shares-${index}-${payload.timestamp || payload.snapshot_at}-${payload.type}`;
                  
                  if (payload.type === "prediction") {
                    return (
                      <circle
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="none"
                        stroke="var(--color-share_count)"
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
                        fill="var(--color-share_count)"
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-share_count)" />;
                }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              
              {/* Saves Line */}
              <Line
                dataKey="collect_count"
                type="monotone"
                stroke="var(--color-collect_count)"
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  const key = `saves-${index}-${payload.timestamp || payload.snapshot_at}-${payload.type}`;
                  
                  if (payload.type === "prediction") {
                    return (
                      <circle
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="none"
                        stroke="var(--color-collect_count)"
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
                        fill="var(--color-collect_count)"
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-collect_count)" />;
                }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ChartContainer>

          {/* Stats Summary - Compact & Colored (EXACT SAME AS TWITTER) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border/60">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Likes</p>
              <p className="text-sm font-semibold" style={{ color: "var(--chart-1)" }}>
                {formatCompactNumber(latestMetrics.digg_count)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Comments</p>
              <p className="text-sm font-semibold" style={{ color: "var(--chart-2)" }}>
                {formatCompactNumber(latestMetrics.comment_count)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Shares</p>
              <p className="text-sm font-semibold" style={{ color: "var(--chart-3)" }}>
                {formatCompactNumber(latestMetrics.share_count)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Saves</p>
              <p className="text-sm font-semibold" style={{ color: "var(--chart-4)" }}>
                {formatCompactNumber(latestMetrics.collect_count)}
              </p>
            </div>
          </div>
            </>
          )}
        </TabsContent>

        {/* Reach Tab (VIEWS) */}
        <TabsContent value="reach" className="space-y-3 mt-4 w-full">
          {isInitialState ? (
            // Initial State View for Reach
            <div className="h-[220px] w-full flex flex-col items-center justify-center gap-6 panel-hud bg-muted/10 border-dashed">
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Views</p>
                <p className="text-4xl font-bold tabular-nums text-foreground" style={{ color: "var(--primary)" }}>
                  {formatCompactNumber(latestMetrics.play_count)}
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground/80">
                <Clock className="size-3.5 shrink-0" />
                <p className="text-xs">
                  Recent video. Metrics update hourly.
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
                dataKey="play_count"
                type="monotone"
                stroke="var(--color-play_count)"
                strokeWidth={2}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                    const key = `views-${index}-${payload.timestamp || payload.snapshot_at}-${payload.type}`;
                    
                  if (payload.type === "prediction") {
                    return (
                      <circle
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="none"
                        stroke="var(--color-play_count)"
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
                        fill="var(--color-play_count)"
                          stroke="var(--background)"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle key={key} cx={cx} cy={cy} r={3} fill="var(--color-play_count)" />;
                }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
          )}

          {/* Stats Summary - Hide in initial state */}
          {!isInitialState && (
          <div className="grid grid-cols-1 gap-4 pt-3 border-t border-border/60">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Views</p>
                <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                {formatCompactNumber(latestMetrics.play_count)}
              </p>
            </div>
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
