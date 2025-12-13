"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Hash, TrendingUp } from "lucide-react";

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

export interface TrendingTopicData {
  /** Hashtag text */
  hashtag: string;
  /** Platforms where it appears */
  platforms: string[];
  /** Count per platform */
  counts: Record<string, number>;
  /** Total count across platforms */
  total_count: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// ============================================================================
// TrendingTopicBadge Component
// ============================================================================

export function TrendingTopicBadge({
  topic,
  rank,
  className,
}: {
  topic: TrendingTopicData;
  rank?: number;
  className?: string;
}) {
  const isMultiPlatform = topic.platforms.length > 1;
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-card border hover:bg-accent/50 transition-colors",
        className
      )}
    >
      {/* Rank */}
      {rank !== undefined && (
        <span className="text-xs font-bold text-muted-foreground w-5">
          #{rank + 1}
        </span>
      )}
      
      {/* Hashtag */}
      <div className="flex items-center gap-1">
        <Hash className="size-3.5 text-primary" />
        <span className="font-medium text-sm">{topic.hashtag}</span>
      </div>
      
      {/* Platform Icons */}
      <div className="flex items-center gap-1 ml-1">
        {topic.platforms.includes("twitter") && (
          <div className="size-4 rounded-full bg-black flex items-center justify-center" title={`Twitter: ${formatNumber(topic.counts.twitter || 0)}`}>
            <XIcon className="size-2.5 text-white" />
          </div>
        )}
        {topic.platforms.includes("tiktok") && (
          <div className="size-4 rounded-full bg-black flex items-center justify-center" title={`TikTok: ${formatNumber(topic.counts.tiktok || 0)}`}>
            <TikTokIcon className="size-2.5 text-white" />
          </div>
        )}
      </div>
      
      {/* Count */}
      <Badge variant="secondary" className="text-xs ml-1">
        {formatNumber(topic.total_count)}
      </Badge>
    </div>
  );
}

// ============================================================================
// TrendingTopicsList Component
// ============================================================================

export interface TrendingTopicsListProps {
  /** Topics to display */
  topics: TrendingTopicData[];
  /** Max items */
  maxItems?: number;
  /** Additional className */
  className?: string;
}

export function TrendingTopicsList({
  topics,
  maxItems,
  className,
}: TrendingTopicsListProps) {
  const displayTopics = maxItems ? topics.slice(0, maxItems) : topics;

  if (displayTopics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="size-8 mx-auto mb-2 opacity-50" />
        <p>No trending topics found</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {displayTopics.map((topic, idx) => (
        <TrendingTopicBadge
          key={topic.hashtag}
          topic={topic}
          rank={idx}
        />
      ))}
    </div>
  );
}

