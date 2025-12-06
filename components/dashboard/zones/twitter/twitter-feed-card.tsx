"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Play, User, Snowflake, Activity, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCompactNumber } from "@/lib/utils";
import type { TwitterTweetWithProfile, TwitterProfileZoneTag, TwitterOpinionCluster } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { TwitterFormattedText } from "./twitter-formatted-text";
import { TwitterEngagementChart } from "./twitter-engagement-chart";
import { TwitterClusterBadge } from "./twitter-cluster-badge";

interface TwitterFeedCardProps {
  tweet: TwitterTweetWithProfile;
  tags?: TwitterProfileZoneTag[];
  zoneId: string;
  showEngagementChart?: boolean;
  chartPosition?: 'side' | 'below';
  cluster?: TwitterOpinionCluster | null;
  clusterConfidence?: number | null;
}

interface MediaItem {
  type: "photo" | "video" | "animated_gif";
  url: string;
  preview_image_url?: string;
  duration_ms?: number;
  alt_text?: string;
}

function getPostType(tweet: TwitterTweetWithProfile): string {
  if (tweet.raw_data?.retweeted_tweet || tweet.text.startsWith("RT @")) {
    return "Repost";
  }
  if (tweet.raw_data?.quoted_tweet) {
    return "Quote";
  }
  if (tweet.is_reply) {
    return "Reply";
  }
  return "Post";
}

function getRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

