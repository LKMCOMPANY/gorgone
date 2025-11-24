"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Filter, Calendar, Hash, User, TrendingUp } from "lucide-react";
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

export type SortOption = "recent" | "most_views" | "most_retweets" | "most_replies" | "most_likes" | "most_engagement";
export type ProfileTagType = "attila" | "adversary" | "surveillance" | "target" | "ally" | "asset" | "local_team";
export type PostType = "post" | "repost" | "reply" | "quote";

export interface TwitterFeedFilters {
  search?: string;
  searchType?: "keyword" | "user";
  sort_by?: SortOption;
  post_type?: PostType;
  profile_tag_type?: ProfileTagType;
  has_links?: boolean;
  verified_only?: boolean;
  active_tracking_only?: boolean;
  min_views?: number;
  min_retweets?: number;
  min_likes?: number;
  min_replies?: number;
  date_range?: "1h" | "3h" | "6h" | "12h" | "24h" | "7d" | "30d" | "all";
  languages?: string[];
  locations?: string[];
}

interface AutocompleteResult {
  type: "user" | "keyword";
  value: string;
  label: string;
  metadata?: {
    profile_picture_url?: string;
    followers_count?: number;
    is_verified?: boolean;
  };
}

interface TwitterFeedFiltersProps {
  zoneId: string;
  filters: TwitterFeedFilters;
  onFiltersChange: (filters: TwitterFeedFilters) => void;
}

export function TwitterFeedFilters({
  zoneId,
  filters,
  onFiltersChange,
}: TwitterFeedFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounced autocomplete search
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term || term.length < 2) {
        setAutocompleteResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/twitter/autocomplete?zone_id=${zoneId}&q=${encodeURIComponent(term)}`
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

  const handleClearSearch = () => {
    setSearchTerm("");
    onFiltersChange({
      ...filters,
      search: undefined,
      searchType: undefined,
    });
  };

  const handleFilterChange = (key: keyof TwitterFeedFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.post_type) count++;
    if (filters.profile_tag_type) count++;
    if (filters.has_links) count++;
    if (filters.verified_only) count++;
    if (filters.active_tracking_only) count++;
    if (filters.min_views) count++;
    if (filters.min_retweets) count++;
    if (filters.min_likes) count++;
    if (filters.min_replies) count++;
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
            placeholder="Search by keyword or username..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowAutocomplete(true)}
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
                {result.type === "user" && result.metadata?.profile_picture_url ? (
                  <img
                    src={result.metadata.profile_picture_url}
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
                        className="h-4 w-4 text-blue-500 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                      </svg>
                    )}
                  </div>
                  {result.type === "user" && result.metadata?.followers_count && (
                    <p className="text-caption text-muted-foreground">
                      {result.metadata.followers_count.toLocaleString()} followers
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
            <TrendingUp className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="most_views">Most Views</SelectItem>
            <SelectItem value="most_retweets">Most Retweets</SelectItem>
            <SelectItem value="most_replies">Most Replies</SelectItem>
            <SelectItem value="most_likes">Most Likes</SelectItem>
            <SelectItem value="most_engagement">Most Engagement</SelectItem>
          </SelectContent>
        </Select>

        {/* Post Type Filter */}
        <Select
          value={filters.post_type || "all"}
          onValueChange={(value) =>
            handleFilterChange("post_type", value === "all" ? undefined : (value as PostType))
          }
        >
          <SelectTrigger className="h-9 w-[140px] transition-shadow duration-[150ms]">
            <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <SelectValue placeholder="Post type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="post">Posts</SelectItem>
            <SelectItem value="repost">Reposts</SelectItem>
            <SelectItem value="reply">Replies</SelectItem>
            <SelectItem value="quote">Quotes</SelectItem>
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

        {/* Active Post Type Filter */}
        {filters.post_type && (
          <Badge variant="secondary" className="gap-2 capitalize">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            {filters.post_type}s
            <button
              onClick={() => handleFilterChange("post_type", undefined)}
              className="hover:text-foreground transition-colors duration-[150ms]"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}

        {/* Active Profile Tag Filter */}
        {filters.profile_tag_type && (
          <Badge variant="secondary" className="gap-2 capitalize">
            <User className="h-3 w-3" />
            {filters.profile_tag_type.replace("_", " ")}
            <button
              onClick={() => handleFilterChange("profile_tag_type", undefined)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Content Type Filters */}
            <button
              onClick={() =>
                handleFilterChange("has_links", !filters.has_links || undefined)
              }
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all duration-[150ms]",
                filters.has_links
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-[150ms]",
                  filters.has_links
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              >
                {filters.has_links && (
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
              <span className="text-body-sm font-medium">Has Links</span>
            </button>

            <button
              onClick={() =>
                handleFilterChange(
                  "verified_only",
                  !filters.verified_only || undefined
                )
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

          {/* Language & Location Filters (NEW) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LanguageFilter
              zoneId={zoneId}
              source="twitter"
              selected={filters.languages || []}
              onChange={(languages) =>
                handleFilterChange("languages", languages.length > 0 ? languages : undefined)
              }
            />
            <LocationFilter
              zoneId={zoneId}
              source="twitter"
              selected={filters.locations || []}
              onChange={(locations) =>
                handleFilterChange("locations", locations.length > 0 ? locations : undefined)
              }
            />
          </div>

          {/* Engagement Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <SelectItem value="100">100+</SelectItem>
                  <SelectItem value="500">500+</SelectItem>
                  <SelectItem value="1000">1K+</SelectItem>
                  <SelectItem value="5000">5K+</SelectItem>
                  <SelectItem value="10000">10K+</SelectItem>
                  <SelectItem value="50000">50K+</SelectItem>
                  <SelectItem value="100000">100K+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Retweets */}
            <div className="space-y-2">
              <label className="text-body-sm font-medium">Minimum Retweets</label>
              <Select
                value={filters.min_retweets?.toString() || "0"}
                onValueChange={(value) =>
                  handleFilterChange("min_retweets", value === "0" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger className="transition-shadow duration-[150ms]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="5">5+</SelectItem>
                  <SelectItem value="10">10+</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                  <SelectItem value="100">100+</SelectItem>
                  <SelectItem value="500">500+</SelectItem>
                  <SelectItem value="1000">1K+</SelectItem>
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
                  <SelectItem value="10">10+</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                  <SelectItem value="100">100+</SelectItem>
                  <SelectItem value="500">500+</SelectItem>
                  <SelectItem value="1000">1K+</SelectItem>
                  <SelectItem value="5000">5K+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Replies */}
            <div className="space-y-2">
              <label className="text-body-sm font-medium">Minimum Replies</label>
              <Select
                value={filters.min_replies?.toString() || "0"}
                onValueChange={(value) =>
                  handleFilterChange("min_replies", value === "0" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger className="transition-shadow duration-[150ms]">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="5">5+</SelectItem>
                  <SelectItem value="10">10+</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                  <SelectItem value="100">100+</SelectItem>
                  <SelectItem value="500">500+</SelectItem>
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

