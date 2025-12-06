"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Filter, User, TrendingUp, Users } from "lucide-react";
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

export type ProfileSortOption = "followers" | "engagement" | "tweets" | "recent";
export type ProfileTagType = "attila" | "adversary" | "surveillance" | "target" | "ally" | "asset" | "local_team";

export interface TwitterProfilesFilters {
  search?: string;
  sort_by?: ProfileSortOption;
  profile_tag_type?: ProfileTagType;
  verified_only?: boolean;
  min_followers?: number;
  min_tweets?: number;
}

interface AutocompleteResult {
  type: "user";
  value: string;
  label: string;
  metadata?: {
    profile_picture_url?: string;
    followers_count?: number;
    is_verified?: boolean;
  };
}

interface TwitterProfilesFiltersProps {
  zoneId: string;
  filters: TwitterProfilesFilters;
  onFiltersChange: (filters: TwitterProfilesFilters) => void;
}

export function TwitterProfilesFilters({
  zoneId,
  filters,
  onFiltersChange,
}: TwitterProfilesFiltersProps) {
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
          `/api/twitter/autocomplete?zone_id=${zoneId}&q=${encodeURIComponent(term)}&type=user`
        );
        const data = await response.json();

        if (data.success) {
          // Filter only users
          const userResults = (data.results || []).filter((r: any) => r.type === "user");
          setAutocompleteResults(userResults);
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
    });
    setShowAutocomplete(false);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    onFiltersChange({
      ...filters,
      search: undefined,
    });
  };

  const handleFilterChange = (key: keyof TwitterProfilesFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.profile_tag_type) count++;
    if (filters.verified_only) count++;
    if (filters.min_followers) count++;
    if (filters.min_tweets) count++;
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
            placeholder="Search profiles by username or name..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowAutocomplete(true)}
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
                {result.metadata?.profile_picture_url ? (
                  <img
                    src={result.metadata.profile_picture_url}
                    alt={result.label}
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="size-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {result.label}
                    </p>
                    {result.metadata?.is_verified && (
                      <svg
                        className="size-4 text-chart-2 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                      </svg>
                    )}
                  </div>
                  {result.metadata?.followers_count && (
                    <p className="text-xs text-muted-foreground">
                      {result.metadata.followers_count.toLocaleString()} followers
                    </p>
                  )}
                </div>
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
          value={filters.sort_by || "followers"}
          onValueChange={(value) =>
            handleFilterChange("sort_by", value as ProfileSortOption)
          }
        >
          <SelectTrigger className="h-9 w-[180px] transition-shadow duration-[var(--transition-fast)]">
            <TrendingUp className="size-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="followers">Most Followers</SelectItem>
            <SelectItem value="engagement">Most Engagement</SelectItem>
            <SelectItem value="tweets">Most Tweets</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
          </SelectContent>
        </Select>

        {/* Profile Type Filter */}
        <Select
          value={filters.profile_tag_type || "all"}
          onValueChange={(value) =>
            handleFilterChange("profile_tag_type", value === "all" ? undefined : (value as ProfileTagType))
          }
        >
          <SelectTrigger className="h-9 w-[160px] transition-shadow duration-[var(--transition-fast)]">
            <User className="size-4 mr-2" />
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

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            "gap-2 transition-all duration-[var(--transition-fast)]",
            activeFiltersCount > 0 && "border-primary text-primary"
          )}
        >
          <Filter className="size-4" />
          Filters
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

        {/* Active Profile Tag Filter */}
        {filters.profile_tag_type && (
          <Badge variant="secondary" className="gap-2 capitalize">
            <User className="size-3" />
            {filters.profile_tag_type.replace("_", " ")}
            <button
              onClick={() => handleFilterChange("profile_tag_type", undefined)}
              className="hover:text-foreground transition-colors duration-[var(--transition-fast)]"
            >
              <X className="size-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="space-y-4 pt-4 border-t border-border animate-in slide-in-from-top-2 fade-in-0 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Verified Only Filter */}
            <button
              onClick={() =>
                handleFilterChange(
                  "verified_only",
                  !filters.verified_only || undefined
                )
              }
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all duration-[var(--transition-fast)]",
                filters.verified_only
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-[var(--transition-fast)]",
                  filters.verified_only
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              >
                {filters.verified_only && (
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
              <span className="text-sm font-medium">Verified Only</span>
            </button>
          </div>

          {/* Engagement Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Minimum Followers */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users className="size-4" />
                Minimum Followers
              </label>
              <Select
                value={filters.min_followers?.toString() || "0"}
                onValueChange={(value) =>
                  handleFilterChange("min_followers", value === "0" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger className="transition-shadow duration-[var(--transition-fast)]">
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
                  <SelectItem value="500000">500K+</SelectItem>
                  <SelectItem value="1000000">1M+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Tweets */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Tweets</label>
              <Select
                value={filters.min_tweets?.toString() || "0"}
                onValueChange={(value) =>
                  handleFilterChange("min_tweets", value === "0" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger className="transition-shadow duration-[var(--transition-fast)]">
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
                  sort_by: filters.sort_by,
                })
              }
              className="w-full gap-2"
            >
              <X className="size-4" />
              Clear filters
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

