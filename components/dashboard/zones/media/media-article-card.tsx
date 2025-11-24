/**
 * Media Article Card Component
 * 
 * Expandable card for news articles with compact and detailed views.
 * Production-ready with full design system compliance.
 * 
 * Features:
 * - Compact view by default (title, source, sentiment, image)
 * - Click to expand → shows all metadata (authors, concepts, categories, etc.)
 * - Smooth accordion animation
 * - Responsive layout (mobile-first)
 * - Theme-aware colors
 * - Accessibility compliant
 */

"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, MapPin, Tag, User, Calendar, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isVerifiedSource } from "@/lib/data/media/verified-sources";
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
  score: string;
  className: string;
} {
  if (sentiment === null) {
    return {
      label: "Neutral",
      score: "N/A",
      className: "bg-muted/50 text-muted-foreground border-border",
    };
  }

  const scoreText = sentiment.toFixed(2);

  if (sentiment > 0.2) {
    return {
      label: "Positive",
      score: scoreText,
      className: "bg-primary/10 text-primary border-primary/20",
    };
  }

  if (sentiment < -0.2) {
    return {
      label: "Negative",
      score: scoreText,
      className: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }

  return {
    label: "Neutral",
    score: scoreText,
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
 * Format full date
 */
function formatFullDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
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
 * Parse location if it's JSON
 */
function parseLocation(location: string | null): string | null {
  if (!location) return null;
  
  try {
    const parsed = JSON.parse(location);
    return parsed.eng || parsed;
  } catch {
    return location;
  }
}

/**
 * Media Article Card - Expandable
 * 
 * Compact view shows essentials, click to expand for full details.
 */
export function MediaArticleCard({ article }: MediaArticleCardProps) {
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const sentimentBadge = getSentimentBadge(article.sentiment);
  const relativeTime = getRelativeTime(article.published_at);
  const fullDate = formatFullDate(article.published_at);
  const hasImage = article.image_url && !imageError;
  const hasSocialShares = article.shares_total > 0;
  const hasAuthors = article.authors && article.authors.length > 0;
  const hasConcepts = article.concepts && article.concepts.length > 0;
  const hasCategories = article.categories && article.categories.length > 0;
  const country = parseLocation(article.source_location_country);
  const city = parseLocation(article.source_location_label);
  const isVerified = isVerifiedSource(article.source_uri);

  return (
    <Card className="p-0 overflow-hidden group transition-all duration-[250ms]">
      {/* Compact View (always visible) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left transition-colors duration-[150ms] hover:bg-muted/30"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Article Image */}
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
            {/* Header: Source + Language + Sentiment */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {/* Source with verified badge */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-body-sm font-medium text-foreground truncate">
                    {article.source_title}
                  </span>
                  {isVerified && (
                    <ShieldCheck 
                      className="h-4 w-4 text-primary flex-shrink-0" 
                      aria-label="Verified media source"
                    />
                  )}
                </div>
                
                {/* Location */}
                {(city || country) && (
                  <>
                    <span className="text-muted-foreground flex-shrink-0">•</span>
                    <span className="text-caption text-muted-foreground flex-shrink-0">
                      {city && country ? `${city}, ${country}` : city || country}
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

            {/* Footer: Time + Expand Button */}
            <div className="flex items-center justify-between gap-4 pt-2">
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

              {/* Expand Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-caption text-muted-foreground">
                  {expanded ? "Less" : "More"}
                </span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Expanded Details (shown on click) */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 p-4 sm:p-5 space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          {/* Full Date & Relevance */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 text-body-sm">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Published:</span>
              <span className="font-medium">{fullDate}</span>
            </div>
            {article.relevance && (
              <div className="flex items-center gap-2 text-body-sm">
                <span className="text-muted-foreground">Relevance:</span>
                <Badge variant="outline" className="font-mono">
                  {article.relevance}/100
                </Badge>
              </div>
            )}
          </div>

          {/* Authors */}
          {hasAuthors && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-body-sm font-medium">
                <User className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Authors</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.authors.map((author: any, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-caption">
                    {author.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Article Location */}
          {article.location_label && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-body-sm font-medium">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Location Mentioned</span>
              </div>
              <Badge variant="outline" className="text-caption">
                {parseLocation(article.location_label)}
                {article.location_country && ` • ${parseLocation(article.location_country)}`}
              </Badge>
            </div>
          )}

          {/* Concepts */}
          {hasConcepts && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-body-sm font-medium">
                <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Concepts ({article.concepts.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.concepts.slice(0, 10).map((concept: any, idx: number) => (
                  <Badge 
                    key={idx} 
                    variant="outline"
                    className="text-caption gap-1.5"
                  >
                    <span>{concept.label?.eng || concept.label}</span>
                    {concept.score && (
                      <span className="text-muted-foreground">•{concept.score}</span>
                    )}
                  </Badge>
                ))}
                {article.concepts.length > 10 && (
                  <Badge variant="secondary" className="text-caption">
                    +{article.concepts.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Categories */}
          {hasCategories && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-body-sm font-medium">
                <svg className="h-4 w-4 text-primary flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                </svg>
                <span>Categories</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.categories.map((category: any, idx: number) => (
                  <Badge 
                    key={idx} 
                    variant="secondary"
                    className="text-caption"
                  >
                    {category.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment Score Details */}
          {article.sentiment !== null && (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-body-sm font-medium">Sentiment Analysis</p>
                  <p className="text-caption text-muted-foreground">
                    Computed by Event Registry AI
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-heading-3 font-mono">{sentimentBadge.score}</p>
                  <p className="text-caption text-muted-foreground">Score (-1 to 1)</p>
                </div>
              </div>
              {/* Sentiment Bar */}
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-[250ms]",
                    article.sentiment > 0 ? "bg-primary" : "bg-destructive"
                  )}
                  style={{
                    width: `${Math.abs(article.sentiment) * 100}%`,
                    marginLeft: article.sentiment < 0 ? `${(1 + article.sentiment) * 100}%` : "0",
                  }}
                />
              </div>
            </div>
          )}

          {/* Source Details */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-body-sm font-medium">Source Information</p>
              {isVerified && (
                <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Source</span>
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-caption text-muted-foreground">
              <div>
                <span className="font-medium">URI:</span> {article.source_uri}
              </div>
              {article.source_description && (
                <div className="sm:col-span-2">
                  <span className="font-medium">Description:</span> {article.source_description}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              size="sm"
              asChild
              className="gap-2 w-full sm:w-auto"
            >
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Read full article: ${article.title}`}
              >
                <ExternalLink className="h-4 w-4" />
                <span>Read Full Article</span>
              </a>
            </Button>
            {article.event_uri && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2 w-full sm:w-auto"
              >
                <a
                  href={`https://eventregistry.org/event/${article.event_uri}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  <span>View Event</span>
                </a>
              </Button>
            )}
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-caption text-muted-foreground">
            <span>Article ID:</span>
            <code className="font-mono text-caption bg-muted/50 px-2 py-0.5 rounded">
              {article.article_uri}
            </code>
          </div>
        </div>
      )}
    </Card>
  );
}
