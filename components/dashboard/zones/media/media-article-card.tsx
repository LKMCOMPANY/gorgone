/**
 * Media Article Card Component
 * 
 * Professional card for displaying news articles from Event Registry.
 * Production-ready with full design system compliance.
 * 
 * Features:
 * - Responsive layout (mobile-first)
 * - Elegant image handling with fallback
 * - Sentiment badges with theme-aware colors
 * - Social metrics display
 * - Smooth hover transitions
 * - Accessibility compliant
 */

"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaArticle } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface MediaArticleCardProps {
  article: MediaArticle;
}

/**
 * Get sentiment badge configuration with theme-aware colors
 */
function getSentimentBadge(sentiment: number | null): {
  label: string;
  className: string;
} {
  if (sentiment === null) {
    return {
      label: "Neutral",
      className: "bg-muted/50 text-muted-foreground border-border",
    };
  }

  if (sentiment > 0.2) {
    return {
      label: "Positive",
      className: "bg-primary/10 text-primary border-primary/20",
    };
  }

  if (sentiment < -0.2) {
    return {
      label: "Negative",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }

  return {
    label: "Neutral",
    className: "bg-muted/50 text-muted-foreground border-border",
  };
}

/**
 * Get relative time string
 */
function getRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Media Article Card
 * 
 * Displays article with image, title, excerpt, sentiment, and metadata.
 * Fully responsive with elegant hover effects.
 */
export function MediaArticleCard({ article }: MediaArticleCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const sentimentBadge = getSentimentBadge(article.sentiment);
  const relativeTime = getRelativeTime(article.published_at);
  const hasImage = article.image_url && !imageError;
  const hasSocialShares = article.shares_total > 0;

  return (
    <Card className="card-interactive p-0 overflow-hidden group">
      <div className="flex flex-col sm:flex-row">
        {/* Article Image (left side on desktop) */}
        {hasImage && (
          <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-muted/30 overflow-hidden">
            <img
              src={article.image_url!}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-[250ms] group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        )}

        {/* Article Content */}
        <div className="flex-1 p-4 sm:p-5 space-y-3">
          {/* Header: Source + Country + Language + Sentiment */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {/* Source */}
              <span className="text-body-sm font-medium text-foreground truncate">
                {article.source_title}
              </span>
              
              {/* Country */}
              {article.source_location_country && (
                <>
                  <span className="text-muted-foreground flex-shrink-0">•</span>
                  <span className="text-caption text-muted-foreground flex-shrink-0">
                    {article.source_location_country}
                  </span>
                </>
              )}
              
              {/* Language Badge */}
              <Badge variant="outline" className="text-caption flex-shrink-0">
                {article.lang.toUpperCase()}
              </Badge>
            </div>

            {/* Sentiment Badge */}
            <Badge 
              className={cn(
                "flex-shrink-0 transition-all duration-[150ms]",
                sentimentBadge.className
              )}
            >
              {sentimentBadge.label}
            </Badge>
          </div>

          {/* Article Title */}
          <h3 className="text-body font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-[150ms]">
            {article.title}
          </h3>

          {/* Article Excerpt */}
          <p className="text-body-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {truncateText(article.body, 200)}
          </p>

          {/* Footer: Time + Social Shares + Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/50">
            {/* Left: Time + Social Shares */}
            <div className="flex items-center gap-3 text-caption text-muted-foreground flex-wrap">
              <span className="flex-shrink-0">{relativeTime}</span>
              
              {hasSocialShares && (
                <>
                  <span className="flex-shrink-0">•</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {article.shares_facebook > 0 && (
                      <span className="flex items-center gap-1.5 transition-colors duration-[150ms] hover:text-foreground">
                        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span className="font-medium">{article.shares_facebook}</span>
                      </span>
                    )}
                    {article.shares_twitter > 0 && (
                      <span className="flex items-center gap-1.5 transition-colors duration-[150ms] hover:text-foreground">
                        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span className="font-medium">{article.shares_twitter}</span>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: Read Article Button */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2 text-muted-foreground hover:text-primary transition-colors duration-[150ms] w-full sm:w-auto justify-center sm:justify-start"
            >
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Read article: ${article.title}`}
              >
                <span className="text-caption font-medium">Read Article</span>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
