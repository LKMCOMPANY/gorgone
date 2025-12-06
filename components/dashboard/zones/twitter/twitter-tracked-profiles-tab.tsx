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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TwitterProfileTagType)}>
        {/* Responsive TabsList: scrollable on mobile */}
        <div className="relative mb-6">
          <div className="overflow-x-auto overflow-y-hidden pb-3 -mb-3 scrollbar-hide">
            <TabsList className="inline-flex w-full min-w-full gap-2 bg-transparent p-0 justify-start lg:justify-center h-auto">
              {LABEL_TYPES.map((type) => (
                <TabsTrigger 
                  key={type.value} 
                  value={type.value}
                  className="flex flex-col items-center gap-2 px-2 py-3 rounded-xl border border-transparent data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-muted/50 transition-all duration-[var(--transition-fast)] min-w-[90px] flex-1"
                >
                  {type.value === 'attila' ? (
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
                    <span className="text-xs font-medium whitespace-nowrap">{type.label}</span>
                  )}
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 h-4 min-w-[20px] justify-center transition-all duration-[var(--transition-fast)]", type.color)}>
                    {profiles[type.value].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* Scroll hint gradient on mobile */}
          <div className="absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-background via-background/50 to-transparent pointer-events-none lg:hidden" />
        </div>

        {LABEL_TYPES.map((type) => (
          <TabsContent key={type.value} value={type.value} className="mt-6 space-y-6">
            <Card className="p-6">
              {/* Add Handles Section */}
              <div className="space-y-4 mb-6">
                {/* Tag Input */}
                <div className="space-y-2">
                  <Label htmlFor={`input-${type.value}`} className="text-sm font-medium">
                    Add Profile
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id={`input-${type.value}`}
                      type="text"
                      placeholder="@elonmusk"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      disabled={isSaving}
                      className="flex-1 h-9 text-sm transition-shadow duration-[var(--transition-fast)] focus-visible:shadow-xs"
                    />
                    <Button
                      onClick={() => {
                        if (currentInput.trim()) {
                          addProfile(currentInput.trim(), type.value);
                          setCurrentInput("");
                        }
                      }}
                      disabled={!currentInput.trim() || isSaving}
                      className="gap-2 h-9 sm:w-auto w-full"
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press Enter or comma to add multiple handles
                  </p>
                </div>

                {/* Bulk Paste */}
                <div className="space-y-2">
                  <Label htmlFor={`bulk-${type.value}`} className="text-sm font-medium">
                    Bulk Import
                  </Label>
                  <Textarea
                    id={`bulk-${type.value}`}
                    placeholder="Paste multiple usernames (one per line or comma-separated)&#10;Example:&#10;elonmusk, BillGates&#10;jeffbezos"
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    disabled={isSaving}
                    className="min-h-[100px] font-mono text-sm resize-none transition-shadow duration-[var(--transition-fast)] focus-visible:shadow-xs"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Supports comma, space, or newline separated handles
                    </p>
                    <Button
                      onClick={handleBulkPaste}
                      disabled={!bulkInput.trim() || isSaving}
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full sm:w-auto h-9"
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="size-4" />
                          <span>Import {bulkInput.split(/[\n,\s]+/).filter(Boolean).length} handle(s)</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tracked Profiles List */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Tracked Profiles ({profiles[type.value].length})
                </Label>

                {profiles[type.value].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No profiles tracked in this category yet
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profiles[type.value].map((username) => (
                      <Badge
                        key={username}
                        variant="outline"
                        className={cn("border pl-3 pr-1.5 py-1.5 gap-2 text-sm group hover:opacity-80 transition-all duration-[var(--transition-fast)]", type.color)}
                      >
                        <span className="font-medium">@{username}</span>
                        <button
                          onClick={() => removeProfile(username, type.value)}
                          disabled={isSaving}
                          className="rounded-full p-0.5 hover:bg-foreground/10 transition-colors duration-[var(--transition-fast)]"
                          aria-label={`Remove @${username}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

