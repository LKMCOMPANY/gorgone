"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Play, Music, Video, RefreshCw, User, Activity, Snowflake } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { TikTokEngagementChart } from "./tiktok-engagement-chart";

import { Button } from "@/components/ui/button";

interface TikTokVideoWithProfile {
  id: string;
  video_id: string;
  description?: string;
  duration?: number;
  cover_url?: string;
  share_url?: string;
  tiktok_created_at: string;
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  collect_count: number;
  total_engagement: number;
  music_title?: string;
  music_author?: string;
  is_ad: boolean;
  raw_data: any;
  author?: {
    id: string;
    username: string;
    nickname: string;
    avatar_thumb?: string;
    is_verified: boolean;
  };
}

interface TikTokVideoCardProps {
  video: TikTokVideoWithProfile;
  tags?: Array<{ tag_type: string }>;
  zoneId: string;
  showEngagementChart?: boolean;
  chartPosition?: "side" | "below";
}

// Tag colors (same as Twitter)
const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  attila: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-400", border: "border-red-500/20" },
  adversary: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500/20" },
  surveillance: { bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-500/20" },
  target: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "border-blue-500/20" },
  ally: { bg: "bg-green-500/10", text: "text-green-700 dark:text-green-400", border: "border-green-500/20" },
  asset: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", border: "border-purple-500/20" },
  local_team: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-500/20" },
};

// Format duration from seconds to MM:SS
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Get relative time
function getRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

