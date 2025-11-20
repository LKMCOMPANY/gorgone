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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Custom debounce function (SAME AS TWITTER)
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

  // Debounced autocomplete search (SAME AS TWITTER)
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

  // Count active filters
  const activeFiltersCount = [
    filters.profile_tag_type,
    filters.verified_only,
    filters.active_tracking_only,
    filters.min_views,
    filters.min_likes,
    filters.min_comments,
    filters.date_range && filters.date_range !== "all",
  ].filter(Boolean).length;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const handleResetFilters = () => {
    setSearchTerm("");
    onFiltersChange({
      sort_by: "recent",
    });
    setShowAdvancedFilters(false);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search with Autocomplete (SAME AS TWITTER) */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Search videos or users (@username)..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchSubmit(e);
                setShowAutocomplete(false);
              }
              if (e.key === "Escape") {
                setShowAutocomplete(false);
              }
            }}
            onFocus={() => autocompleteResults.length > 0 && setShowAutocomplete(true)}
            onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10 transition-colors duration-[150ms]"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Autocomplete Dropdown (SAME AS TWITTER) */}
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
                    <p className="text-body-sm font-medium truncate">{result.label}</p>
                    {result.type === "user" && result.metadata?.follower_count && (
                      <p className="text-caption text-muted-foreground">
                        {result.metadata.follower_count.toLocaleString()} followers
                      </p>
                    )}
                  </div>
                  {result.metadata?.is_verified && (
                    <svg className="h-4 w-4 text-[#20D5EC] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort By */}
        <Select
          value={filters.sort_by || "recent"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, sort_by: value as SortOption })
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
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

        {/* Filters Toggle */}
        <Button
          variant="outline"
          size="default"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-caption">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <Card className="card-padding space-y-6 animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-body font-semibold">Advanced Filters</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Reset All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-body-sm">
                <Calendar className="h-4 w-4" />
                Date Range
              </Label>
              <Select
                value={filters.date_range || "all"}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, date_range: value === "all" ? undefined : value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="3h">Last 3 Hours</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="12h">Last 12 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Profile Tag */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-body-sm">
                <Hash className="h-4 w-4" />
                Profile Label
              </Label>
              <Select
                value={filters.profile_tag_type || "none"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    profile_tag_type: value === "none" ? undefined : value as ProfileTagType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Profiles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Profiles</SelectItem>
                  <SelectItem value="attila">Attila</SelectItem>
                  <SelectItem value="adversary">Adversary</SelectItem>
                  <SelectItem value="surveillance">Surveillance</SelectItem>
                  <SelectItem value="target">Target</SelectItem>
                  <SelectItem value="ally">Ally</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="local_team">Local Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Views */}
            <div className="space-y-2">
              <Label htmlFor="min-views" className="text-body-sm">
                Min. Views
              </Label>
              <Input
                id="min-views"
                type="number"
                placeholder="Any"
                value={filters.min_views || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    min_views: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>

            {/* Min Likes */}
            <div className="space-y-2">
              <Label htmlFor="min-likes" className="text-body-sm">
                Min. Likes
              </Label>
              <Input
                id="min-likes"
                type="number"
                placeholder="Any"
                value={filters.min_likes || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    min_likes: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>

            {/* Min Comments */}
            <div className="space-y-2">
              <Label htmlFor="min-comments" className="text-body-sm">
                Min. Comments
              </Label>
              <Input
                id="min-comments"
                type="number"
                placeholder="Any"
                value={filters.min_comments || ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    min_comments: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>

            {/* Verified Only Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
              <Label htmlFor="verified-only" className="text-body-sm cursor-pointer">
                Verified Only
              </Label>
              <Switch
                id="verified-only"
                checked={filters.verified_only || false}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, verified_only: checked || undefined })
                }
              />
            </div>

            {/* Active Tracking Only Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
              <Label htmlFor="tracking-only" className="text-body-sm cursor-pointer">
                Tracking Only
              </Label>
              <Switch
                id="tracking-only"
                checked={filters.active_tracking_only || false}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, active_tracking_only: checked || undefined })
                }
              />
            </div>
          </div>
        </Card>
      )}

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-2">
              {filters.searchType === "user" ? <User className="h-3 w-3" /> : <Search className="h-3 w-3" />}
              {filters.search}
              <button onClick={handleClearSearch}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.date_range && filters.date_range !== "all" && (
            <Badge variant="secondary" className="gap-2">
              <Calendar className="h-3 w-3" />
              {filters.date_range}
            </Badge>
          )}
          {filters.profile_tag_type && (
            <Badge variant="secondary" className="gap-2">
              <Hash className="h-3 w-3" />
              {filters.profile_tag_type}
            </Badge>
          )}
          {filters.verified_only && (
            <Badge variant="secondary">Verified Only</Badge>
          )}
          {filters.active_tracking_only && (
            <Badge variant="secondary">Tracking Only</Badge>
          )}
        </div>
      )}
    </div>
  );
}

