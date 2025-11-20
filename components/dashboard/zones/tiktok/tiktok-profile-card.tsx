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

// Stat Row Component (SAME AS TWITTER)
function StatRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className={cn(
        "text-body-sm font-semibold",
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
    <Card className="overflow-hidden transition-all duration-[250ms] hover:border-primary/30 hover:shadow-sm">
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
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-border/50"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border/50">
                  <span className="text-heading-3 font-semibold text-primary">
                    {profile.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-body font-bold truncate">
                  {profile.nickname}
                </h3>
                
                {/* TikTok Verified Badge */}
                {profile.is_verified && (
                  <svg
                    className="h-4 w-4 text-[#20D5EC] flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-caption text-muted-foreground mt-0.5">
                <span>@{profile.username}</span>
              </div>

              {/* View Profile Button */}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-3 w-full sm:w-auto"
              >
                <Link
                  href={`/dashboard/zones/${zoneId}/feed?source=tiktok&view=feed&search=${profile.username}&searchType=user`}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  <span>View Videos</span>
                </Link>
              </Button>
            </div>

            {/* External Link */}
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

          {/* Bio */}
          {profile.signature && (
            <p className="text-body-sm text-muted-foreground leading-relaxed line-clamp-3">
              {profile.signature}
            </p>
          )}

          {/* Profile Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
              <div className="text-heading-3 font-bold">{formatNumber(profile.follower_count)}</div>
              <div className="text-caption text-muted-foreground mt-0.5">Followers</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
              <div className="text-heading-3 font-bold">{formatNumber(profile.following_count)}</div>
              <div className="text-caption text-muted-foreground mt-0.5">Following</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
              <div className="text-heading-3 font-bold">{formatNumber(profile.heart_count)}</div>
              <div className="text-caption text-muted-foreground mt-0.5">Total Likes</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
              <div className="text-heading-3 font-bold">{formatNumber(profile.video_count)}</div>
              <div className="text-caption text-muted-foreground mt-0.5">Videos</div>
            </div>
          </div>
        </div>

        {/* Right Side - Stats Tabs (EXACT 50/50 LIKE TWITTER) */}
        <div className="p-4 sm:p-6 bg-muted/5 border-t lg:border-t-0 lg:border-l border-border/60">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="overview" className="gap-1.5 text-caption">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="engagement" className="gap-1.5 text-caption">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Engagement</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-2 animate-in fade-in-0 duration-200">
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
              <div className="pt-2 pb-2 border-t border-border/30" />
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
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="mt-0 space-y-3 animate-in fade-in-0 duration-200">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted-foreground">Engagement Rate</span>
                  <span className="text-body font-semibold" style={{ color: "var(--chart-1)" }}>
                    {profile.video_count_in_zone > 0 
                      ? `${(profile.total_engagement / profile.video_count_in_zone / 1000).toFixed(1)}K`
                      : "N/A"
                    }
                  </span>
                </div>
                <p className="text-caption text-muted-foreground mt-1">
                  Average engagement per video
                </p>
              </div>

              <div className="space-y-2 pt-2">
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
                <div className="flex items-center gap-2 text-caption">
                  <Activity className="h-3.5 w-3.5 text-chart-2" />
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

