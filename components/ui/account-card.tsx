"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Users,
  Heart,
  MessageSquare,
  Eye,
  ExternalLink,
  BadgeCheck,
  TrendingUp,
} from "lucide-react";

// ============================================================================
// Platform Icons
// ============================================================================

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

// ============================================================================
// Types
// ============================================================================

export interface AccountData {
  /** Platform identifier */
  platform: "twitter" | "tiktok";
  /** Username (without @) */
  username: string;
  /** Display name */
  name?: string;
  /** TikTok nickname (optional) */
  nickname?: string;
  /** Is verified */
  verified?: boolean;
  /** Follower count */
  followers: number;
  /** Profile picture URL */
  avatar_url?: string | null;
  /** Stats */
  stats: {
    /** Number of posts in period */
    post_count?: number;
    /** Tweet count (Twitter) */
    tweet_count?: number;
    /** Video count (TikTok) */
    video_count?: number;
    /** Total engagement */
    total_engagement: number;
    /** Average engagement per post */
    avg_engagement?: number;
    /** Total views (TikTok) */
    total_views?: number;
  };
  /** Profile URL */
  profile_url: string;
}

export interface AccountCardProps {
  /** Account data */
  account: AccountData;
  /** Compact mode */
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

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

// ============================================================================
// AccountCard Component
// ============================================================================

export function AccountCard({
  account,
  compact = false,
  className,
}: AccountCardProps) {
  const displayName = account.name || account.nickname || account.username;
  const postCount = account.stats.tweet_count || account.stats.video_count || account.stats.post_count || 0;
  
  const PlatformIcon = account.platform === "twitter" ? XIcon : TikTokIcon;
  const platformColor = account.platform === "twitter" ? "text-foreground" : "text-pink-500";

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
        href={account.profile_url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-10"
        aria-label={`View ${displayName}'s profile`}
      />
      
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex gap-3">
          {/* Avatar with platform badge */}
          <div className="relative flex-shrink-0">
            <Avatar className={cn(compact ? "size-10" : "size-12")}>
              {account.avatar_url ? (
                <AvatarImage src={account.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            {/* Platform badge */}
            <div className={cn(
              "absolute -bottom-1 -right-1 size-5 rounded-full flex items-center justify-center border-2 border-card",
              account.platform === "twitter" ? "bg-black" : "bg-black"
            )}>
              <PlatformIcon className={cn("size-3", account.platform === "twitter" ? "text-white" : "text-white")} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name & Username */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-foreground truncate">
                {displayName}
              </span>
              {account.verified && (
                <BadgeCheck className={cn(
                  "size-4 shrink-0",
                  account.platform === "twitter" ? "text-blue-500 fill-blue-500/20" : "text-cyan-500 fill-cyan-500/20"
                )} />
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              @{account.username}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1" title="Followers">
                <Users className="size-3.5" />
                <span className="font-medium">{formatNumber(account.followers)}</span>
              </div>
              {postCount > 0 && (
                <div className="flex items-center gap-1" title="Posts">
                  <MessageSquare className="size-3.5" />
                  <span>{postCount}</span>
                </div>
              )}
              <div className="flex items-center gap-1" title="Total Engagement">
                <TrendingUp className="size-3.5" />
                <span className="font-medium text-primary">{formatNumber(account.stats.total_engagement)}</span>
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
// AccountCardSkeleton
// ============================================================================

export function AccountCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex gap-3 animate-pulse">
          <div className={cn("flex-shrink-0 rounded-full bg-muted", compact ? "size-10" : "size-12")} />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/4" />
            <div className="flex gap-3 mt-2">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// AccountCardList
// ============================================================================

export interface AccountCardListProps {
  /** Array of accounts */
  accounts: AccountData[];
  /** Compact mode */
  compact?: boolean;
  /** Max items */
  maxItems?: number;
  /** Additional className */
  className?: string;
}

export function AccountCardList({
  accounts,
  compact = false,
  maxItems,
  className,
}: AccountCardListProps) {
  const displayAccounts = maxItems ? accounts.slice(0, maxItems) : accounts;

  if (displayAccounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="size-8 mx-auto mb-2 opacity-50" />
        <p>No accounts found</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {displayAccounts.map((account, idx) => (
        <AccountCard
          key={`${account.platform}-${account.username}-${idx}`}
          account={account}
          compact={compact}
        />
      ))}
    </div>
  );
}

