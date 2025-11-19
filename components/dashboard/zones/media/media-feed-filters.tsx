/**
 * Media Feed Filters Component
 * 
 * Professional filtering system for media articles.
 * Production-ready with full design system compliance.
 * 
 * Features:
 * - Debounced search input
 * - Date range selection
 * - Language filter
 * - Source filter with tags
 * - Sentiment range
 * - Sort options
 * - Clear all filters
 * - Mobile-responsive
 */

"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface MediaFeedFilters {
  search: string;
  startDate: string;
  endDate: string;
  languages: string[];
  sources: string[];
  minSentiment: number | null;
  maxSentiment: number | null;
  sortBy: "published_at" | "social_score" | "sentiment";
}

interface MediaFeedFiltersProps {
  filters: MediaFeedFilters;
  onFiltersChange: (filters: MediaFeedFilters) => void;
  availableSources?: Array<{ uri: string; title: string }>;
}

/**
 * Media Feed Filters
 * 
 * Comprehensive filter panel following design system patterns.
 */
export function MediaFeedFiltersComponent({
  filters,
  onFiltersChange,
  availableSources = [],
}: MediaFeedFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [sourceInput, setSourceInput] = useState("");

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /**
   * Add source to filter list
   */
  function handleSourceAdd(sourceUri: string) {
    const trimmed = sourceUri.trim();
    if (trimmed && !filters.sources.includes(trimmed)) {
      onFiltersChange({ ...filters, sources: [...filters.sources, trimmed] });
      setSourceInput("");
    }
  }

  /**
   * Remove source from filter list
   */
  function handleSourceRemove(sourceUri: string) {
    onFiltersChange({
      ...filters,
      sources: filters.sources.filter(s => s !== sourceUri),
    });
  }

  /**
   * Clear all active filters
   */
  function handleClearFilters() {
    setSearchInput("");
    onFiltersChange({
      search: "",
      startDate: "",
      endDate: "",
      languages: [],
      sources: [],
      minSentiment: null,
      maxSentiment: null,
      sortBy: "published_at",
    });
  }

  const hasActiveFilters = 
    filters.search ||
    filters.startDate ||
    filters.endDate ||
    filters.languages.length > 0 ||
    filters.sources.length > 0 ||
    filters.minSentiment !== null ||
    filters.maxSentiment !== null;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 transition-colors duration-[150ms]">
      {/* Search Bar */}
      <div className="space-y-2">
        <Label htmlFor="search" className="text-body-sm font-medium">
          Search Articles
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="search"
            type="text"
            placeholder="Search in title and content..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 pl-10 pr-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 transition-colors duration-[150ms]"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date-start" className="text-body-sm font-medium">
            From Date
          </Label>
          <Input
            id="date-start"
            type="date"
            value={filters.startDate}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
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
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
            className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
          />
        </div>
      </div>

      {/* Language Filter */}
      <div className="space-y-2">
        <Label htmlFor="language-filter" className="text-body-sm font-medium">
          Language
        </Label>
        <Select
          value={filters.languages.length === 0 ? "all" : filters.languages[0]}
          onValueChange={(v) => onFiltersChange({ ...filters, languages: v === "all" ? [] : [v] })}
        >
          <SelectTrigger id="language-filter" className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="eng">English</SelectItem>
            <SelectItem value="fra">French</SelectItem>
            <SelectItem value="spa">Spanish</SelectItem>
            <SelectItem value="deu">German</SelectItem>
            <SelectItem value="ita">Italian</SelectItem>
            <SelectItem value="por">Portuguese</SelectItem>
            <SelectItem value="ara">Arabic</SelectItem>
            <SelectItem value="zho">Chinese</SelectItem>
            <SelectItem value="rus">Russian</SelectItem>
          </SelectContent>
        </Select>
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
                <span className="truncate max-w-[120px]">{source}</span>
                <X
                  className="h-3 w-3 cursor-pointer flex-shrink-0 transition-transform duration-[150ms] hover:scale-110"
                  onClick={() => handleSourceRemove(source)}
                  aria-label={`Remove ${source} filter`}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Sentiment Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min-sentiment" className="text-body-sm font-medium">
            Min Sentiment
          </Label>
          <Select
            value={filters.minSentiment?.toString() || "none"}
            onValueChange={(v) => 
              onFiltersChange({ 
                ...filters, 
                minSentiment: v === "none" ? null : parseFloat(v) 
              })
            }
          >
            <SelectTrigger id="min-sentiment" className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]">
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
                maxSentiment: v === "none" ? null : parseFloat(v) 
              })
            }
          >
            <SelectTrigger id="max-sentiment" className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]">
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

      {/* Sort Options */}
      <div className="space-y-2">
        <Label htmlFor="sort-by" className="text-body-sm font-medium">
          Sort By
        </Label>
        <Select
          value={filters.sortBy}
          onValueChange={(v: any) => onFiltersChange({ ...filters, sortBy: v })}
        >
          <SelectTrigger id="sort-by" className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="published_at">Newest First</SelectItem>
            <SelectItem value="social_score">Most Shared</SelectItem>
            <SelectItem value="sentiment">Most Positive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="w-full gap-2 transition-all duration-[150ms] hover:bg-muted/50"
        >
          <X className="h-4 w-4" />
          <span>Clear All Filters</span>
        </Button>
      )}
    </div>
  );
}
