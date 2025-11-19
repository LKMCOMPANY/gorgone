"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Play, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TwitterTweetWithProfile, TwitterProfileZoneTag } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { TwitterFormattedText } from "./twitter-formatted-text";
import { TwitterEngagementChart } from "./twitter-engagement-chart";

interface TwitterFeedCardProps {
  tweet: TwitterTweetWithProfile;
  tags?: TwitterProfileZoneTag[];
  zoneId: string;
  showEngagementChart?: boolean; // Optional: show engagement evolution chart (default: true)
  chartPosition?: 'side' | 'below'; // Optional: position of engagement chart (default: 'side')
}

interface MediaItem {
  type: "photo" | "video" | "animated_gif";
  url: string;
  preview_image_url?: string;
  duration_ms?: number;
  alt_text?: string;
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

// Get post type from tweet data
function getPostType(tweet: TwitterTweetWithProfile): string {
  // Check if it's a retweet
  if (tweet.raw_data?.retweeted_tweet || tweet.text.startsWith("RT @")) {
    return "Repost";
  }
  
  // Check if it's a quote tweet
  if (tweet.raw_data?.quoted_tweet) {
    return "Quote";
  }
  
  // Check if it's a reply
  if (tweet.is_reply) {
    return "Reply";
  }
  
  return "Post";
}

// Get relative time (e.g., "8 minutes ago")
function getRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

// Extract media from raw_data
function extractMedia(rawData: Record<string, any>): MediaItem[] {
  const media: MediaItem[] = [];
  
  if (!rawData || !rawData.media) return media;

  const mediaArray = Array.isArray(rawData.media) ? rawData.media : [rawData.media];
  
  mediaArray.forEach((item: any) => {
    if (item.type === "photo" && item.media_url_https) {
      media.push({
        type: "photo",
        url: item.media_url_https,
        alt_text: item.alt_text,
      });
    } else if (item.type === "video" && item.video_info) {
      media.push({
        type: "video",
        url: item.video_info.variants?.[0]?.url || "",
        preview_image_url: item.media_url_https,
        duration_ms: item.video_info.duration_millis,
        alt_text: item.alt_text,
      });
    } else if (item.type === "animated_gif" && item.video_info) {
      media.push({
        type: "animated_gif",
        url: item.video_info.variants?.[0]?.url || "",
        preview_image_url: item.media_url_https,
      });
    }
  });

  return media;
}

// Format duration from milliseconds to MM:SS
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function TwitterFeedCard({ tweet, tags = [], zoneId, showEngagementChart = true, chartPosition = 'side' }: TwitterFeedCardProps) {
  const [imageError, setImageError] = useState(false);
  const [mediaErrors, setMediaErrors] = useState<Set<string>>(new Set());
  
  const postType = getPostType(tweet);
  const relativeTime = getRelativeTime(tweet.twitter_created_at);
  const twitterUrl = tweet.twitter_url || tweet.tweet_url;
  const media = extractMedia(tweet.raw_data);
  const quotedTweet = tweet.raw_data?.quoted_tweet as any;

  const handleMediaError = (url: string) => {
    setMediaErrors((prev) => new Set([...prev, url]));
  };

  // Determine layout class based on chart position
  const layoutClass = !showEngagementChart 
    ? "flex flex-col" 
    : chartPosition === 'below'
    ? "flex flex-col"
    : "grid grid-cols-1 lg:grid-cols-2"

  return (
    <Card className="overflow-hidden transition-all duration-[250ms] hover:border-primary/30 hover:shadow-sm">
      {/* Content Area - Responsive Layout */}
      <div className={layoutClass}>
        {/* Tweet Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Compact Header - Meta + Author in one section */}
          <div className="space-y-3">
            {/* Meta Info Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {/* Post Type Badge */}
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-caption font-medium",
                    postType === "Repost" && "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
                    postType === "Reply" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
                    postType === "Quote" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                  )}
                >
                  {postType}
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
                          key={tag.id}
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
                  <Badge
                    variant="secondary"
                    className="text-caption hidden sm:inline-flex"
                  >
                    +{tags.length} tags
                  </Badge>
                )}
              </div>

              {/* External Link - Compact */}
              {twitterUrl && (
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-primary transition-all duration-[150ms]"
                  title="View on X"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Author Info - Inline with action */}
            <div className="flex items-start gap-3">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                {tweet.author.profile_picture_url && !imageError ? (
                  <img
                    src={tweet.author.profile_picture_url}
                    alt={tweet.author.name}
                    onError={() => setImageError(true)}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-border/50"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border/50">
                    <span className="text-body-sm font-semibold text-primary">
                      {tweet.author.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Author Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-body-sm font-semibold truncate">
                    {tweet.author.name}
                  </span>
                  
                  {/* Verified Badge */}
                  {(tweet.author.is_verified || tweet.author.is_blue_verified) && (
                    <svg
                      className="h-3.5 w-3.5 text-blue-500 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                    </svg>
                  )}

                  <span className="text-caption text-muted-foreground">•</span>
                  <span className="text-caption text-muted-foreground truncate">
                    @{tweet.author.username}
                  </span>
                </div>
              </div>

              {/* View Profile Button - Compact */}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                <Link
                  href={`/dashboard/zones/${zoneId}/feed?source=twitter&view=profiles&search=${tweet.author.username}`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Mobile Tags - Show all tags on mobile */}
          {tags.length > 0 && (
            <div className="flex sm:hidden items-center gap-1.5 flex-wrap -mt-1">
              {tags.map((tag) => {
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
          )}

          {/* Tweet Text */}
          <TwitterFormattedText 
            text={tweet.text}
            entities={tweet.raw_data?.entities as any}
          />

          {/* Media Grid */}
          {media.length > 0 && (
            <div className={cn(
              "grid gap-1 rounded-lg overflow-hidden border border-border",
              media.length === 1 && "grid-cols-1",
              media.length === 2 && "grid-cols-2",
              media.length === 3 && "grid-cols-2",
              media.length === 4 && "grid-cols-2"
            )}>
              {media.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className={cn(
                    "relative aspect-video bg-muted",
                    media.length === 3 && index === 0 && "col-span-2"
                  )}
                >
                  {item.type === "photo" && !mediaErrors.has(item.url) ? (
                    <img
                      src={item.url}
                      alt={item.alt_text || "Tweet image"}
                      onError={() => handleMediaError(item.url)}
                      className="w-full h-full object-cover"
                    />
                  ) : item.type === "video" || item.type === "animated_gif" ? (
                    <>
                      {item.preview_image_url && !mediaErrors.has(item.preview_image_url) ? (
                        <img
                          src={item.preview_image_url}
                          alt={item.alt_text || "Video thumbnail"}
                          onError={() => handleMediaError(item.preview_image_url!)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Play className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      {/* Video overlay */}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors duration-[150ms]">
                        <div className="h-14 w-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                      </div>
                      {/* Duration badge */}
                      {item.duration_ms && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-white text-caption font-medium">
                          {formatDuration(item.duration_ms)}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Quoted Tweet */}
          {quotedTweet && (
            <div className="rounded-lg border border-border bg-muted/20 overflow-hidden hover:bg-muted/30 transition-colors duration-[150ms]">
              <div className="p-3 sm:p-4 space-y-2.5">
                {/* Quoted Author - Compact */}
                <div className="flex items-center gap-2">
                  {quotedTweet.author?.profilePicture ? (
                    <img
                      src={quotedTweet.author.profilePicture}
                      alt={quotedTweet.author.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[10px] font-medium">
                        {quotedTweet.author?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-body-sm font-semibold truncate">
                      {quotedTweet.author?.name}
                    </span>
                    {quotedTweet.author?.isBlueVerified && (
                      <svg className="h-3 w-3 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                      </svg>
                    )}
                    <span className="text-caption text-muted-foreground truncate">
                      @{quotedTweet.author?.userName}
                    </span>
                  </div>
                </div>

                {/* Quoted Text */}
                <TwitterFormattedText
                  text={quotedTweet.text || ""}
                  entities={quotedTweet.entities}
                  className="text-body-sm text-muted-foreground line-clamp-3"
                />

                {/* Quoted Media (if any) */}
                {quotedTweet.media && Array.isArray(quotedTweet.media) && quotedTweet.media.length > 0 && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    {quotedTweet.media[0].type === "photo" ? (
                      <img
                        src={quotedTweet.media[0].media_url_https}
                        alt="Quoted tweet media"
                        className="w-full max-h-64 object-cover"
                      />
                    ) : quotedTweet.media[0].type === "video" ? (
                      <div className="relative aspect-video bg-muted">
                        <img
                          src={quotedTweet.media[0].media_url_https}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="h-12 w-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <Play className="h-5 w-5 text-white fill-white" />
                          </div>
                        </div>
                        {quotedTweet.media[0].video_info?.duration_millis && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-white text-caption font-medium">
                            {formatDuration(quotedTweet.media[0].video_info.duration_millis)}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Engagement Chart - Position adaptative (Optional) */}
        {showEngagementChart && (
          <div className={cn(
            "p-4 sm:p-6 bg-muted/5",
            chartPosition === 'below' 
              ? "border-t border-border/60" 
              : "border-t lg:border-t-0 lg:border-l border-border/60"
          )}>
            <div className="animate-in fade-in-0 duration-200">
              <TwitterEngagementChart tweetId={tweet.id} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

