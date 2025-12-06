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
import { TwitterTrackedProfilesSkeleton } from "./twitter-tracked-profiles-skeleton";
import type { TwitterProfileZoneTag, TwitterProfileTagType } from "@/types";

interface TwitterTrackedProfilesTabProps {
  zoneId: string;
}

// Label type configuration with colors
const LABEL_TYPES: Array<{
  value: TwitterProfileTagType;
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

export function TwitterTrackedProfilesTab({ zoneId }: TwitterTrackedProfilesTabProps) {
  const [activeTab, setActiveTab] = useState<TwitterProfileTagType>("attila");
  const [profiles, setProfiles] = useState<Record<TwitterProfileTagType, string[]>>({
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
      
      const response = await fetch(`/api/twitter/profiles/tags?zone_id=${zoneId}`);
      const data = await response.json();
      
      if (data.success) {
        // Group profiles by tag type
        const grouped: Record<TwitterProfileTagType, string[]> = {
          attila: [],
          adversary: [],
          surveillance: [],
          target: [],
          ally: [],
          asset: [],
          local_team: [],
        };

        data.tags?.forEach((tag: any) => {
          if (tag.username && grouped[tag.tag_type as TwitterProfileTagType]) {
            grouped[tag.tag_type as TwitterProfileTagType].push(tag.username);
          }
        });

        setProfiles(grouped);
      }
    } catch (error) {
      console.error("Failed to load tracked profiles:", error);
      toast.error("Failed to load tracked profiles");
    } finally {
      setLoading(false);
    }
  }

  async function addProfile(username: string, tagType: TwitterProfileTagType) {
    if (!username || username.trim() === "") return;

    const cleanUsername = username.replace("@", "").trim().toLowerCase();
    
    // Check if already exists
    if (profiles[tagType].includes(cleanUsername)) {
      toast.error(`@${cleanUsername} is already tracked as ${tagType}`);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/twitter/profiles/tags", {
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

      // Update local state
      setProfiles((prev) => ({
        ...prev,
        [tagType]: [...prev[tagType], cleanUsername],
      }));

      toast.success(`@${cleanUsername} added to ${tagType}`);
    } catch (error) {
      console.error("Failed to add profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add profile");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeProfile(username: string, tagType: TwitterProfileTagType) {
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/twitter/profiles/tags?zone_id=${zoneId}&username=${username}&tag_type=${tagType}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to remove profile");
      }

      // Update local state
      setProfiles((prev) => ({
        ...prev,
        [tagType]: prev[tagType].filter((u) => u !== username),
      }));

      toast.success(`@${username} removed from ${tagType}`);
    } catch (error) {
      console.error("Failed to remove profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove profile");
    } finally {
      setIsSaving(false);
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = currentInput.trim();
      if (value) {
        addProfile(value, activeTab);
        setCurrentInput("");
      }
    }
  }

  async function handleBulkPaste() {
    if (!bulkInput.trim()) {
      toast.error("Please enter at least one username");
      return;
    }

    // Parse usernames (comma, space, or newline separated)
    const usernames = bulkInput
      .split(/[\n,\s]+/)
      .map((u) => u.replace("@", "").trim().toLowerCase())
      .filter((u) => u.length > 0);

    if (usernames.length === 0) {
      toast.error("No valid usernames found");
      return;
    }

    setIsSaving(true);

    try {
      // Add profiles one by one (could be optimized with bulk API later)
      let added = 0;
      let skipped = 0;
      let errors = 0;

      for (const username of usernames) {
        if (profiles[activeTab].includes(username)) {
          skipped++;
          continue;
        }

        try {
          const response = await fetch("/api/twitter/profiles/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              zone_id: zoneId,
              username,
              tag_type: activeTab,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            setProfiles((prev) => ({
              ...prev,
              [activeTab]: [...prev[activeTab], username],
            }));
            added++;
          } else {
            errors++;
          }
        } catch {
          errors++;
        }
      }

      setBulkInput("");
      
      const messages: string[] = [];
      if (added > 0) messages.push(`${added} profile(s) added`);
      if (skipped > 0) messages.push(`${skipped} already tracked`);
      if (errors > 0) messages.push(`${errors} failed`);
      
      toast.success(messages.join(", "));
    } catch (error) {
      console.error("Bulk import failed:", error);
      toast.error("Bulk import failed");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return <TwitterTrackedProfilesSkeleton />;
  }

  const currentLabelConfig = LABEL_TYPES.find((t) => t.value === activeTab)!;

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">Tracked Profiles</h3>
        <p className="text-sm text-muted-foreground">
          Tag Twitter profiles to categorize them in your monitoring feed and calculate Share of Voice metrics
        </p>
      </div>

      {/* Label Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TwitterProfileTagType)} className="space-y-6">
        {/* Responsive TabsList: scrollable on mobile */}
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

        {/* Content Area - Single instance updated by state */}
        <Card className="card-padding min-h-[400px]">
          <TabsContent value={activeTab} className="mt-0 space-y-6 animate-in fade-in-50 duration-300">
            {/* Add Handles Section */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="profile-input" className="text-sm font-medium">
                    Add {currentLabelConfig.label} Profile
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="profile-input"
                      placeholder="@username"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      disabled={isSaving}
                      className="h-9"
                    />
                    <Button
                      onClick={() => {
                        if (currentInput.trim()) {
                          addProfile(currentInput.trim(), activeTab);
                          setCurrentInput("");
                        }
                      }}
                      disabled={!currentInput.trim() || isSaving}
                      className="h-9 w-20 shrink-0"
                    >
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                </div>
                
                {/* Bulk Import Toggle/Area could go here or below */}
              </div>

              {/* Bulk Import Collapsible or Area */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => {
                  // Optional: Toggle bulk mode visibility
                }}>
                  Or bulk import multiple handles
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Paste usernames (comma or newline separated)..."
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    disabled={isSaving}
                    className="min-h-[60px] h-[60px] resize-none text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={handleBulkPaste}
                    disabled={!bulkInput.trim() || isSaving}
                    className="h-[60px] w-20 shrink-0 flex-col gap-1"
                  >
                    <Upload className="size-4" />
                    <span className="text-[10px]">Import</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/50 my-6" />

            {/* Tracked Profiles List */}
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
                        currentLabelConfig.color.replace('bg-', 'border-l-4 border-l-') // Use border-left color for distinction
                      )}
                    >
                      <span className="font-medium">@{username}</span>
                      <button
                        onClick={() => removeProfile(username, activeTab)}
                        disabled={isSaving}
                        className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label={`Remove @${username}`}
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

