"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Play,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  BadgeCheck,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface TikTokVideoData {
  /** Video ID */
  video_id: string;
  /** Video description/caption */
  description: string;
  /** Author username (without @) */
  author_username: string;
  /** Author display name/nickname */
  author_nickname: string;
  /** Is the author verified */
  author_verified?: boolean;
  /** Author profile picture URL */
  author_avatar_url?: string | null;
  /** Cover image URL */
  cover_url?: string | null;
  /** Engagement metrics */
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  /** Video URL */
  video_url: string;
  /** Creation date */
  created_at?: string;
}

export interface TikTokVideoCardProps {
  /** Video data object */
  video: TikTokVideoData;
  /** Compact mode for lists */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAuthorInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

// ============================================================================
// TikTok Icon Component
// ============================================================================

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

// ============================================================================
// TikTokVideoCard Component
// ============================================================================

export function TikTokVideoCard({
  video,
  compact = false,
  className,
}: TikTokVideoCardProps) {
  const videoUrl = video.video_url || `https://www.tiktok.com/@${video.author_username}/video/${video.video_id}`;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:border-primary/20",
        "bg-card/50 backdrop-blur-sm",
        className
      )}
    >
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-10"
        aria-label={`Watch: ${(video.description || "TikTok video").slice(0, 50)}`}
      />
      
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex gap-3">
          {/* Cover/Avatar with TikTok badge */}
          <div className="relative flex-shrink-0">
            {video.cover_url ? (
              <div className={cn(
                "rounded-lg overflow-hidden bg-muted relative",
                compact ? "w-12 h-16" : "w-14 h-20"
              )}>
                <img
                  src={video.cover_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="size-5 text-white" fill="white" />
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "flex items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-red-500 to-cyan-400 text-white font-bold",
                  compact ? "size-12 text-sm" : "size-14 text-base"
                )}
              >
                {getAuthorInitials(video.author_nickname)}
              </div>
            )}
            {/* TikTok badge */}
            <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-black flex items-center justify-center border-2 border-card">
              <TikTokIcon className="size-3 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author Info */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-semibold text-sm text-foreground truncate">
                {video.author_nickname}
              </span>
              {video.author_verified && (
                <BadgeCheck className="size-3.5 text-cyan-500 fill-cyan-500/20 shrink-0" />
              )}
              <span className="text-xs text-muted-foreground truncate">
                @{video.author_username}
              </span>
            </div>

            {/* Description */}
            <p
              className={cn(
                "text-sm text-foreground/90",
                compact ? "line-clamp-2" : "line-clamp-3"
              )}
            >
              {video.description || "No description"}
            </p>

            {/* Date */}
            {video.created_at && (
              <div className="text-xs text-muted-foreground mt-1">
                {formatDate(video.created_at)}
              </div>
            )}

            {/* Engagement Stats */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1" title="Views">
                <Play className="size-3.5" />
                <span>{formatNumber(video.engagement.views)}</span>
              </div>
              <div className="flex items-center gap-1" title="Likes">
                <Heart className="size-3.5" />
                <span>{formatNumber(video.engagement.likes)}</span>
              </div>
              <div className="flex items-center gap-1" title="Comments">
                <MessageCircle className="size-3.5" />
                <span>{formatNumber(video.engagement.comments)}</span>
              </div>
              <div className="flex items-center gap-1" title="Shares">
                <Share2 className="size-3.5" />
                <span>{formatNumber(video.engagement.shares)}</span>
              </div>
              <ExternalLink className="size-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TikTokVideoCardSkeleton Component
// ============================================================================

export function TikTokVideoCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex gap-3 animate-pulse">
          <div
            className={cn(
              "flex-shrink-0 rounded-lg bg-muted",
              compact ? "w-12 h-16" : "w-14 h-20"
            )}
          />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
            <div className="flex gap-3 mt-2">
              <div className="h-4 bg-muted rounded w-12" />
              <div className="h-4 bg-muted rounded w-12" />
              <div className="h-4 bg-muted rounded w-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TikTokVideoCardList Component
// ============================================================================

export interface TikTokVideoCardListProps {
  /** Array of videos to display */
  videos: TikTokVideoData[];
  /** Compact mode */
  compact?: boolean;
  /** Maximum videos to show */
  maxItems?: number;
  /** Additional className */
  className?: string;
}

export function TikTokVideoCardList({
  videos,
  compact = false,
  maxItems,
  className,
}: TikTokVideoCardListProps) {
  const displayVideos = maxItems ? videos.slice(0, maxItems) : videos;

  if (displayVideos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TikTokIcon className="size-8 mx-auto mb-2 opacity-50" />
        <p>No TikTok videos found</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {displayVideos.map((video) => (
        <TikTokVideoCard
          key={video.video_id}
          video={video}
          compact={compact}
        />
      ))}
    </div>
  );
}

