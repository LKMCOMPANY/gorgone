"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Filter, Hash, User } from "lucide-react";
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

// Debounce function (SAME AS TWITTER)
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export type ProfileSortOption = "engagement" | "followers" | "videos" | "recent";
export type ProfileTagType = "attila" | "adversary" | "surveillance" | "target" | "ally" | "asset" | "local_team";

export interface TikTokProfilesFilters {
  search?: string;
  sort_by?: ProfileSortOption;
  profile_tag_type?: ProfileTagType;
  verified_only?: boolean;
  min_followers?: number;
  min_videos?: number;
}

interface AutocompleteResult {
  type: "user";
  value: string;
  label: string;
  metadata?: {
    avatar_thumb?: string;
    follower_count?: number;
    is_verified?: boolean;
  };
}

interface TikTokProfilesFiltersProps {
  zoneId: string;
  filters: TikTokProfilesFilters;
  onFiltersChange: (filters: TikTokProfilesFilters) => void;
}

export function TikTokProfilesFilters({ zoneId, filters, onFiltersChange }: TikTokProfilesFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounced autocomplete (SAME AS TWITTER)
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term || term.length < 2) {
        setAutocompleteResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/tiktok/autocomplete?zone_id=${zoneId}&q=${encodeURIComponent(term)}&type=user`);
        const data = await response.json();

        if (data.success) {
          const userResults = (data.results || []).filter((r: any) => r.type === "user");
          setAutocompleteResults(userResults);
        }
      } catch (error) {
        console.error("Autocomplete failed:", error);
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
    const username = result.value.replace("@", "");
    setSearchTerm(username);
    onFiltersChange({ ...filters, search: username });
    setShowAutocomplete(false);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    onFiltersChange({ ...filters, search: undefined });
  };

  const handleFilterChange = (key: keyof TikTokProfilesFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = [
    filters.profile_tag_type,
    filters.verified_only,
    filters.min_followers,
    filters.min_videos,
  ].filter(Boolean).length;

  return (
    <Card className="card-padding">
      <div className="space-y-4">
        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search with Autocomplete */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search profiles (@username or name)..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onFiltersChange({ ...filters, search: searchTerm || undefined });
                  setShowAutocomplete(false);
                }
                if (e.key === "Escape") setShowAutocomplete(false);
              }}
              onFocus={() => autocompleteResults.length > 0 && setShowAutocomplete(true)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Autocomplete Dropdown */}
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
                {autocompleteResults.map((result, index) => (
                  <button
                    key={`${result.value}-${index}`}
                    onClick={() => handleSelectAutocomplete(result)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors duration-[150ms] text-left"
                  >
                    {result.metadata?.avatar_thumb ? (
                      <img src={result.metadata.avatar_thumb} alt={result.label} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium truncate">{result.label}</p>
                      {result.metadata?.follower_count && (
                        <p className="text-caption text-muted-foreground">
                          {result.metadata.follower_count.toLocaleString()} followers
                        </p>
                      )}
                    </div>
                    {result.metadata?.is_verified && (
                      <svg className="h-4 w-4 text-[#20D5EC]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <Select
            value={filters.sort_by || "engagement"}
            onValueChange={(value) => handleFilterChange("sort_by", value as ProfileSortOption)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="engagement">Most Engagement</SelectItem>
              <SelectItem value="followers">Most Followers</SelectItem>
              <SelectItem value="videos">Most Videos</SelectItem>
              <SelectItem value="recent">Recently Active</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters Toggle */}
          <Button
            variant="outline"
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

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-4 space-y-4 border-t border-border/60 animate-in fade-in-0 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Profile Tag */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-body-sm">
                  <Hash className="h-4 w-4" />
                  Profile Label
                </Label>
                <Select
                  value={filters.profile_tag_type || "none"}
                  onValueChange={(value) => handleFilterChange("profile_tag_type", value === "none" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              {/* Min Followers */}
              <div className="space-y-2">
                <Label className="text-body-sm">Min. Followers</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.min_followers || ""}
                  onChange={(e) => handleFilterChange("min_followers", e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              {/* Min Videos */}
              <div className="space-y-2">
                <Label className="text-body-sm">Min. Videos in Zone</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.min_videos || ""}
                  onChange={(e) => handleFilterChange("min_videos", e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              {/* Verified Only */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                <Label htmlFor="verified-only-profiles" className="text-body-sm cursor-pointer">
                  Verified Only
                </Label>
                <Switch
                  id="verified-only-profiles"
                  checked={filters.verified_only || false}
                  onCheckedChange={(checked) => handleFilterChange("verified_only", checked || undefined)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

