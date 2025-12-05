"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TwitterQueryBuilderConfig } from "@/types";

interface TwitterQueryBuilderProps {
  config: TwitterQueryBuilderConfig;
  onChange: (config: TwitterQueryBuilderConfig) => void;
}

export function TwitterQueryBuilder({ config, onChange }: TwitterQueryBuilderProps) {
  function updateConfig(updates: Partial<TwitterQueryBuilderConfig>) {
    onChange({ ...config, ...updates });
  }

  function addTag(field: keyof TwitterQueryBuilderConfig, value: string) {
    if (!value.trim()) return;
    
    const current = config[field] as string[];
    if (current.includes(value.trim())) return;
    
    updateConfig({
      [field]: [...current, value.trim()],
    });
  }

  function removeTag(field: keyof TwitterQueryBuilderConfig, value: string) {
    const current = config[field] as string[];
    updateConfig({
      [field]: current.filter((v) => v !== value),
    });
  }

  function TagInput({
    label,
    field,
    placeholder,
    description,
  }: {
    label: string;
    field: keyof TwitterQueryBuilderConfig;
    placeholder: string;
    description?: string;
  }) {
    const values = config[field] as string[];
    const [inputValue, setInputValue] = React.useState("");

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(field, inputValue);
        setInputValue("");
      }
    }

    return (
      <div className="space-y-2">
        <Label className="text-sm">{label}</Label>
        <div className="space-y-2">
          <Input
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-10 text-sm transition-all duration-[var(--transition-fast)]"
          />
          {values.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {values.map((value) => (
                <Badge
                  key={value}
                  variant="secondary"
                  className="gap-1 pr-1 transition-all duration-[var(--transition-fast)] hover:bg-secondary/80"
                >
                  <span className="text-sm">{value}</span>
                  <button
                    onClick={() => removeTag(field, value)}
                    className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* USER OPERATORS */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
        <h4 className="text-sm font-semibold">User Operators</h4>
        
        <TagInput
          label="From Users"
          field="from_users"
          placeholder="@elonmusk"
          description="Tweets posted by these users"
        />
        
        <TagInput
          label="To Users"
          field="to_users"
          placeholder="@username"
          description="Tweets replying to these users"
        />
        
        <TagInput
          label="Mentions"
          field="mentions"
          placeholder="@elonmusk"
          description="Tweets mentioning these users"
        />
      </div>

      {/* CONTENT OPERATORS */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
        <h4 className="text-sm font-semibold">Content Operators</h4>
        
        <TagInput
          label="Keywords"
          field="keywords"
          placeholder="Elon Musk"
          description="Words or phrases to match"
        />
        
        <TagInput
          label="Hashtags"
          field="hashtags"
          placeholder="#elonmusk"
          description="Hashtags to monitor (without #)"
        />
        
        <TagInput
          label="Exclude Keywords"
          field="exclude_keywords"
          placeholder="spam"
          description="Words to exclude from results"
        />
        
        <TagInput
          label="Exclude Users"
          field="exclude_users"
          placeholder="@bot_account"
          description="Users to exclude from results"
        />
      </div>

      {/* ENGAGEMENT FILTERS */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Engagement Filters</h4>
          <Badge variant="secondary" className="text-xs">
            AND logic
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          All engagement thresholds must be met (combined with AND)
        </p>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="min-retweets" className="text-sm">
              Min Retweets
            </Label>
            <Input
              id="min-retweets"
              type="number"
              min="0"
              placeholder="0"
              value={config.min_retweets ?? ""}
              onChange={(e) =>
                updateConfig({
                  min_retweets: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="h-10 text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="min-likes" className="text-sm">
              Min Likes
            </Label>
            <Input
              id="min-likes"
              type="number"
              min="0"
              placeholder="0"
              value={config.min_likes ?? ""}
              onChange={(e) =>
                updateConfig({
                  min_likes: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="h-10 text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="min-replies" className="text-sm">
              Min Replies
            </Label>
            <Input
              id="min-replies"
              type="number"
              min="0"
              placeholder="0"
              value={config.min_replies ?? ""}
              onChange={(e) =>
                updateConfig({
                  min_replies: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="h-10 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ADDITIONAL FILTERS */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Additional Filters</h4>
          <Badge variant="secondary" className="text-xs">
            AND logic
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors duration-[var(--transition-fast)] hover:bg-muted/30">
            <Label htmlFor="verified-only" className="text-sm cursor-pointer">
              Verified accounts only
            </Label>
            <Switch
              id="verified-only"
              checked={config.verified_only}
              onCheckedChange={(checked) => updateConfig({ verified_only: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors duration-[var(--transition-fast)] hover:bg-muted/30">
            <Label htmlFor="has-media" className="text-sm cursor-pointer">
              Has media (photos/videos)
            </Label>
            <Switch
              id="has-media"
              checked={config.has_media}
              onCheckedChange={(checked) => updateConfig({ has_media: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors duration-[var(--transition-fast)] hover:bg-muted/30">
            <Label htmlFor="has-links" className="text-sm cursor-pointer">
              Has links
            </Label>
            <Switch
              id="has-links"
              checked={config.has_links}
              onCheckedChange={(checked) => updateConfig({ has_links: checked })}
            />
          </div>
        </div>

        {/* Language Select */}
        <div className="space-y-2 pt-2">
          <Label htmlFor="language" className="text-sm">
            Language
          </Label>
          <Select
            value={config.lang || "any"}
            onValueChange={(value) => updateConfig({ lang: value === "any" ? undefined : value })}
          >
            <SelectTrigger id="language" className="h-10">
              <SelectValue placeholder="Any language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any language</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// Add React import for useState
import React from "react";

