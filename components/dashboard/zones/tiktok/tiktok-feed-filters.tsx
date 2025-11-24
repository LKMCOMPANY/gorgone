/**
 * TikTok Feed Filters Component (Production Ready)
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
import { Search, X, Filter, Calendar, Hash, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
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

export type SortOption = "recent" | "most_views" | "most_likes" | "most_comments" | "most_shares" | "most_engagement";
export type ProfileTagType = "attila" | "adversary" | "surveillance" | "target" | "ally" | "asset" | "local_team";

export interface TikTokFeedFilters {
  search?: string;
  searchType?: "keyword" | "user";
  sort_by?: SortOption;
  profile_tag_type?: ProfileTagType;
  verified_only?: boolean;
  active_tracking_only?: boolean;
  min_views?: number;
  min_likes?: number;
  min_comments?: number;
  date_range?: "1h" | "3h" | "6h" | "12h" | "24h" | "7d" | "30d" | "all";
  languages?: string[];
  locations?: string[];
}

interface AutocompleteResult {
  type: "user" | "keyword";
  value: string;
  label: string;
  metadata?: {
    avatar_thumb?: string;
    follower_count?: number;
    is_verified?: boolean;
  };
}

interface TikTokFeedFiltersProps {
  zoneId: string;
  filters: TikTokFeedFilters;
  onFiltersChange: (filters: TikTokFeedFilters) => void;
}

export function TikTokFeedFilters({
  zoneId,
  filters,
  onFiltersChange,
}: TikTokFeedFiltersProps) {
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
          `/api/tiktok/autocomplete?zone_id=${zoneId}&q=${encodeURIComponent(term)}`
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
    setSearchTerm(result.value);
    onFiltersChange({
      ...filters,
      search: result.value,
      searchType: result.type === "user" ? "user" : "keyword",
    });
    setShowAutocomplete(false);
  };

  const handleSearchSubmit = () => {
    if (!searchTerm.trim()) {
      handleClearSearch();
      return;
    }
    const type = searchTerm.startsWith("@") ? "user" : "keyword";
    onFiltersChange({
      ...filters,
      search: searchTerm.trim(),
      searchType: type,
    });
    setShowAutocomplete(false);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    onFiltersChange({
      ...filters,
      search: undefined,
      searchType: undefined,
    });
  };

  const handleFilterChange = (key: keyof TikTokFeedFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  // Count active filters
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.profile_tag_type) count++;
    if (filters.verified_only) count++;
    if (filters.active_tracking_only) count++;
    if (filters.min_views) count++;
    if (filters.min_likes) count++;
    if (filters.min_comments) count++;
    if (filters.languages && filters.languages.length > 0) count++;
    if (filters.locations && filters.locations.length > 0) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className="card-padding space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search videos or users (@username)..."
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
            className="pl-10 pr-10 h-11 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-[150ms]"
            >
              <X className="h-4 w-4" />
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
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors duration-[150ms] text-left"
              >
                {result.type === "user" && result.metadata?.avatar_thumb ? (
                  <img
                    src={result.metadata.avatar_thumb}
                    alt={result.label}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {result.type === "user" ? (
                      <User className="h-4 w-4 text-primary" />
                    ) : (
                      <Hash className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body-sm font-medium truncate">
                      {result.label}
                    </p>
                    {result.type === "user" && result.metadata?.is_verified && (
                      <svg
                        className="h-4 w-4 text-[#20D5EC] flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  {result.type === "user" && result.metadata?.follower_count && (
                    <p className="text-caption text-muted-foreground">
                      {result.metadata.follower_count.toLocaleString()} followers
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="text-caption">
                  {result.type === "user" ? "User" : "Keyword"}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Quick Controls Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sort By */}
        <Select
          value={filters.sort_by || "recent"}
          onValueChange={(value) =>
            handleFilterChange("sort_by", value as SortOption)
          }
        >
          <SelectTrigger className="h-9 w-[180px] transition-shadow duration-[150ms]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="most_views">Most Views</SelectItem>
            <SelectItem value="most_likes">Most Likes</SelectItem>
            <SelectItem value="most_comments">Most Comments</SelectItem>
            <SelectItem value="most_shares">Most Shares</SelectItem>
            <SelectItem value="most_engagement">Most Engagement</SelectItem>
          </SelectContent>
        </Select>

        {/* Profile Type Filter */}
        <Select
          value={filters.profile_tag_type || "all"}
          onValueChange={(value) =>
            handleFilterChange("profile_tag_type", value === "all" ? undefined : (value as ProfileTagType))
          }
        >
          <SelectTrigger className="h-9 w-[160px] transition-shadow duration-[150ms]">
            <User className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Profile type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Profiles</SelectItem>
            <SelectItem value="attila">Attila</SelectItem>
            <SelectItem value="adversary">Adversary</SelectItem>
            <SelectItem value="surveillance">Surveillance</SelectItem>
            <SelectItem value="target">Target</SelectItem>
            <SelectItem value="ally">Ally</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="local_team">Local Team</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range */}
        <Select
          value={filters.date_range || "all"}
          onValueChange={(value) =>
            handleFilterChange("date_range", value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="h-9 w-[140px] transition-shadow duration-[150ms]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="1h">Last hour</SelectItem>
            <SelectItem value="3h">Last 3 hours</SelectItem>
            <SelectItem value="6h">Last 6 hours</SelectItem>
            <SelectItem value="12h">Last 12 hours</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            "gap-2 transition-all duration-[150ms]",
            activeFiltersCount > 0 && "border-primary text-primary"
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Active Search Display */}
        {filters.search && (
          <Badge variant="secondary" className="gap-2">
            <Search className="h-3 w-3" />
            {filters.search}
            <button
              onClick={handleClearSearch}
              className="hover:text-foreground transition-colors duration-[150ms]"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="space-y-4 pt-4 border-t border-border animate-in slide-in-from-top-2 fade-in-0 duration-200">
          {/* Content Type Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() =>
                handleFilterChange("verified_only", !filters.verified_only || undefined)
              }
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all duration-[150ms]",
                filters.verified_only
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-[150ms]",
                  filters.verified_only
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              >
                {filters.verified_only && (
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
              <span className="text-body-sm font-medium">Verified Only</span>
            </button>

            <button
              onClick={() =>
                handleFilterChange(
                  "active_tracking_only",
                  !filters.active_tracking_only || undefined
                )
              }
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all duration-[150ms]",
                filters.active_tracking_only
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-[150ms]",
                  filters.active_tracking_only
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              >
                {filters.active_tracking_only && (
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
              <span className="text-body-sm font-medium">Active Tracking Only</span>
            </button>
          </div>

          {/* Language & Location Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LanguageFilter
              zoneId={zoneId}
              source="tiktok"
              selected={filters.languages || []}
              onChange={(languages) =>
                handleFilterChange("languages", languages.length > 0 ? languages : undefined)
              }
            />
            <LocationFilter
              zoneId={zoneId}
              source="tiktok"
              selected={filters.locations || []}
              onChange={(locations) =>
                handleFilterChange("locations", locations.length > 0 ? locations : undefined)
              }
              label="Location (POI)"
            />
          </div>

          {/* Engagement Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Minimum Views */}
            <div className="space-y-2">
              <label className="text-body-sm font-medium">Minimum Views</label>
              <Select
                value={filters.min_views?.toString() || "0"}
                onValueChange={(value) =>
                  handleFilterChange("min_views", value === "0" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger className="transition-shadow duration-[150ms]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="1000">1K+</SelectItem>
                  <SelectItem value="5000">5K+</SelectItem>
                  <SelectItem value="10000">10K+</SelectItem>
                  <SelectItem value="50000">50K+</SelectItem>
                  <SelectItem value="100000">100K+</SelectItem>
                  <SelectItem value="500000">500K+</SelectItem>
                  <SelectItem value="1000000">1M+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Likes */}
            <div className="space-y-2">
              <label className="text-body-sm font-medium">Minimum Likes</label>
              <Select
                value={filters.min_likes?.toString() || "0"}
                onValueChange={(value) =>
                  handleFilterChange("min_likes", value === "0" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger className="transition-shadow duration-[150ms]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="100">100+</SelectItem>
                  <SelectItem value="500">500+</SelectItem>
                  <SelectItem value="1000">1K+</SelectItem>
                  <SelectItem value="5000">5K+</SelectItem>
                  <SelectItem value="10000">10K+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Comments */}
            <div className="space-y-2">
              <label className="text-body-sm font-medium">Minimum Comments</label>
              <Select
                value={filters.min_comments?.toString() || "0"}
                onValueChange={(value) =>
                  handleFilterChange("min_comments", value === "0" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger className="transition-shadow duration-[150ms]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="10">10+</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                  <SelectItem value="100">100+</SelectItem>
                  <SelectItem value="500">500+</SelectItem>
                  <SelectItem value="1000">1K+</SelectItem>
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
                  searchType: filters.searchType,
                  sort_by: filters.sort_by,
                  date_range: filters.date_range,
                })
              }
              className="w-full gap-2"
            >
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
