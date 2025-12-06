"use client";

/**
 * Language Filter Component
 * 
 * Professional multi-select language filter following Gorgone design system.
 * Features:
 * - Redis-cached language options (5-min TTL)
 * - Search functionality for large language lists
 * - Visual feedback with counts
 * - Auto-save behavior
 * - Elegant skeleton loading
 * - Mobile-responsive
 */

import { useState, useEffect } from "react";
import { Globe, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { LanguageOption } from "@/lib/data/filters/language-location";

interface LanguageFilterProps {
  zoneId: string;
  source: "twitter" | "tiktok" | "media";
  selected: string[];
  onChange: (languages: string[]) => void;
  className?: string;
}

export function LanguageFilter({
  zoneId,
  source,
  selected,
  onChange,
  className,
}: LanguageFilterProps) {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch available languages
  useEffect(() => {
    async function fetchLanguages() {
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
        setLanguages(data.languages || []);
        setHasLoaded(true);
      } catch (err) {
        console.error("Error fetching languages:", err);
        setError("Failed to load languages");
        setHasLoaded(true);
      } finally {
        setLoading(false);
      }
    }

    fetchLanguages();
  }, [zoneId, source]);

  // Filter languages by search
  const filteredLanguages = languages.filter(
    (lang) =>
      lang.name.toLowerCase().includes(search.toLowerCase()) ||
      lang.code.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle language selection
  const toggleLanguage = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((l) => l !== code));
    } else {
      onChange([...selected, code]);
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
          <Globe className="size-4 text-muted-foreground" />
          <Skeleton className="h-4 w-20" />
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
          <Globe className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Language</span>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state (no data available)
  if (hasLoaded && languages.length === 0 && !loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Language</span>
        </div>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            No language data available
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
          <Globe className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Language</span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs tabular-nums">
              {selected.length}
            </Badge>
          )}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2 text-xs transition-colors duration-[var(--transition-fast)] hover:text-destructive"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Search (only if many languages) */}
      {languages.length > 5 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search languages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-9 text-sm transition-shadow duration-[var(--transition-fast)] focus-visible:shadow-xs"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="absolute right-1 top-1/2 size-7 -translate-y-1/2 p-0 transition-colors duration-[var(--transition-fast)]"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Language list with scroll */}
      <ScrollArea className="h-[200px] rounded-lg border border-border bg-muted/20 p-2">
        <div className="space-y-1">
          {filteredLanguages.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs text-muted-foreground">
                No languages found
              </p>
            </div>
          ) : (
            filteredLanguages.map((lang) => {
              const isSelected = selected.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors duration-[var(--transition-fast)]",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors duration-[var(--transition-fast)]",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && (
                        <svg
                          className="size-3 text-primary-foreground"
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
                    <span className="truncate text-sm font-medium">
                      {lang.name}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="h-5 flex-shrink-0 px-1.5 text-xs tabular-nums"
                  >
                    {lang.count.toLocaleString()}
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
          {selected.map((code) => {
            const lang = languages.find((l) => l.code === code);
            if (!lang) return null;
            return (
              <Badge
                key={code}
                variant="secondary"
                className="h-6 gap-1.5 border border-primary/20 bg-primary/10 px-2 text-xs font-medium text-primary transition-colors duration-[var(--transition-fast)] hover:bg-primary/15"
              >
                <span className="max-w-[100px] truncate">{lang.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLanguage(code);
                  }}
                  className="transition-colors duration-[var(--transition-fast)] hover:text-destructive"
                  aria-label={`Remove ${lang.name}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