function extractMedia(rawData: Record<string, any>): MediaItem[] {
  const media: MediaItem[] = [];
  
  if (!rawData) return media;

  let mediaSource = rawData.extendedEntities?.media ||
                    rawData.extended_entities?.media ||
                    rawData.entities?.media ||
                    rawData.media;

  if (!mediaSource) return media;

  const mediaArray = Array.isArray(mediaSource) ? mediaSource : [mediaSource];
  
  mediaArray.forEach((item: any) => {
    if (!item) return;

    if (item.type === "photo" && item.media_url_https) {
      media.push({
        type: "photo",
        url: item.media_url_https,
        alt_text: item.alt_text,
      });
    } else if (item.type === "video" && (item.video_info || item.media_url_https)) {
      const videoUrl = item.video_info?.variants?.find((v: any) => v.content_type === 'video/mp4')?.url 
        || item.video_info?.variants?.[0]?.url 
        || "";
        
      media.push({
        type: "video",
        url: videoUrl,
        preview_image_url: item.media_url_https,
        duration_ms: item.video_info?.duration_millis,
        alt_text: item.alt_text,
      });
    } else if (item.type === "animated_gif") {
      const gifUrl = item.video_info?.variants?.[0]?.url || "";
      media.push({
        type: "animated_gif",
        url: gifUrl,
        preview_image_url: item.media_url_https,
      });
    }
  });

  return media;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function TwitterFeedCard({ 
  tweet, 
  tags = [], 
  zoneId, 
  showEngagementChart = true, 
  chartPosition = 'side',
  cluster,
  clusterConfidence
}: TwitterFeedCardProps) {
  const [imageError, setImageError] = useState(false);
  const [mediaErrors, setMediaErrors] = useState<Set<string>>(new Set());
  const [showFullText, setShowFullText] = useState(false);
  const [refreshFn, setRefreshFn] = useState<(() => Promise<void>) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [liveMetrics, setLiveMetrics] = useState({
    like_count: tweet.like_count,
    retweet_count: tweet.retweet_count,
    reply_count: tweet.reply_count,
    quote_count: tweet.quote_count,
    view_count: tweet.view_count,
  });

  const [trackingIsCold, setTrackingIsCold] = useState<boolean | null>(null);
  
  const postType = getPostType(tweet);
  const relativeTime = getRelativeTime(tweet.twitter_created_at);
  const twitterUrl = tweet.twitter_url || tweet.tweet_url;
  const media = extractMedia(tweet.raw_data);
  const quotedTweet = tweet.raw_data?.quoted_tweet as any;
  const isLongText = tweet.text.length > 280;

  const handleMediaError = (url: string) => {
    setMediaErrors((prev) => new Set([...prev, url]));
  };
  
  const handleMetricsUpdate = (metrics: typeof liveMetrics) => {
    setLiveMetrics(metrics);
  };

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

  const layoutClass = !showEngagementChart 
    ? "flex flex-col" 
    : chartPosition === 'below'
    ? "flex flex-col"
    : "grid grid-cols-1 lg:grid-cols-2";

  return (
    <Card className="max-w-full card-interactive glass overflow-hidden shadow-sm p-0">
      {/* Card Header - Metadata & Context */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/10">
        {/* Left: Tweet Context */}
        <div className="flex items-center gap-2.5">
          {/* Type Badge */}
          <Badge
            variant={
              postType === "Repost" ? "outline-success" :
              postType === "Reply" ? "outline-info" :
              postType === "Quote" ? "outline-warning" :
              "outline"
            }
            className="text-[10px] h-5 px-2 font-medium"
          >
            {postType}
          </Badge>

          {/* Separator */}
          <div className="h-3 w-px bg-border/50" />

          {/* Time */}
          <span className="text-xs text-muted-foreground font-medium">
            {relativeTime}
          </span>

          {/* External Link */}
          {twitterUrl && (
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="View on X"
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
              href={`/dashboard/zones/${zoneId}/feed?source=twitter&view=profiles&search=${tweet.author.username}`}
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
        {/* Tweet Content */}
        <div className="p-4 min-w-0 flex-1">
          <div className="flex gap-3 p-4 rounded-xl bg-background border border-border/60 shadow-xs transition-colors duration-[var(--transition-fast)]">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="size-10 rounded-full overflow-hidden bg-muted border border-border/50 shadow-sm">
                {tweet.author.profile_picture_url && !imageError ? (
                  <img
                    src={tweet.author.profile_picture_url}
                    alt={tweet.author.name}
                    className="size-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-muted text-muted-foreground">
                    <User className="size-5" />
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Header: Name, Handle, Time (Twitter Native) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <span className="font-bold text-[15px] truncate text-foreground">
                    {tweet.author.name}
                  </span>
                  {(tweet.author.is_verified || tweet.author.is_blue_verified) && (
                    <svg viewBox="0 0 24 24" aria-label="Verified account" className="size-4 text-blue-500 fill-current flex-shrink-0"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"></path></g></svg>
                  )}
                  <span className="text-[15px] text-muted-foreground truncate">
                    @{tweet.author.username}
                  </span>
                  <span className="text-[15px] text-muted-foreground shrink-0">·</span>
                  <span className="text-[15px] text-muted-foreground shrink-0">
                    {relativeTime}
                  </span>
                </div>
                
                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex shrink-0 gap-1">
                    {tags.slice(0, 1).map((tag) => (
                      <Badge 
                        key={tag.id}
                        variant="outline" 
                        className="h-5 px-1.5 text-[10px] font-normal border-border bg-background"
                      >
                        {tag.tag_type.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Tweet Text */}
              <div className="text-[15px] leading-normal text-foreground whitespace-pre-wrap break-words pt-0.5">
                <div className={cn(!showFullText && isLongText && "line-clamp-5")}>
                  <TwitterFormattedText 
                    text={tweet.text} 
                    entities={tweet.raw_data?.entities as any}
                  />
                </div>
                {isLongText && (
                  <button
                    onClick={() => setShowFullText(!showFullText)}
                    className="text-primary hover:underline text-[15px] font-normal mt-1 transition-colors duration-[var(--transition-fast)]"
                  >
                    {showFullText ? "Show less" : "Show more"}
                  </button>
                )}
              </div>

              {/* Media */}
              {media.length > 0 && (
                <div className="pt-2">
                  <div className={cn(
                    "grid gap-1 rounded-xl overflow-hidden border border-border/60",
                    media.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {media.map((item) => (
                      <div key={item.url} className="relative aspect-[16/9] bg-muted">
                        {item.type === "video" || item.type === "animated_gif" ? (
                          <div className="relative size-full group/video cursor-pointer">
                            <img
                              src={item.preview_image_url || item.url}
                              alt="Video content"
                              className="size-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/30 transition-colors">
                              <div className="size-10 rounded-full bg-primary/90 flex items-center justify-center shadow-sm">
                                <Play className="size-5 text-white fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt="Tweet media"
                            className="size-full object-cover hover:opacity-95 transition-opacity cursor-zoom-in"
                            onError={() => handleMediaError(item.url)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quoted Tweet */}
              {quotedTweet && (
                <div className="mt-3 rounded-xl border border-border overflow-hidden hover:bg-muted/20 transition-colors">
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 text-[15px] mb-1">
                      <span className="font-bold truncate">{quotedTweet.user?.name || quotedTweet.author?.name}</span>
                      <span className="text-muted-foreground truncate">@{quotedTweet.user?.screen_name || quotedTweet.author?.userName}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground text-sm">{getRelativeTime(quotedTweet.created_at || quotedTweet.createdAt)}</span>
                    </div>
                    <p className="text-[15px] leading-normal line-clamp-3">
                      {quotedTweet.full_text || quotedTweet.text}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Metrics */}
              <div className="flex items-center justify-between pt-3 max-w-md text-muted-foreground">
                <div className="flex items-center gap-1.5 group cursor-pointer hover:text-blue-500 transition-colors">
                  <svg viewBox="0 0 24 24" className="size-[18px] fill-current group-hover:bg-blue-500/10 rounded-full p-0.5 transition-colors" aria-hidden="true"><g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></g></svg>
                  <span className="text-xs tabular-nums">{formatCompactNumber(liveMetrics.reply_count)}</span>
                </div>
                
                <div className="flex items-center gap-1.5 group cursor-pointer hover:text-green-500 transition-colors">
                  <svg viewBox="0 0 24 24" className="size-[18px] fill-current group-hover:bg-green-500/10 rounded-full p-0.5 transition-colors" aria-hidden="true"><g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 6.96V16c0 1.1.9 2 2 2h7v2H7.5c-2.209 0-4-1.79-4-4V6.96l-2.068 2.52-1.364-1.46 4.432-4.14zm6.236 7.79L12.5 9.96V4h2v5.96l1.832 1.71 1.364-1.46-4.432-4.14-4.432 4.14 1.364 1.46z"></path></g></svg>
                  <span className="text-xs tabular-nums">{formatCompactNumber(liveMetrics.retweet_count)}</span>
                </div>
                
                <div className="flex items-center gap-1.5 group cursor-pointer hover:text-pink-500 transition-colors">
                  <svg viewBox="0 0 24 24" className="size-[18px] fill-current group-hover:bg-pink-500/10 rounded-full p-0.5 transition-colors" aria-hidden="true"><g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.605 3.01.894 1.81.838 4.17-.518 6.67z"></path></g></svg>
                  <span className="text-xs tabular-nums">{formatCompactNumber(liveMetrics.like_count)}</span>
                </div>
                
                <div className="flex items-center gap-1.5 group cursor-pointer hover:text-primary transition-colors">
                  <svg viewBox="0 0 24 24" className="size-[18px] fill-current group-hover:bg-primary/10 rounded-full p-0.5 transition-colors" aria-hidden="true"><g><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></g></svg>
                  <span className="text-xs tabular-nums">{formatCompactNumber(liveMetrics.view_count)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Chart */}
        {showEngagementChart && (
          <div className={cn(
            "p-4 sm:p-6",
            chartPosition === 'below' 
              ? "border-t border-border/40" 
              : "border-t lg:border-t-0" // Removed vertical border
          )}>
            <TwitterEngagementChart 
              tweetId={tweet.id} 
              onMetricsUpdate={handleMetricsUpdate}
              onTrackingStatusUpdate={handleTrackingStatusUpdate}
              onRefreshReady={handleRefreshReady}
            />
          </div>
        )}
      </div>

      {/* Card Footer - Cluster Badge */}
      {(cluster || clusterConfidence !== null) && (
        <div className="px-4 sm:px-6 py-3 bg-muted/5 border-t border-border/50">
          {cluster && <TwitterClusterBadge cluster={cluster} />}
          
          {!cluster && clusterConfidence !== null && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-border bg-background">
              <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted-foreground/40" />
              <span className="text-xs font-medium text-muted-foreground">
                Unique perspective
              </span>
              <span className="text-xs text-muted-foreground/60">
                Doesn&apos;t fit main clusters
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
