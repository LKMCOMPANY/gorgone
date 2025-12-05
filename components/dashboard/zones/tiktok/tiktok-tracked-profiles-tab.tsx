"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TikTokTrackedProfilesSkeleton } from "./tiktok-tracked-profiles-skeleton";

interface TikTokTrackedProfilesTabProps {
  zoneId: string;
}

type TikTokProfileTagType = "attila" | "adversary" | "surveillance" | "target" | "ally" | "asset" | "local_team";

// Label type configuration with colors (same as Twitter)
const LABEL_TYPES: Array<{
  value: TikTokProfileTagType;
  label: string;
  color: string;
  description: string;
}> = [
  { 
    value: "attila", 
    label: "Attila", 
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    description: "High-priority targets requiring immediate attention"
  },
  { 
    value: "adversary", 
    label: "Adversary", 
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    description: "Opposition profiles or hostile actors"
  },
  { 
    value: "surveillance", 
    label: "Surveillance", 
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    description: "Profiles under active monitoring"
  },
  { 
    value: "target", 
    label: "Target", 
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    description: "Key profiles of strategic interest"
  },
  { 
    value: "ally", 
    label: "Ally", 
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    description: "Friendly or supportive profiles"
  },
  { 
    value: "asset", 
    label: "Asset", 
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    description: "Valuable resources or information sources"
  },
  { 
    value: "local_team", 
    label: "Local Team", 
    color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
    description: "Internal team members or local contacts"
  },
];

export function TikTokTrackedProfilesTab({ zoneId }: TikTokTrackedProfilesTabProps) {
  const [activeTab, setActiveTab] = useState<TikTokProfileTagType>("attila");
  const [profiles, setProfiles] = useState<Record<TikTokProfileTagType, string[]>>({
    attila: [],
    adversary: [],
    surveillance: [],
    target: [],
    ally: [],
    asset: [],
    local_team: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentInput, setCurrentInput] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, [zoneId]);

  async function loadProfiles() {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/tiktok/profiles/tags?zone_id=${zoneId}`);
      const data = await response.json();
      
      if (data.success) {
        // Group profiles by tag type
        const grouped: Record<TikTokProfileTagType, string[]> = {
          attila: [],
          adversary: [],
          surveillance: [],
          target: [],
          ally: [],
          asset: [],
          local_team: [],
        };

        data.tags?.forEach((tag: any) => {
          if (tag.tag_type && tag.username) {
            grouped[tag.tag_type as TikTokProfileTagType].push(tag.username);
          }
        });

        setProfiles(grouped);
      }
    } catch (error) {
      console.error("Failed to load tracked profiles:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addProfile(username: string, tagType: TikTokProfileTagType) {
    const cleanUsername = username.trim().replace(/^@/, "");
    
    if (!cleanUsername) {
      toast.error("Username cannot be empty");
      return;
    }

    if (profiles[tagType].includes(cleanUsername)) {
      toast.error("This profile is already tracked");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/tiktok/profiles/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: zoneId,
          username: cleanUsername,
          tag_type: tagType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to add profile");
      }

      toast.success("Profile added successfully");
      setCurrentInput("");
      loadProfiles();
    } catch (error) {
      console.error("Failed to add profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add profile");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeProfile(username: string, tagType: TikTokProfileTagType) {
    setIsSaving(true);

    try {
      const response = await fetch("/api/tiktok/profiles/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: zoneId,
          username,
          tag_type: tagType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to remove profile");
      }

      toast.success("Profile removed");
      loadProfiles();
    } catch (error) {
      console.error("Failed to remove profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove profile");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkUpload() {
    const usernames = bulkInput
      .split("\n")
      .map((line) => line.trim().replace(/^@/, ""))
      .filter(Boolean);

    if (usernames.length === 0) {
      toast.error("No usernames to upload");
      return;
    }

    setIsSaving(true);

    try {
      const promises = usernames.map((username) =>
        fetch("/api/tiktok/profiles/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zone_id: zoneId,
            username,
            tag_type: activeTab,
          }),
        })
      );

      await Promise.all(promises);

      toast.success(`${usernames.length} profile(s) added successfully`);
      setBulkInput("");
      loadProfiles();
    } catch (error) {
      console.error("Failed to bulk upload:", error);
      toast.error("Some profiles failed to upload");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return <TikTokTrackedProfilesSkeleton />;
  }

  const currentLabelType = LABEL_TYPES.find((lt) => lt.value === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">Tracked Profiles</h3>
        <p className="text-sm text-muted-foreground">
          Tag and categorize TikTok profiles for Share of Voice analysis and targeted monitoring
        </p>
      </div>

      {/* Label Tabs */}
      <Card className="card-padding">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TikTokProfileTagType)}>
          <TabsList className="w-full grid grid-cols-7 h-auto">
            {LABEL_TYPES.map((labelType) => (
              <TabsTrigger
                key={labelType.value}
                value={labelType.value}
                className="text-xs sm:text-sm data-[state=active]:shadow-sm"
              >
                <span className="hidden sm:inline">{labelType.label}</span>
                <span className="sm:hidden">{labelType.label.substring(0, 3)}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {LABEL_TYPES.map((labelType) => (
            <TabsContent key={labelType.value} value={labelType.value} className="space-y-6 mt-6">
              {/* Label Description */}
              <div className={`rounded-lg border p-4 ${labelType.color}`}>
                <h4 className="text-sm font-semibold mb-1">{labelType.label}</h4>
                <p className="text-xs opacity-80">
                  {labelType.description}
                </p>
              </div>

              {/* Add Profile Form */}
              <div className="space-y-3">
                <Label htmlFor="add-profile" className="text-sm font-medium">
                  Add Profile
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="add-profile"
                    placeholder="@username (e.g., @patrickmuyaya01)"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isSaving) {
                        e.preventDefault();
                        addProfile(currentInput, activeTab);
                      }
                    }}
                    disabled={isSaving}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => addProfile(currentInput, activeTab)}
                    disabled={!currentInput.trim() || isSaving}
                    size="sm"
                  >
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
              </div>

              {/* Current Profiles */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Tracked Profiles ({profiles[activeTab].length})
                </Label>
                {profiles[activeTab].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No profiles tracked in this category yet
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profiles[activeTab].map((username) => (
                      <Badge
                        key={username}
                        variant="outline"
                        className="gap-2 pl-3 pr-2 py-1.5"
                      >
                        <span className="text-sm">@{username}</span>
                        <button
                          onClick={() => removeProfile(username, activeTab)}
                          disabled={isSaving}
                          className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Bulk Upload */}
              <div className="space-y-3">
                <Label htmlFor="bulk-upload" className="text-sm font-medium">
                  Bulk Upload
                </Label>
                <Textarea
                  id="bulk-upload"
                  placeholder="Enter multiple usernames (one per line)&#10;@patrickmuyaya01&#10;@username2&#10;@username3"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  disabled={isSaving}
                  rows={5}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleBulkUpload}
                  disabled={!bulkInput.trim() || isSaving}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Upload Profiles
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}

