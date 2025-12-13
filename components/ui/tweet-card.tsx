"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  ExternalLink,
  BadgeCheck,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface TweetData {
  /** Tweet ID */
  tweet_id: string;
  /** Tweet text content */
  text: string;
  /** Author username (without @) */
  author_username: string;
  /** Author display name */
  author_name: string;
  /** Is the author verified */
  author_verified?: boolean;
  /** Author profile picture URL */
  author_profile_picture_url?: string | null;
  /** Engagement metrics */
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    views: number;
  };
  /** Tweet URL (optional - will be constructed if not provided) */
  tweet_url?: string;
  /** Creation date */
  created_at?: string;
}

export interface TweetCardProps {
  /** Tweet data object */
  tweet: TweetData;
  /** Show engagement stats */
  showEngagement?: boolean;
  /** Compact mode (smaller padding, less spacing) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format large numbers with K/M suffixes
 */
function formatCount(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Build tweet URL from username and tweet ID
 */
function buildTweetUrl(username: string, tweetId: string): string {
  return `https://x.com/${username}/status/${tweetId}`;
}

/**
 * Get initials from name for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// TweetCard Component
// ============================================================================

/**
 * TweetCard - Shadcn-based tweet display component
 *
 * Uses Card, Avatar, Badge primitives from Shadcn UI.
 * Designed for government-grade monitoring applications.
 *
 * @example
 * ```tsx
 * <TweetCard
 *   tweet={{
 *     tweet_id: "123",
 *     text: "Hello world",
 *     author_username: "user",
 *     author_name: "User Name",
 *     engagement: { likes: 100, retweets: 50, replies: 10, views: 1000 }
 *   }}
 * />
 * ```
 */
export function TweetCard({
  tweet,
  showEngagement = true,
  compact = false,
  className,
}: TweetCardProps) {
  const tweetUrl =
    tweet.tweet_url || buildTweetUrl(tweet.author_username, tweet.tweet_id);

  return (
    <Card
      className={cn(
        "transition-colors hover:bg-muted/30",
        compact ? "p-3" : "",
        className
      )}
    >
      <CardContent className={cn(compact ? "p-0" : "p-4 pt-4")}>
        {/* Header: Avatar + Name + Username + Verified + X Link */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className={cn(compact ? "size-8" : "size-10")}>
            {tweet.author_profile_picture_url && (
              <AvatarImage
                src={tweet.author_profile_picture_url}
                alt={tweet.author_name}
              />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(tweet.author_name)}
            </AvatarFallback>
          </Avatar>

          {/* Name + Username */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "font-semibold text-foreground truncate",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {tweet.author_name}
              </span>
              {tweet.author_verified && (
                <BadgeCheck className="size-4 text-blue-500 shrink-0" />
              )}
            </div>
            <span
              className={cn(
                "text-muted-foreground",
                compact ? "text-xs" : "text-xs"
              )}
            >
              @{tweet.author_username}
            </span>
          </div>

          {/* X/Twitter logo link */}
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="View on X"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>

        {/* Tweet text */}
        <p
          className={cn(
            "text-foreground/90 leading-relaxed whitespace-pre-wrap break-words",
            compact ? "mt-2 text-xs" : "mt-3 text-sm"
          )}
        >
          {tweet.text}
        </p>

        {/* Engagement stats */}
        {showEngagement && (
          <div
            className={cn(
              "flex items-center gap-4 text-muted-foreground",
              compact ? "mt-2 text-xs" : "mt-3 text-xs"
            )}
          >
            <div className="flex items-center gap-1" title="Replies">
              <MessageCircle className="size-3.5" />
              <span>{formatCount(tweet.engagement.replies)}</span>
            </div>
            <div className="flex items-center gap-1" title="Retweets">
              <Repeat2 className="size-3.5" />
              <span>{formatCount(tweet.engagement.retweets)}</span>
            </div>
            <div className="flex items-center gap-1" title="Likes">
              <Heart className="size-3.5" />
              <span>{formatCount(tweet.engagement.likes)}</span>
            </div>
            <div className="flex items-center gap-1" title="Views">
              <Eye className="size-3.5" />
              <span>{formatCount(tweet.engagement.views)}</span>
            </div>

            {/* View link */}
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-primary hover:underline"
            >
              <span>View</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TweetCardSkeleton - Loading State
// ============================================================================

export function TweetCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={compact ? "p-3" : ""}>
      <CardContent className={cn("animate-pulse", compact ? "p-0" : "p-4 pt-4")}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-full bg-muted",
              compact ? "size-8" : "size-10"
            )}
          />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>
        <div className={cn("space-y-2", compact ? "mt-2" : "mt-3")}>
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
        <div className={cn("flex gap-4", compact ? "mt-2" : "mt-3")}>
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TweetCardList - Multiple Tweets
// ============================================================================

interface TweetCardListProps {
  tweets: TweetData[];
  compact?: boolean;
  className?: string;
}

/**
 * Render a list of tweet cards with consistent spacing
 */
export function TweetCardList({
  tweets,
  compact = false,
  className,
}: TweetCardListProps) {
  if (!tweets || tweets.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {tweets.map((tweet) => (
        <TweetCard key={tweet.tweet_id} tweet={tweet} compact={compact} />
      ))}
    </div>
  );
}

