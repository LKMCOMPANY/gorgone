"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Newspaper,
  ExternalLink,
  TrendingUp,
  Calendar,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ArticleData {
  /** Article unique identifier */
  article_id: string;
  /** Article title */
  title: string;
  /** Source/publication name */
  source: string;
  /** Article body preview */
  body_preview?: string;
  /** Sentiment score (-1 to 1) */
  sentiment?: number | null;
  /** Social media engagement score */
  social_score?: number | null;
  /** Publication date */
  published_at: string;
  /** Article URL */
  url: string;
  /** Source logo URL (optional) */
  source_logo_url?: string | null;
}

export interface ArticleCardProps {
  /** Article data object */
  article: ArticleData;
  /** Compact mode for lists */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSentimentLabel(sentiment: number | null | undefined): {
  label: string;
  color: string;
} {
  if (sentiment === null || sentiment === undefined) {
    return { label: "Neutral", color: "text-muted-foreground bg-muted" };
  }
  if (sentiment > 0.1) {
    return { label: "Positive", color: "text-green-600 bg-green-500/10 border-green-500/30" };
  }
  if (sentiment < -0.1) {
    return { label: "Negative", color: "text-red-600 bg-red-500/10 border-red-500/30" };
  }
  return { label: "Neutral", color: "text-muted-foreground bg-muted/50 border-muted" };
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

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getSourceInitials(source: string): string {
  return source
    .split(/[\s.-]+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

// ============================================================================
// ArticleCard Component
// ============================================================================

export function ArticleCard({
  article,
  compact = false,
  className,
}: ArticleCardProps) {
  const sentiment = getSentimentLabel(article.sentiment);

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
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-10"
        aria-label={`Read: ${article.title}`}
      />
      
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex gap-3">
          {/* Source Icon */}
          <div
            className={cn(
              "flex-shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold",
              compact ? "size-10 text-sm" : "size-12 text-base"
            )}
          >
            {article.source_logo_url ? (
              <img
                src={article.source_logo_url}
                alt={article.source}
                className="size-full object-cover rounded-lg"
              />
            ) : (
              getSourceInitials(article.source)
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Source & Date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="font-medium truncate">{article.source}</span>
              <span className="opacity-50">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatDate(article.published_at)}
              </span>
            </div>

            {/* Title */}
            <h4
              className={cn(
                "font-semibold text-foreground group-hover:text-primary transition-colors",
                compact ? "text-sm line-clamp-2" : "text-base line-clamp-2"
              )}
            >
              {article.title}
            </h4>

            {/* Body Preview (if not compact) */}
            {!compact && article.body_preview && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {article.body_preview}
              </p>
            )}

            {/* Footer: Sentiment & Social Score */}
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className={cn("text-xs", sentiment.color)}
              >
                {sentiment.label}
              </Badge>

              {article.social_score !== null && article.social_score !== undefined && article.social_score > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3" />
                  <span>{formatNumber(article.social_score)}</span>
                </div>
              )}

              <ExternalLink className="size-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ArticleCardSkeleton Component
// ============================================================================

export function ArticleCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex gap-3 animate-pulse">
          <div
            className={cn(
              "flex-shrink-0 rounded-lg bg-muted",
              compact ? "size-10" : "size-12"
            )}
          />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="flex gap-2 mt-2">
              <div className="h-5 bg-muted rounded w-16" />
              <div className="h-5 bg-muted rounded w-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ArticleCardList Component
// ============================================================================

export interface ArticleCardListProps {
  /** Array of articles to display */
  articles: ArticleData[];
  /** Compact mode */
  compact?: boolean;
  /** Maximum articles to show */
  maxItems?: number;
  /** Additional className */
  className?: string;
}

export function ArticleCardList({
  articles,
  compact = false,
  maxItems,
  className,
}: ArticleCardListProps) {
  const displayArticles = maxItems ? articles.slice(0, maxItems) : articles;

  if (displayArticles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Newspaper className="size-8 mx-auto mb-2 opacity-50" />
        <p>No articles found</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {displayArticles.map((article) => (
        <ArticleCard
          key={article.article_id}
          article={article}
          compact={compact}
        />
      ))}
    </div>
  );
}

