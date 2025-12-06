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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TikTokProfileTagType)} className="space-y-6">
        {/* Responsive TabsList */}
        <div className="relative">
          <div className="overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto w-full min-w-max justify-start gap-3 bg-transparent p-0 sm:w-auto sm:justify-center">
              {LABEL_TYPES.map((type) => (
                <TabsTrigger
                  key={type.value}
                  value={type.value}
                  className={cn(
                    "h-auto group flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-background px-5 py-4 transition-all duration-200 data-[state=active]:border-primary/20 data-[state=active]:bg-muted/30 data-[state=active]:shadow-sm hover:border-border hover:bg-muted/50",
                    "min-w-[110px]"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {type.value === 'attila' && (
                      <div className="relative size-3.5">
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
                    )}
                    <span className="text-xs font-medium">{type.label}</span>
                  </div>
                  <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] h-5 min-w-[20px] justify-center", type.color)}>
                    {profiles[type.value].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <Card className="card-padding min-h-[400px]">
          <TabsContent value={activeTab} className="mt-0 space-y-6 animate-in fade-in-50 duration-300">
            {/* Add Profile Form */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="add-profile" className="text-sm font-medium">
                    Add {currentLabelType?.label} Profile
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="add-profile"
                      placeholder="@username"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isSaving) {
                          e.preventDefault();
                          addProfile(currentInput, activeTab);
                        }
                      }}
                      disabled={isSaving}
                      className="h-9"
                    />
                    <Button
                      onClick={() => addProfile(currentInput, activeTab)}
                      disabled={!currentInput.trim() || isSaving}
                      className="h-9 w-20 shrink-0"
                    >
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bulk Import */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Or bulk import multiple handles
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="bulk-upload"
                    placeholder="Paste usernames (one per line)..."
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    disabled={isSaving}
                    className="min-h-[60px] h-[60px] resize-none text-sm font-mono"
                  />
                  <Button
                    onClick={handleBulkUpload}
                    disabled={!bulkInput.trim() || isSaving}
                    variant="outline"
                    className="h-[60px] w-20 shrink-0 flex-col gap-1"
                  >
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Upload className="size-4" />
                        <span className="text-[10px]">Import</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/50 my-6" />

            {/* Current Profiles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Tracked Profiles <span className="text-muted-foreground ml-1">({profiles[activeTab].length})</span>
                </Label>
              </div>

              {profiles[activeTab].length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 py-12">
                  <div className="rounded-full bg-muted/30 p-3 mb-3">
                    <svg className="size-6 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium">No profiles tracked</p>
                  <p className="text-xs text-muted-foreground mt-1">Add handles to start monitoring this category</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profiles[activeTab].map((username) => (
                    <Badge
                      key={username}
                      variant="outline"
                      className={cn(
                        "pl-3 pr-1.5 py-1.5 gap-2 text-sm transition-all hover:bg-muted/50",
                        currentLabelType?.color.replace('bg-', 'border-l-4 border-l-')
                      )}
                    >
                      <span className="font-medium">@{username}</span>
                      <button
                        onClick={() => removeProfile(username, activeTab)}
                        disabled={isSaving}
                        className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}

