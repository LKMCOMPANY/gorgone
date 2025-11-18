"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, Calendar, BarChart3, TrendingUp, Activity, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { TwitterProfileWithStats } from "@/lib/data/twitter/profiles";
import { formatDistanceToNow } from "date-fns";

interface TwitterProfileCardProps {
  profile: TwitterProfileWithStats;
  zoneId: string;
}

// Tag colors mapping
const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  attila: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-400", border: "border-red-500/20" },
  adversary: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500/20" },
  surveillance: { bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-500/20" },
  target: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "border-blue-500/20" },
  ally: { bg: "bg-green-500/10", text: "text-green-700 dark:text-green-400", border: "border-green-500/20" },
  asset: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", border: "border-purple-500/20" },
  local_team: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-500/20" },
};

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Format percentage
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// Format date
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  } catch {
    return "N/A";
  }
}

export function TwitterProfileCard({ profile, zoneId }: TwitterProfileCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const twitterUrl = profile.twitter_url || profile.profile_url;
  const accountAge = profile.twitter_created_at
    ? formatDistanceToNow(new Date(profile.twitter_created_at), { addSuffix: false })
    : "Unknown";

  // Extract additional data from raw_data (type-safe)
  const rawData = profile.raw_data as any;
  const verifiedType = rawData?.verifiedType as string | null;
  const bioUrls = rawData?.profile_bio?.entities?.url?.urls as Array<{
    url: string;
    display_url: string;
    expanded_url: string;
  }> | undefined;
  const withheldInCountries = rawData?.withheldInCountries as string[] | undefined;
  const fastFollowersCount = (rawData?.fastFollowersCount as number) || 0;
  
  // Check if account has suspicious bot-like behavior (only if > 100)
  const hasSuspiciousActivity = fastFollowersCount > 100;

  return (
    <Card className="overflow-hidden transition-all duration-[250ms] hover:border-primary/30 hover:shadow-sm">
      {/* Header with Tags - Only show if tags exist */}
      {profile.tags && profile.tags.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-caption text-muted-foreground font-medium">Tags:</span>
            {profile.tags.map((tag) => {
              const colors = TAG_COLORS[tag.tag_type] || TAG_COLORS.target;
              return (
                <Badge
                  key={tag.id}
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
        </div>
      )}

      {/* Content - Responsive 50/50 Split (vertical on mobile, horizontal on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side - Profile Data */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {profile.profile_picture_url && !imageError ? (
                <img
                  src={profile.profile_picture_url}
                  alt={profile.name}
                  onError={() => setImageError(true)}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-border/50"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border/50">
                  <span className="text-heading-3 font-semibold text-primary">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-body font-bold truncate">
                  {profile.name}
                </h3>
                
                {/* Verified Badge */}
                {(profile.is_verified || profile.is_blue_verified) && (
                  <svg
                    className="h-4 w-4 text-blue-500 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                  </svg>
                )}

                {/* Verified Type Badge (Government/Business) */}
                {verifiedType && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-caption font-medium",
                      verifiedType === "Government" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
                      verifiedType === "Business" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                    )}
                  >
                    {verifiedType === "Government" ? "🏛️ Gov" : verifiedType === "Business" ? "🏢 Business" : verifiedType}
                  </Badge>
                )}

                {/* Suspicious Activity Warning */}
                {hasSuspiciousActivity && (
                  <Badge
                    variant="outline"
                    className="text-caption font-medium bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
                    title={`${fastFollowersCount} fast followers detected`}
                  >
                    ⚠️ Bot Risk
                  </Badge>
                )}
              </div>
              
              <p className="text-body-sm text-muted-foreground">
                @{profile.username}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-2">
                {/* View Posts Button */}
                <Button
                  asChild
                  variant="default"
                  size="sm"
                >
                  <Link
                    href={`/dashboard/zones/${zoneId}/feed?source=twitter&view=feed&search=${profile.username}&searchType=user`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">View Posts</span>
                    <span className="sm:hidden">Posts</span>
                  </Link>
                </Button>

                {/* External Link */}
                {twitterUrl && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <a
                      href={twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="hidden sm:inline">View on X</span>
                      <span className="sm:hidden">X</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.description && (
            <div className="space-y-1">
              <p className="text-body-sm">{profile.description}</p>
            </div>
          )}

          {/* Bio URLs */}
          {bioUrls && bioUrls.length > 0 && (
            <div className="space-y-1.5">
              {bioUrls.map((link, index) => (
                <a
                  key={`bio-link-${index}`}
                  href={link.expanded_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-body-sm text-primary hover:text-primary/80 transition-colors duration-[150ms]"
                >
                  <svg 
                    className="h-4 w-4 flex-shrink-0" 
                    fill="none" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="truncate group-hover:underline">{link.display_url}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-[150ms]" />
                </a>
              ))}
            </div>
          )}

          {/* Censorship Alert */}
          {withheldInCountries && withheldInCountries.length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-body-sm font-semibold text-red-700 dark:text-red-400">
                    Content Censored
                  </p>
                  <p className="text-caption text-red-600 dark:text-red-400">
                    Restricted in: {withheldInCountries.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="space-y-2 text-body-sm text-muted-foreground">
            {profile.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.twitter_created_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>
                  Joined {formatDate(profile.twitter_created_at)} • {accountAge}
                </span>
              </div>
            )}
          </div>

          {/* Key Metrics - Compact & Elegant */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3 transition-colors duration-[150ms] hover:bg-muted/40">
              <p className="text-caption text-muted-foreground font-medium">Followers</p>
              <p className="text-heading-3 font-bold mt-1">
                {formatNumber(profile.followers_count)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 transition-colors duration-[150ms] hover:bg-muted/40">
              <p className="text-caption text-muted-foreground font-medium">Following</p>
              <p className="text-heading-3 font-bold mt-1">
                {formatNumber(profile.following_count)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 transition-colors duration-[150ms] hover:bg-muted/40">
              <p className="text-caption text-muted-foreground font-medium">Total Tweets</p>
              <p className="text-heading-3 font-bold mt-1">
                {formatNumber(profile.tweets_count)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 transition-colors duration-[150ms] hover:bg-muted/40">
              <p className="text-caption text-muted-foreground font-medium">Likes</p>
              <p className="text-heading-3 font-bold mt-1">
                {formatNumber(profile.favourites_count)}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Statistics Tabs */}
        <div className="border-t lg:border-t-0 lg:border-l border-border/60 p-4 sm:p-6 bg-muted/5">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4 w-full grid grid-cols-3">
              <TabsTrigger 
                value="overview" 
                className="gap-1.5 data-[state=active]:shadow-none"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="engagement" 
                className="gap-1.5 data-[state=active]:shadow-none"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Engagement</span>
              </TabsTrigger>
              <TabsTrigger 
                value="ratios" 
                className="gap-1.5 data-[state=active]:shadow-none"
              >
                <Activity className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ratios</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-2 animate-in fade-in-0 duration-200">
              <StatRow
                label="Tweets in Zone"
                value={formatNumber(profile.tweet_count)}
                highlight={profile.tweet_count > 10}
              />
              <StatRow
                label="Total Engagement"
                value={formatNumber(profile.total_engagement)}
                highlight={profile.total_engagement > 100}
              />
              <StatRow
                label="Avg Engagement"
                value={profile.avg_engagement_per_tweet.toFixed(1)}
              />
              <div className="pt-2 pb-2 border-t border-border/30" />
              <StatRow
                label="Total Likes"
                value={formatNumber(profile.total_likes)}
              />
              <StatRow
                label="Total Retweets"
                value={formatNumber(profile.total_retweets)}
              />
              <StatRow
                label="Total Replies"
                value={formatNumber(profile.total_replies)}
              />
              <StatRow
                label="Total Quotes"
                value={formatNumber(profile.total_quotes)}
              />
              <StatRow
                label="Total Views"
                value={formatNumber(profile.total_views)}
              />
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="mt-0 space-y-4 animate-in fade-in-0 duration-200">
              <div className="space-y-4">
                <ProgressBar
                  label="Likes"
                  value={profile.total_likes}
                  max={profile.total_engagement}
                  color="bg-pink-500"
                />
                <ProgressBar
                  label="Retweets"
                  value={profile.total_retweets}
                  max={profile.total_engagement}
                  color="bg-green-500"
                />
                <ProgressBar
                  label="Replies"
                  value={profile.total_replies}
                  max={profile.total_engagement}
                  color="bg-blue-500"
                />
                <ProgressBar
                  label="Quotes"
                  value={profile.total_quotes}
                  max={profile.total_engagement}
                  color="bg-purple-500"
                />
              </div>

              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-muted-foreground">Total Engagement</span>
                  <span className="font-semibold">{formatNumber(profile.total_engagement)}</span>
                </div>
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-muted-foreground">Avg per Tweet</span>
                  <span className="font-semibold">{profile.avg_engagement_per_tweet.toFixed(1)}</span>
                </div>
              </div>
            </TabsContent>

            {/* Ratios Tab */}
            <TabsContent value="ratios" className="mt-0 space-y-4 animate-in fade-in-0 duration-200">
              <div className="space-y-2">
                <StatRow
                  label="Original Posts"
                  value={`${formatNumber(profile.original_posts)} (${formatPercentage(profile.original_ratio)})`}
                />
                <StatRow
                  label="Replies"
                  value={`${formatNumber(profile.replies)} (${formatPercentage(profile.reply_ratio)})`}
                />
                <StatRow
                  label="Retweets"
                  value={`${formatNumber(profile.retweets)} (${formatPercentage(profile.retweet_ratio)})`}
                />
              </div>

              <div className="pt-4 space-y-3">
                <ProgressBar
                  label="Original Ratio"
                  value={profile.original_ratio * 100}
                  max={100}
                  color="bg-blue-500"
                  showPercentage
                />
                <ProgressBar
                  label="Reply Ratio"
                  value={profile.reply_ratio * 100}
                  max={100}
                  color="bg-green-500"
                  showPercentage
                />
                <ProgressBar
                  label="Retweet Ratio"
                  value={profile.retweet_ratio * 100}
                  max={100}
                  color="bg-purple-500"
                  showPercentage
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Card>
  );
}

// Helper component for stat rows
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
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0 transition-colors duration-[150ms] hover:bg-muted/20 px-2 -mx-2 rounded">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className={cn(
        "text-body-sm font-semibold tabular-nums",
        highlight && "text-primary"
      )}>
        {value}
      </span>
    </div>
  );
}

// Helper component for progress bars
function ProgressBar({
  label,
  value,
  max,
  color,
  showPercentage = false,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  showPercentage?: boolean;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const displayValue = showPercentage ? `${percentage.toFixed(1)}%` : formatNumber(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-body-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-semibold tabular-nums">{displayValue}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            color
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

