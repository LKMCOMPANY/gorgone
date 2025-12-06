/**
 * Media Feed Filters Component (Production Ready)
 * 
 * Clean implementation following Twitter's exact pattern.
 * No over-engineering, just best practices.
 * 
 * Features:
 * - Autocomplete with debouncing (for suggestions only)
 * - Search applied ONLY on selection or Enter key
 * - No page reload during typing
 * - Consistent with Twitter feed behavior
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Filter, TrendingUp, ShieldCheck, Calendar, Globe, Hash } from "lucide-react";
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

// Custom debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

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

interface AutocompleteResult {
  type: "keyword" | "source";
  value: string;
  label: string;
  metadata?: {
    website_url?: string;
    location_country?: string;
    source_type?: string;
    article_count?: number;
  };
}

interface MediaFeedFiltersProps {
  zoneId: string;
  filters: MediaFeedFilters;
  onFiltersChange: (filters: MediaFeedFilters) => void;
}

export function MediaFeedFilters({
  zoneId,
  filters,
  onFiltersChange,
}: MediaFeedFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounced autocomplete search (NOT for filter update)
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term || term.length < 2) {
        setAutocompleteResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/media/autocomplete?zone_id=${zoneId}&q=${encodeURIComponent(term)}`
        );
        const data = await response.json();

        if (data.success) {
          setAutocompleteResults(data.results || []);
        }
      } catch (error) {
        console.error("Autocomplete search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [zoneId]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowAutocomplete(true);
  };

  const handleSelectAutocomplete = (result: AutocompleteResult) => {
    if (result.type === "source") {
      // Add source to filter list
      if (!filters.sources.includes(result.value)) {
        onFiltersChange({
          ...filters,
          sources: [...filters.sources, result.value],
        });
      }
      setSearchTerm("");
    } else {
      // Set keyword search
      setSearchTerm(result.value);
      onFiltersChange({
        ...filters,
        search: result.value,
      });
    }
    setShowAutocomplete(false);
  };

  const handleSearchSubmit = () => {
    if (!searchTerm.trim()) {
      handleClearSearch();
      return;
    }
    onFiltersChange({
      ...filters,
      search: searchTerm.trim(),
    });
    setShowAutocomplete(false);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    onFiltersChange({
      ...filters,
      search: "",
    });
  };

  const handleFilterChange = (key: keyof MediaFeedFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleRemoveSource = (sourceUri: string) => {
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
    <Card className="p-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search articles by title or keywords..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowAutocomplete(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchSubmit();
              }
              if (e.key === "Escape") {
                setShowAutocomplete(false);
              }
            }}
            className="pl-10 pr-10 h-9 transition-shadow duration-[var(--transition-fast)] focus-visible:shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-[var(--transition-fast)]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {showAutocomplete && autocompleteResults.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
            {autocompleteResults.map((result, index) => (
              <button
                key={`${result.type}-${result.value}-${index}`}
                onClick={() => handleSelectAutocomplete(result)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors duration-[var(--transition-fast)] text-left"
              >
                {/* Icon */}
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {result.type === "source" ? (
                    <Globe className="size-4 text-primary" />
                  ) : (
                    <Hash className="size-4 text-primary" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.label}</p>
                  {result.type === "source" && result.metadata?.location_country && (
                    <p className="text-xs text-muted-foreground truncate">
                      {result.metadata.location_country}
                    </p>
                  )}
                </div>

                {/* Type Badge */}
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {result.type === "source" ? "Source" : "Keyword"}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Quick Controls Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort By */}
        <Select
          value={filters.sortBy}
          onValueChange={(value: any) => handleFilterChange("sortBy", value)}
        >
          <SelectTrigger className="h-9 w-[180px] transition-shadow duration-[var(--transition-fast)]">
            <TrendingUp className="mr-2 size-4" />
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
          onClick={() => handleFilterChange("verifiedOnly", !filters.verifiedOnly)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border px-3 transition-all duration-[var(--transition-fast)]",
            filters.verifiedOnly
              ? "border-primary bg-primary/5 text-primary"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border-2 transition-all duration-[var(--transition-fast)]",
              filters.verifiedOnly ? "border-primary bg-primary" : "border-muted-foreground"
            )}
          >
            {filters.verifiedOnly && (
              <svg
                className="size-3 text-primary-foreground"
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
          <ShieldCheck className="size-4" />
          <span className="text-sm font-medium">Verified Only</span>
        </button>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            "ml-auto gap-2 transition-all duration-[var(--transition-fast)]",
            activeFiltersCount > 0 && "border-primary text-primary"
          )}
        >
          <Filter className="size-4" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="size-5 rounded-full p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Active Search Display */}
        {filters.search && (
          <Badge variant="secondary" className="gap-2">
            <Search className="size-3" />
            {filters.search}
            <button
              onClick={handleClearSearch}
              className="hover:text-foreground transition-colors duration-[var(--transition-fast)]"
            >
              <X className="size-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* Selected Sources */}
      {filters.sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.sources.map((source) => (
            <Badge
              key={source}
              variant="secondary"
              className="gap-2 capitalize"
            >
              <Globe className="size-3" />
              {source}
              <button
                onClick={() => handleRemoveSource(source)}
                className="hover:text-foreground transition-colors duration-[var(--transition-fast)]"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="space-y-4 border-t border-border pt-4 animate-in slide-in-from-top-2 fade-in-0 duration-200">
          {/* Date Range */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date-start" className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="size-4" />
                From Date
              </Label>
              <Input
                id="date-start"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="h-9 transition-shadow duration-[var(--transition-fast)] focus-visible:shadow-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-end" className="text-sm font-medium">
                To Date
              </Label>
              <Input
                id="date-end"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="h-9 transition-shadow duration-[var(--transition-fast)] focus-visible:shadow-xs"
              />
            </div>
          </div>

          {/* Language & Location Filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LanguageFilter
              zoneId={zoneId}
              source="media"
              selected={filters.languages || []}
              onChange={(languages) => handleFilterChange("languages", languages)}
            />
            <LocationFilter
              zoneId={zoneId}
              source="media"
              selected={filters.locations || []}
              onChange={(locations) => handleFilterChange("locations", locations)}
              label="Country (Source)"
            />
          </div>

          {/* Sentiment Range */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="flex-1 space-y-2">
              <Label htmlFor="min-sentiment" className="text-sm font-medium">
                Min Sentiment
              </Label>
              <Select
                value={filters.minSentiment?.toString() || "none"}
                onValueChange={(v) =>
                  handleFilterChange("minSentiment", v === "none" ? null : parseFloat(v))
                }
              >
                <SelectTrigger
                  id="min-sentiment"
                  className="w-full transition-shadow duration-[var(--transition-fast)] focus-visible:shadow-xs"
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
            <div className="flex-1 space-y-2">
              <Label htmlFor="max-sentiment" className="text-sm font-medium">
                Max Sentiment
              </Label>
              <Select
                value={filters.maxSentiment?.toString() || "none"}
                onValueChange={(v) =>
                  handleFilterChange("maxSentiment", v === "none" ? null : parseFloat(v))
                }
              >
                <SelectTrigger
                  id="max-sentiment"
                  className="w-full transition-shadow duration-[var(--transition-fast)] focus-visible:shadow-xs"
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
              <X className="size-4" />
              Clear Advanced Filters
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
