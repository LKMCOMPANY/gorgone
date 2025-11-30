"use client";

import { AttilaOperationConfig, TwitterProfileTagType } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SniperSettingsProps {
  config: AttilaOperationConfig;
  updateConfig: (updates: Partial<AttilaOperationConfig>) => void;
}

const PROFILE_TYPES: TwitterProfileTagType[] = [
  "target", "adversary", "ally", "surveillance", "local_team", "attila"
];

const POST_TYPES = ["original", "reply", "quote", "retweet"] as const;

export function SniperSettings({ config, updateConfig }: SniperSettingsProps) {
  
  const toggleProfileType = (type: TwitterProfileTagType) => {
    const current = config.profile_types || [];
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateConfig({ profile_types: next });
  };

  const togglePostType = (type: typeof POST_TYPES[number]) => {
    const current = config.post_types || [];
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateConfig({ post_types: next });
  };

  return (
    <div className="space-y-6">
      {/* Engagement Filter */}
      <div className="space-y-3">
        <Label htmlFor="engagement">Minimum Engagement Score</Label>
        <Input
          id="engagement"
          type="number"
          min="0"
          value={config.engagement_threshold || 0}
          onChange={(e) => updateConfig({ engagement_threshold: parseInt(e.target.value) || 0 })}
          className="bg-background"
        />
        <p className="text-xs text-muted-foreground">
          Only respond to posts with total engagement (likes + RTs) above this value.
        </p>
      </div>

      {/* Post Types */}
      <div className="space-y-3">
        <Label>Target Post Types</Label>
        <div className="grid grid-cols-2 gap-2">
          {POST_TYPES.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox 
                id={`post-type-${type}`}
                checked={(config.post_types || []).includes(type)}
                onCheckedChange={() => togglePostType(type)}
              />
              <Label htmlFor={`post-type-${type}`} className="capitalize font-normal cursor-pointer">
                {type}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Types */}
      <div className="space-y-3">
        <Label>Target Profile Categories</Label>
        <div className="flex flex-wrap gap-2">
          {PROFILE_TYPES.map((type) => {
            const isSelected = (config.profile_types || []).includes(type);
            return (
              <Badge
                key={type}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer capitalize hover:bg-primary/80"
                onClick={() => toggleProfileType(type)}
              >
                {type}
              </Badge>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Select categories of users to target.
        </p>
      </div>
    </div>
  );
}

