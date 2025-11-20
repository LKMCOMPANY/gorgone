"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Play, Music } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { TikTokEngagementChart } from "./tiktok-engagement-chart";

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
  
  const relativeTime = getRelativeTime(video.tiktok_created_at);
  const tiktokUrl = video.share_url || `https://www.tiktok.com/@${video.author?.username}/video/${video.video_id}`;

  // Determine layout class based on chart position (SAME AS TWITTER)
  const layoutClass = !showEngagementChart 
    ? "flex flex-col" 
    : chartPosition === "below"
    ? "flex flex-col"
    : "grid grid-cols-1 lg:grid-cols-2";

  return (
    <Card className="max-w-full overflow-hidden transition-all duration-[250ms] hover:border-primary/30 hover:shadow-sm">
      {/* Content Area - Responsive Layout (SAME AS TWITTER) */}
      <div className={layoutClass}>
        {/* Video Content */}
        <div className="min-w-0 p-4 sm:p-6 space-y-4">
          {/* Compact Header - Meta + Author in one section (SAME AS TWITTER) */}
          <div className="space-y-3">
            {/* Meta Info Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {/* Video Badge */}
                <Badge variant="secondary" className="text-caption font-medium">
                  Video
                </Badge>

                {/* Relative Time */}
                <span className="text-caption text-muted-foreground">
                  {relativeTime}
                </span>

                {/* Profile Tags - Compact */}
                {tags.length > 0 && tags.length <= 2 && (
                  <>
                    {tags.map((tag) => {
                      const colors = TAG_COLORS[tag.tag_type] || TAG_COLORS.target;
                      return (
                        <Badge
                          key={tag.tag_type}
                          variant="outline"
                          className={cn(
                            "text-caption capitalize border hidden sm:inline-flex transition-colors duration-[150ms]",
                            colors.bg,
                            colors.text,
                            colors.border
                          )}
                        >
                          {tag.tag_type.replace("_", " ")}
                        </Badge>
                      );
                    })}
                  </>
                )}
                {tags.length > 2 && (
                  <Badge variant="secondary" className="text-caption hidden sm:inline-flex">
                    +{tags.length} tags
                  </Badge>
                )}
              </div>

              {/* External Link - Compact */}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-primary transition-all duration-[150ms]"
                  title="View on TikTok"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Author Info - Inline (SAME AS TWITTER) */}
            <div className="flex items-start gap-3">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                {video.author?.avatar_thumb && !imageError ? (
                  <img
                    src={video.author.avatar_thumb}
                    alt={video.author.nickname}
                    onError={() => setImageError(true)}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-border/50"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border/50">
                    <span className="text-body-sm font-semibold text-primary">
                      {video.author?.nickname?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}
              </div>

              {/* Author Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-body-sm font-semibold truncate">
                    {video.author?.nickname || "Unknown"}
                  </span>
                  
                  {/* Verified Badge - TikTok Blue */}
                  {video.author?.is_verified && (
                    <svg
                      className="h-3.5 w-3.5 text-[#20D5EC] flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}

                  <span className="text-caption text-muted-foreground">•</span>
                  <span className="text-caption text-muted-foreground truncate">
                    @{video.author?.username || "unknown"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Tags - Show all tags on mobile (SAME AS TWITTER) */}
          {tags.length > 0 && (
            <div className="flex sm:hidden items-center gap-1.5 flex-wrap -mt-1">
              {tags.map((tag) => {
                const colors = TAG_COLORS[tag.tag_type] || TAG_COLORS.target;
                return (
                  <Badge
                    key={tag.tag_type}
                    variant="outline"
                    className={cn(
                      "text-caption capitalize border transition-colors duration-[150ms]",
                      colors.bg,
                      colors.text,
                      colors.border
                    )}
                  >
                    {tag.tag_type.replace("_", " ")}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Description */}
          {video.description && (
            <p className="text-body whitespace-pre-wrap break-words">
              {video.description}
            </p>
          )}

          {/* Video Thumbnail with Play Button (SAME STYLE AS TWITTER MEDIA) */}
          {video.cover_url && (
            <div className="rounded-lg overflow-hidden border border-border">
              <div className="relative aspect-video bg-muted">
                <img
                  src={video.cover_url}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                {/* Video overlay */}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors duration-[150ms]">
                  <div className="h-14 w-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
                {/* Duration badge */}
                {video.duration && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-white text-caption font-medium">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Music Info (SAME STYLE AS QUOTED TWEET) */}
          {video.music_title && (
            <div className="rounded-lg border border-border bg-muted/20 overflow-hidden hover:bg-muted/30 transition-colors duration-[150ms]">
              <div className="p-3 sm:p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium truncate">{video.music_title}</p>
                    {video.music_author && (
                      <p className="text-caption text-muted-foreground truncate">
                        {video.music_author}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