export function TikTokVideoCard({ 
  video, 
  tags = [], 
  zoneId, 
  showEngagementChart = true, 
  chartPosition = "side" 
}: TikTokVideoCardProps) {
  const [imageError, setImageError] = useState(false);
  const [refreshFn, setRefreshFn] = useState<(() => Promise<void>) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trackingIsCold, setTrackingIsCold] = useState<boolean | null>(null);
  
  const relativeTime = getRelativeTime(video.tiktok_created_at);
  const tiktokUrl = video.share_url || `https://www.tiktok.com/@${video.author?.username}/video/${video.video_id}`;

  const handleTrackingStatusUpdate = useCallback((isCold: boolean) => {
    setTrackingIsCold(isCold);
  }, []);

  const handleRefreshReady = useCallback((fn: () => Promise<void>) => {
    setRefreshFn(() => fn);
  }, []);

  const handleRefreshClick = async () => {
    if (refreshFn) {
      setIsRefreshing(true);
      await refreshFn();
      setIsRefreshing(false);
    }
  };

  // Determine layout class based on chart position (SAME AS TWITTER)
  const layoutClass = !showEngagementChart 
    ? "flex flex-col" 
    : chartPosition === "below"
    ? "flex flex-col"
    : "grid grid-cols-1 lg:grid-cols-2";

  return (
    <Card className="max-w-full card-interactive glass overflow-hidden shadow-sm p-0">
      {/* Card Header - Metadata & Context */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/10">
        {/* Left: Video Context */}
        <div className="flex items-center gap-2.5">
          {/* Type Badge */}
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-2 font-medium gap-1.5"
          >
            <Video className="size-2.5" />
                  Video
                </Badge>

          {/* Separator */}
          <div className="h-3 w-px bg-border/50" />

          {/* Time */}
          <span className="text-xs text-muted-foreground font-medium">
                  {relativeTime}
                </span>

          {/* External Link */}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
                  title="View on TikTok"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>

        {/* Right: App Context */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          {showEngagementChart && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="text-muted-foreground hover:text-foreground"
              title="Refresh metrics"
            >
              <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            </Button>
          )}

          {/* View Profile Button */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1.5"
          >
            <Link
              href={`/dashboard/zones/${zoneId}/feed?source=tiktok&view=profiles&search=${video.author?.username}`}
            >
              <User className="size-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
          </Button>

          {/* Tracking Status Badge */}
          {trackingIsCold !== null && (
            <Badge 
              variant={trackingIsCold ? "outline" : "outline-success"}
              className="gap-1 text-[10px] h-5 px-1.5"
            >
              {trackingIsCold ? (
                <>
                  <Snowflake className="size-2.5" />
                  <span className="hidden sm:inline">Cold</span>
                </>
              ) : (
                <>
                  <Activity className="size-2.5" />
                  <span className="hidden sm:inline">Active</span>
                </>
              )}
            </Badge>
          )}
        </div>
      </div>

      {/* Content Area - Responsive Layout */}
      <div className={layoutClass}>
        {/* Video Content */}
        <div className="p-4 min-w-0 flex-1">
          <div className="flex gap-3 p-4 rounded-xl bg-background border border-border/60 shadow-xs transition-colors duration-[var(--transition-fast)]">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="size-10 rounded-full overflow-hidden bg-muted border border-border/50 shadow-sm">
                {video.author?.avatar_thumb && !imageError ? (
                  <img
                    src={video.author.avatar_thumb}
                    alt={video.author.nickname}
                    className="size-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-muted text-muted-foreground">
                    <span className="text-xs font-bold">
                      {video.author?.nickname?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Header: Name, Handle (TikTok Native) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <span className="font-bold text-[15px] truncate text-foreground">
                    {video.author?.nickname || "Unknown"}
                  </span>
                  {video.author?.is_verified && (
                    <svg className="size-3.5 text-[#20D5EC] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="text-[15px] text-muted-foreground truncate">
                    @{video.author?.username}
                  </span>
          </div>

                {/* Tags */}
          {tags.length > 0 && (
                  <div className="flex shrink-0 gap-1">
                    {tags.slice(0, 1).map((tag) => (
                  <Badge
                    key={tag.tag_type}
                    variant="outline"
                        className="h-5 px-1.5 text-[10px] font-normal border-border bg-background"
                  >
                    {tag.tag_type.replace("_", " ")}
                  </Badge>
                    ))}
            </div>
          )}
              </div>

              {/* Video Description */}
              <div className="text-[15px] leading-normal text-foreground whitespace-pre-wrap break-words pt-0.5">
              {video.description}
              </div>

              {/* Video Player / Thumbnail */}
          {video.cover_url && (
                <div className="pt-2">
                  <div className="rounded-xl overflow-hidden border border-border/60 bg-black max-w-[240px] mx-auto sm:mx-0">
                    <div className="relative aspect-[9/16] group cursor-pointer">
                <img
                  src={video.cover_url}
                        alt="Video content"
                        className="size-full object-cover"
                />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <div className="size-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/30 transition-transform duration-200 group-hover:scale-110">
                          <Play className="size-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
                      {/* Duration Badge */}
                {video.duration && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-medium text-white tabular-nums">
                    {formatDuration(video.duration)}
                  </div>
                )}
                    </div>
              </div>
            </div>
          )}

              {/* Music Info */}
          {video.music_title && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer w-fit">
                  <Music className="size-3" />
                  <span className="truncate max-w-[200px]">{video.music_title} - {video.music_author}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Engagement Chart - Position adaptative (EXACT SAME AS TWITTER) */}
        {showEngagementChart && (
          <div className={cn(
            "p-4 sm:p-6 bg-muted/5",
            chartPosition === "below" 
              ? "border-t border-border/60" 
              : "border-t lg:border-t-0 lg:border-l border-border/60"
          )}>
            <div className="animate-in fade-in-0 duration-200">
              <TikTokEngagementChart 
                videoId={video.id}
                currentStats={{
                  play_count: video.play_count,
                  digg_count: video.digg_count,
                  comment_count: video.comment_count,
                  share_count: video.share_count,
                  collect_count: video.collect_count,
                }}
                onTrackingStatusUpdate={handleTrackingStatusUpdate}
                onRefreshReady={handleRefreshReady}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
