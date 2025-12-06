"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, Calendar, BarChart3, TrendingUp, Activity, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { TikTokProfileWithStats } from "@/lib/data/tiktok/profiles-stats";
import { formatDistanceToNow } from "date-fns";

interface TikTokProfileCardProps {
  profile: TikTokProfileWithStats;
  zoneId: string;
}

// Tag colors (SAME AS TWITTER)
const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  attila: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-400", border: "border-red-500/20" },
  adversary: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500/20" },
  surveillance: { bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-500/20" },
  target: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "border-blue-500/20" },
  ally: { bg: "bg-green-500/10", text: "text-green-700 dark:text-green-400", border: "border-green-500/20" },
  asset: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", border: "border-purple-500/20" },
  local_team: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-500/20" },
};

// Format numbers (SAME AS TWITTER)
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

// Stat Row Component (Design System Data List Item)
function StatRow({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
}) {
  return (
    <div className="data-list-item group">
      <span className="data-list-label group-hover:text-foreground transition-colors duration-[var(--transition-fast)]">
        {label}
      </span>
      <span className={cn(
        "data-list-value font-mono",
        highlight && "text-primary"
      )}>
        {value}
      </span>
    </div>
  );
}

export function TikTokProfileCard({ profile, zoneId }: TikTokProfileCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const tiktokUrl = `https://www.tiktok.com/@${profile.username}`;

  return (
    <Card className="glass-card overflow-hidden transition-all duration-[var(--transition-base)] hover:border-primary/30 hover:shadow-lg">
      {/* Card Header - Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          {/* View Videos Button */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <Link
              href={`/dashboard/zones/${zoneId}/feed?source=tiktok&view=feed&search=${profile.username}&searchType=user`}
            >
              <FileText className="size-3.5" />
              <span className="hidden sm:inline">View Videos</span>
              <span className="sm:hidden">Videos</span>
            </Link>
          </Button>

          {/* External Link */}
          {tiktokUrl && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">View on TikTok</span>
                <span className="sm:hidden">TikTok</span>
              </a>
            </Button>
          )}
        </div>

        {/* Verified Badge (if needed, mimicking Twitter Logic) */}
        {profile.is_verified && (
          <Badge
            variant="secondary"
            className="text-xs font-medium gap-1.5 pl-2 h-7 bg-chart-2/10 text-chart-2 border-chart-2/20"
          >
            Verified
          </Badge>
        )}
      </div>

      {/* Header with Tags - Only show if tags exist */}
      {profile.tags && profile.tags.length > 0 && (
        <div className="px-4 sm:px-6 py-2 border-b border-border/60 bg-muted/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Tags:</span>
            {profile.tags.map((tag) => {
              const colors = TAG_COLORS[tag.tag_type] || TAG_COLORS.target;
              return (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={cn(
                    "text-xs capitalize border transition-colors duration-[var(--transition-fast)]",
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
        </div>
      )}

      {/* Content - 50/50 Split (EXACT SAME AS TWITTER) */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side - Profile Data */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {profile.avatar_thumb && !imageError ? (
                <img
                  src={profile.avatar_thumb}
                  alt={profile.nickname}
                  onError={() => setImageError(true)}
                  className="size-16 rounded-full object-cover ring-2 ring-border/50"
                />
              ) : (
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border/50">
                  <span className="text-lg font-semibold font-semibold text-primary">
                    {profile.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold truncate">
                  {profile.nickname}
                </h3>
                
                {/* TikTok Verified Icon */}
                {profile.is_verified && (
                  <svg
                    className="size-4 text-chart-2 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                @{profile.username}
              </p>
            </div>
          </div>

          {/* Bio */}
          {profile.signature && (
            <div className="space-y-1">
              <p className="text-sm leading-relaxed">{profile.signature}</p>
            </div>
          )}

          {/* Profile Stats Grid (Nested Card Pattern) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background border border-border/60 shadow-xs p-3 transition-colors duration-[var(--transition-fast)] hover:border-primary/30">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Followers</p>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums">
                {formatNumber(profile.follower_count)}
              </p>
            </div>
            <div className="rounded-lg bg-background border border-border/60 shadow-xs p-3 transition-colors duration-[var(--transition-fast)] hover:border-primary/30">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Following</p>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums">
                {formatNumber(profile.following_count)}
              </p>
            </div>
            <div className="rounded-lg bg-background border border-border/60 shadow-xs p-3 transition-colors duration-[var(--transition-fast)] hover:border-primary/30">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Likes</p>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums">
                {formatNumber(profile.heart_count)}
              </p>
            </div>
            <div className="rounded-lg bg-background border border-border/60 shadow-xs p-3 transition-colors duration-[var(--transition-fast)] hover:border-primary/30">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Videos</p>
              <p className="text-lg font-bold mt-1 font-mono tabular-nums">
                {formatNumber(profile.video_count)}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Stats Tabs */}
        <div className="border-t lg:border-t-0 lg:border-l border-border/60 p-4 sm:p-6 bg-muted/5">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4 w-full grid grid-cols-2">
              <TabsTrigger 
                value="overview" 
                className="gap-1.5 data-[state=active]:shadow-none"
              >
                <BarChart3 className="size-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="engagement" 
                className="gap-1.5 data-[state=active]:shadow-none"
              >
                <TrendingUp className="size-3.5" />
                <span className="hidden sm:inline">Engagement</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-2 animate-in fade-in-0 duration-200">
              <div className="data-list">
              <StatRow
                label="Videos in Zone"
                value={formatNumber(profile.video_count_in_zone)}
                highlight={profile.video_count_in_zone > 10}
              />
              <StatRow
                label="Total Engagement"
                value={formatNumber(profile.total_engagement)}
                highlight={profile.total_engagement > 100000}
              />
              <StatRow
                label="Avg Engagement"
                value={profile.avg_engagement_per_video.toFixed(1)}
              />
                <div className="my-2 h-px bg-border/50" />
              <StatRow
                label="Total Views"
                value={formatNumber(profile.total_play_count)}
              />
              <StatRow
                label="Total Likes"
                value={formatNumber(profile.total_digg_count)}
              />
              <StatRow
                label="Total Comments"
                value={formatNumber(profile.total_comment_count)}
              />
              <StatRow
                label="Total Shares"
                value={formatNumber(profile.total_share_count)}
              />
              <StatRow
                label="Total Saves"
                value={formatNumber(profile.total_collect_count)}
              />
              </div>
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="mt-0 space-y-3 animate-in fade-in-0 duration-200">
              <div className="rounded-lg bg-background border border-border/60 shadow-xs p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Engagement Rate</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-chart-1">
                    {profile.video_count_in_zone > 0 
                      ? `${(profile.total_engagement / profile.video_count_in_zone / 1000).toFixed(1)}K`
                      : "N/A"
                    }
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average engagement per video
                </p>
              </div>

              <div className="data-list pt-2">
                <StatRow
                  label="Views per Video"
                  value={profile.video_count_in_zone > 0 
                    ? formatNumber(Math.round(profile.total_play_count / profile.video_count_in_zone))
                    : "0"
                  }
                />
                <StatRow
                  label="Likes per Video"
                  value={profile.video_count_in_zone > 0 
                    ? formatNumber(Math.round(profile.total_digg_count / profile.video_count_in_zone))
                    : "0"
                  }
                />
                <StatRow
                  label="Comments per Video"
                  value={profile.video_count_in_zone > 0 
                    ? formatNumber(Math.round(profile.total_comment_count / profile.video_count_in_zone))
                    : "0"
                  }
                />
              </div>

              {/* Activity Indicator */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 mt-4">
                <div className="flex items-center gap-2 text-xs">
                  <Activity className="size-3.5 text-chart-2" />
                  <span className="text-muted-foreground">
                    Last seen {formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Card>
  );
}

