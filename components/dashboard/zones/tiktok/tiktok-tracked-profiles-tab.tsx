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
}> = [
  { 
    value: "attila", 
    label: "Attila", 
    color: "bg-tactical-red/10 text-tactical-red border-tactical-red/20",
  },
  { 
    value: "adversary", 
    label: "Adversary", 
    color: "bg-tactical-amber/10 text-tactical-amber border-tactical-amber/20",
  },
  { 
    value: "surveillance", 
    label: "Surveillance", 
    color: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  },
  { 
    value: "target", 
    label: "Target", 
    color: "bg-tactical-blue/10 text-tactical-blue border-tactical-blue/20",
  },
  { 
    value: "ally", 
    label: "Ally", 
    color: "bg-tactical-green/10 text-tactical-green border-tactical-green/20",
  },
  { 
    value: "asset", 
    label: "Asset", 
    color: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  },
  { 
    value: "local_team", 
    label: "Local Team", 
    color: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  },
];

import Image from "next/image";

import { cn } from "@/lib/utils";

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
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TikTokProfileTagType)}>
          <TabsList className="w-full grid grid-cols-7 h-auto bg-transparent p-0 gap-2">
            {LABEL_TYPES.map((labelType) => (
              <TabsTrigger
                key={labelType.value}
                value={labelType.value}
                className="flex flex-col items-center gap-2 py-3 h-auto rounded-lg border border-transparent data-[state=active]:border-border data-[state=active]:shadow-sm hover:bg-muted/50 transition-all duration-[var(--transition-fast)]"
              >
                {labelType.value === 'attila' ? (
                  <div className="relative size-4">
                    <Image
                      src="/AttilaBlack.svg"
                      alt="Attila"
                      fill
                      className="object-contain dark:hidden"
                    />
                    <Image
                      src="/AttilaWhite.svg"
                      alt="Attila"
                      fill
                      className="object-contain hidden dark:block"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-medium truncate w-full text-center">{labelType.label}</span>
                )}
                <Badge variant="outline" className={cn("text-xs px-2 py-0.5 h-5 min-w-[24px] justify-center", labelType.color)}>
                  {profiles[labelType.value].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {LABEL_TYPES.map((labelType) => (
            <TabsContent key={labelType.value} value={labelType.value} className="space-y-6 mt-6">
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
                    className="flex-1 h-9 shadow-xs"
                  />
                  <Button
                    onClick={() => addProfile(currentInput, activeTab)}
                    disabled={!currentInput.trim() || isSaving}
                    size="sm"
                    className="h-9 px-4"
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

