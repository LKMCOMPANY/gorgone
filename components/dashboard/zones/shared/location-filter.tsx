"use client";

/**
 * Location Filter Component
 * 
 * Professional multi-select location filter following Gorgone design system.
 * Features:
 * - Redis-cached location options (5-min TTL)
 * - Search functionality for large location lists
 * - Visual feedback with counts
 * - Auto-save behavior
 * - Elegant skeleton loading
 * - Mobile-responsive
 */

import { useState, useEffect } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { LocationOption } from "@/lib/data/filters/language-location";

interface LocationFilterProps {
  zoneId: string;
  source: "twitter" | "tiktok" | "media";
  selected: string[];
  onChange: (locations: string[]) => void;
  className?: string;
  label?: string;
}

export function LocationFilter({
  zoneId,
  source,
  selected,
  onChange,
  className,
  label,
}: LocationFilterProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auto-generate label based on source
  const displayLabel = label || (() => {
    if (source === "media") return "Country (Source)";
    if (source === "tiktok") return "Location (POI)";
    return "Location";
  })();

  // Fetch available locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/filters/language-location?zoneId=${zoneId}&source=${source}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch filter options");
        }

        const data = await response.json();
        setLocations(data.locations || []);
        setHasLoaded(true);
      } catch (err) {
        console.error("Error fetching locations:", err);
        setError("Failed to load locations");
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    fetchLocations();
  }, [zoneId, source]);

  // Filter locations by search
  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle location selection
  const toggleLocation = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((l) => l !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  // Clear all selections
  const clearAll = () => {
    onChange([]);
  };

  // Loading state with elegant skeleton
  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-body-sm font-medium">{displayLabel}</span>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-caption text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state (no data available)
  if (hasLoaded && locations.length === 0 && !loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-body-sm font-medium">{displayLabel}</span>
        </div>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center">
          <p className="text-caption text-muted-foreground">
            No location data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-body-sm font-medium">{displayLabel}</span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-caption tabular-nums">
              {selected.length}
            </Badge>
          )}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2 text-caption transition-colors duration-[150ms] hover:text-destructive"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Search (only if many locations) */}
      {locations.length > 5 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-9 text-body-sm transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 transition-colors duration-[150ms]"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Location list with scroll */}
      <ScrollArea className="h-[200px] rounded-lg border border-border bg-muted/20 p-2">
        <div className="space-y-1">
          {filteredLocations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-caption text-muted-foreground">
                No locations found
              </p>
            </div>
          ) : (
            filteredLocations.map((loc) => {
              const isSelected = selected.includes(loc.name);
              return (
                <button
                  key={loc.name}
                  onClick={() => toggleLocation(loc.name)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors duration-[150ms]",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors duration-[150ms]",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && (
                        <svg
                          className="h-3 w-3 text-primary-foreground"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 6L5 9L10 3" />
                        </svg>
                      )}
                    </div>
                    <span className="truncate text-body-sm font-medium" title={loc.name}>
                      {loc.name}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="h-5 flex-shrink-0 px-1.5 text-caption tabular-nums"
                  >
                    {loc.count.toLocaleString()}
                  </Badge>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Selected badges (mobile clarity) */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => {
            const loc = locations.find((l) => l.name === name);
            if (!loc) return null;
            return (
              <Badge
                key={name}
                variant="secondary"
                className="h-6 gap-1.5 border border-primary/20 bg-primary/10 px-2 text-caption font-medium text-primary transition-colors duration-[150ms] hover:bg-primary/15"
              >
                <span className="max-w-[100px] truncate" title={loc.name}>
                  {loc.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLocation(name);
                  }}
                  className="transition-colors duration-[150ms] hover:text-destructive"
                  aria-label={`Remove ${loc.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
