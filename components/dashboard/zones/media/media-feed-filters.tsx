"use client";

/**
 * Media Feed Filters Component
 * 
 * Following the same pattern as Twitter/TikTok filters:
 * - Search bar always visible
 * - Quick controls (Sort, Verified)
 * - Collapsible advanced filters
 */

import { useState, useEffect } from "react";
import { Search, X, Filter, TrendingUp, ShieldCheck, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LanguageFilter } from "@/components/dashboard/zones/shared/language-filter";
import { LocationFilter } from "@/components/dashboard/zones/shared/location-filter";

export interface MediaFeedFilters {
  search: string;
  startDate: string;
  endDate: string;
  languages: string[];
  locations: string[];
  sources: string[];
  minSentiment: number | null;
  maxSentiment: number | null;
  sortBy: "published_at" | "social_score" | "sentiment";
  verifiedOnly: boolean;
}

interface MediaFeedFiltersProps {
  zoneId: string;
  filters: MediaFeedFilters;
  onFiltersChange: (filters: MediaFeedFilters) => void;
}

export function MediaFeedFiltersComponent({
  zoneId,
  filters,
  onFiltersChange,
}: MediaFeedFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [sourceInput, setSourceInput] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Clear search
  const handleClearSearch = () => {
    setSearchInput("");
    onFiltersChange({ ...filters, search: "" });
  };

  // Add source
  const handleSourceAdd = (sourceUri: string) => {
    const trimmed = sourceUri.trim();
    if (trimmed && !filters.sources.includes(trimmed)) {
      onFiltersChange({ ...filters, sources: [...filters.sources, trimmed] });
      setSourceInput("");
    }
  };

  // Remove source
  const handleSourceRemove = (sourceUri: string) => {
    onFiltersChange({
      ...filters,
      sources: filters.sources.filter((s) => s !== sourceUri),
    });
  };

  // Count active advanced filters
  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.languages.length > 0) count++;
    if (filters.locations.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.minSentiment !== null) count++;
    if (filters.maxSentiment !== null) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className="card-padding space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search articles by title or content..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-11 pl-10 pr-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
        />
        {searchInput && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-[150ms] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick Controls Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort By */}
        <Select
          value={filters.sortBy}
          onValueChange={(value: any) =>
            onFiltersChange({ ...filters, sortBy: value })
          }
        >
          <SelectTrigger className="h-9 w-[180px] transition-shadow duration-[150ms]">
            <TrendingUp className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="published_at">Most Recent</SelectItem>
            <SelectItem value="social_score">Most Shared</SelectItem>
            <SelectItem value="sentiment">Most Positive</SelectItem>
          </SelectContent>
        </Select>

        {/* Verified Media Toggle */}
        <button
          onClick={() =>
            onFiltersChange({ ...filters, verifiedOnly: !filters.verifiedOnly })
          }
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border px-3 transition-all duration-[150ms]",
            filters.verifiedOnly
              ? "border-primary bg-primary/5 text-primary"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border-2 transition-all duration-[150ms]",
              filters.verifiedOnly
                ? "border-primary bg-primary"
                : "border-muted-foreground"
            )}
          >
            {filters.verifiedOnly && (
              <svg
                className="h-3 w-3 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <ShieldCheck className="h-4 w-4" />
          <span className="text-body-sm font-medium">Verified Only</span>
        </button>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            "ml-auto gap-2 transition-all duration-[150ms]",
            showAdvancedFilters && "bg-muted/50"
          )}
        >
          <Filter className="h-4 w-4" />
          <span>Advanced Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-caption">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 space-y-4 border-t border-border pt-4 duration-200">
          {/* Date Range */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date-start" className="flex items-center gap-2 text-body-sm font-medium">
                <Calendar className="h-4 w-4" />
                From Date
              </Label>
              <Input
                id="date-start"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  onFiltersChange({ ...filters, startDate: e.target.value })
                }
                className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-end" className="text-body-sm font-medium">
                To Date
              </Label>
              <Input
                id="date-end"
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  onFiltersChange({ ...filters, endDate: e.target.value })
                }
                className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
              />
            </div>
          </div>

          {/* Language & Location Filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LanguageFilter
              zoneId={zoneId}
              source="media"
              selected={filters.languages || []}
              onChange={(languages) =>
                onFiltersChange({
                  ...filters,
                  languages,
                })
              }
            />
            <LocationFilter
              zoneId={zoneId}
              source="media"
              selected={filters.locations || []}
              onChange={(locations) =>
                onFiltersChange({
                  ...filters,
                  locations,
                })
              }
              label="Country (Source)"
            />
          </div>

          {/* Sentiment Range */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-sentiment" className="text-body-sm font-medium">
                Min Sentiment
              </Label>
              <Select
                value={filters.minSentiment?.toString() || "none"}
                onValueChange={(v) =>
                  onFiltersChange({
                    ...filters,
                    minSentiment: v === "none" ? null : parseFloat(v),
                  })
                }
              >
                <SelectTrigger
                  id="min-sentiment"
                  className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
                >
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any</SelectItem>
                  <SelectItem value="0.5">Very Positive (0.5+)</SelectItem>
                  <SelectItem value="0.2">Positive (0.2+)</SelectItem>
                  <SelectItem value="0">Neutral (0+)</SelectItem>
                  <SelectItem value="-0.5">Negative (-0.5+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-sentiment" className="text-body-sm font-medium">
                Max Sentiment
              </Label>
              <Select
                value={filters.maxSentiment?.toString() || "none"}
                onValueChange={(v) =>
                  onFiltersChange({
                    ...filters,
                    maxSentiment: v === "none" ? null : parseFloat(v),
                  })
                }
              >
                <SelectTrigger
                  id="max-sentiment"
                  className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
                >
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any</SelectItem>
                  <SelectItem value="1">Very Positive (1)</SelectItem>
                  <SelectItem value="0.5">Positive (0.5)</SelectItem>
                  <SelectItem value="0">Neutral (0)</SelectItem>
                  <SelectItem value="-0.2">Negative (-0.2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source Filter */}
          <div className="space-y-2">
            <Label htmlFor="source-filter" className="text-body-sm font-medium">
              Filter by Source
            </Label>
            <div className="flex gap-2">
              <Input
                id="source-filter"
                placeholder="e.g., bbc.com (press Enter)"
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSourceAdd(sourceInput);
                  }
                }}
                className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
              />
            </div>
            {filters.sources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.sources.map((source) => (
                  <Badge
                    key={source}
                    variant="secondary"
                    className="gap-1 transition-colors duration-[150ms]"
                  >
                    <span className="max-w-[120px] truncate">{source}</span>
                    <X
                      className="h-3 w-3 flex-shrink-0 cursor-pointer transition-transform duration-[150ms] hover:scale-110"
                      onClick={() => handleSourceRemove(source)}
                      aria-label={`Remove ${source} filter`}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onFiltersChange({
                  search: filters.search,
                  startDate: "",
                  endDate: "",
                  languages: [],
                  locations: [],
                  sources: [],
                  minSentiment: null,
                  maxSentiment: null,
                  sortBy: filters.sortBy,
                  verifiedOnly: filters.verifiedOnly,
                })
              }
              className="w-full gap-2"
            >
              <X className="h-4 w-4" />
              Clear Advanced Filters
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
