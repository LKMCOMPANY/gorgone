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
        <h3 className="text-heading-3">Tracked Profiles</h3>
        <p className="text-body-sm text-muted-foreground">
          Tag Twitter profiles to categorize them in your monitoring feed and calculate Share of Voice metrics
        </p>
      </div>

      {/* Label Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TwitterProfileTagType)}>
        {/* Responsive TabsList: scrollable on mobile */}
        <div className="relative">
          <div className="overflow-x-auto overflow-y-hidden pb-2 -mb-2 scrollbar-hide">
            <TabsList className="inline-flex w-auto h-auto gap-1 bg-transparent p-0">
              {LABEL_TYPES.map((type) => (
                <TabsTrigger 
                  key={type.value} 
                  value={type.value}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-[150ms]"
                >
                  <span className="text-body-sm font-medium whitespace-nowrap">{type.label}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${type.color} transition-all duration-[150ms]`}>
                    {profiles[type.value].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* Scroll hint on mobile */}
          <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
        </div>

        {LABEL_TYPES.map((type) => (
          <TabsContent key={type.value} value={type.value} className="mt-6 space-y-6">
            <Card className="card-padding">
              {/* Label Description */}
              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${type.color} border`}>
                    {type.label}
                  </Badge>
                  <span className="text-caption text-muted-foreground">
                    {profiles[type.value].length} profile(s) tracked
                  </span>
                </div>
                <p className="text-body-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>

              {/* Add Handles Section */}
              <div className="space-y-4 mb-6">
                {/* Tag Input */}
                <div className="space-y-2">
                  <Label htmlFor={`input-${type.value}`} className="text-body-sm font-medium">
                    Add Profile
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`input-${type.value}`}
                      type="text"
                      placeholder="@elonmusk"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      disabled={isSaving}
                      className="flex-1 text-body-sm transition-all duration-[150ms]"
                    />
                    <Button
                      onClick={() => {
                        if (currentInput.trim()) {
                          addProfile(currentInput.trim(), type.value);
                          setCurrentInput("");
                        }
                      }}
                      disabled={!currentInput.trim() || isSaving}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    Press Enter or comma to add multiple handles
                  </p>
                </div>

                {/* Bulk Paste */}
                <div className="space-y-2">
                  <Label htmlFor={`bulk-${type.value}`} className="text-body-sm font-medium">
                    Bulk Import
                  </Label>
                  <Textarea
                    id={`bulk-${type.value}`}
                    placeholder="Paste multiple usernames (one per line or comma-separated)&#10;Example:&#10;elonmusk, BillGates&#10;jeffbezos"
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    disabled={isSaving}
                    className="min-h-[100px] font-mono text-body-sm resize-none transition-all duration-[150ms]"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-caption text-muted-foreground">
                      Supports comma, space, or newline separated handles
                    </p>
                    <Button
                      onClick={handleBulkPaste}
                      disabled={!bulkInput.trim() || isSaving}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Import {bulkInput.split(/[\n,\s]+/).filter(Boolean).length} handle(s)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tracked Profiles List */}
              <div className="space-y-3">
                <Label className="text-body-sm font-medium">
                  Tracked Profiles ({profiles[type.value].length})
                </Label>

                {profiles[type.value].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                    <p className="text-body-sm text-muted-foreground">
                      No profiles tracked yet. Add handles above to start monitoring.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profiles[type.value].map((username) => (
                      <Badge
                        key={username}
                        variant="outline"
                        className={`${type.color} border pl-2.5 pr-1 py-1 gap-2 text-body-sm group hover:opacity-80 transition-opacity`}
                      >
                        <span>@{username}</span>
                        <button
                          onClick={() => removeProfile(username, type.value)}
                          disabled={isSaving}
                          className="rounded-full p-0.5 hover:bg-background/50 transition-colors"
                          aria-label={`Remove @${username}`}
                        >
                          <X className="h-3 w-3" />
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

