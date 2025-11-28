"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Bot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateZoneAction,
  deleteZoneAction,
  updateZoneDataSourcesAction,
} from "@/app/actions/zones";
import { toast } from "sonner";
import type { Zone, UserRole, ZoneDataSources } from "@/types";
import { canManageZones } from "@/lib/auth/permissions";
import { TwitterSettingsTab } from "./twitter/twitter-settings-tab";
import { TikTokSettingsTab } from "./tiktok/tiktok-settings-tab";
import { MediaSettingsTab } from "./media/media-settings-tab";

interface ZoneSettingsFormProps {
  zone: Zone;
  userRole: UserRole;
}

export function ZoneSettingsForm({ zone, userRole }: ZoneSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [operationalContext, setOperationalContext] = useState(
    zone.operational_context || ""
  );
  const [isActive, setIsActive] = useState(zone.is_active);
  const [dataSources, setDataSources] = useState<ZoneDataSources>(
    zone.data_sources
  );
  const [attilaEnabled, setAttilaEnabled] = useState(
    (zone.settings as any)?.attila_enabled === true
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = canManageZones(userRole);

  // Auto-save when fields change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (name !== zone.name || operationalContext !== zone.operational_context) {
        handleSave();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [name, operationalContext]);

  const handleSave = async () => {
    if (!canEdit) return;
    if (!name.trim()) {
      toast.error("Zone name is required");
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateZoneAction(zone.id, {
        name: name.trim(),
        operational_context: operationalContext.trim() || null,
      });

      if (result.success) {
        toast.success("Settings saved");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    if (!canEdit) return;

    setIsActive(checked);

    try {
      const result = await updateZoneAction(zone.id, {
        is_active: checked,
      });

      if (result.success) {
        toast.success(checked ? "Zone activated" : "Zone deactivated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update status");
        setIsActive(!checked);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("An unexpected error occurred");
      setIsActive(!checked);
    }
  };

  const handleToggleDataSource = async (
    source: keyof ZoneDataSources,
    checked: boolean
  ) => {
    if (!canEdit) return;

    const newDataSources = {
      ...dataSources,
      [source]: checked,
    };

    setDataSources(newDataSources);

    try {
      const result = await updateZoneDataSourcesAction(zone.id, newDataSources);

      if (result.success) {
        toast.success(`${source} ${checked ? "enabled" : "disabled"}`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update data sources");
        setDataSources(dataSources);
      }
    } catch (error) {
      console.error("Error updating data sources:", error);
      toast.error("An unexpected error occurred");
      setDataSources(dataSources);
    }
  };

  const handleToggleAttila = async (checked: boolean) => {
    if (!canEdit) return;

    setAttilaEnabled(checked);

    const newSettings = {
      ...zone.settings,
      attila_enabled: checked,
    };

    try {
      const result = await updateZoneAction(zone.id, {
        settings: newSettings,
      });

      if (result.success) {
        toast.success(checked ? "Attila enabled" : "Attila disabled");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update settings");
        setAttilaEnabled(!checked);
      }
    } catch (error) {
      console.error("Error updating Attila settings:", error);
      toast.error("An unexpected error occurred");
      setAttilaEnabled(!checked);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;

    if (
      !confirm(
        "Are you sure you want to delete this zone? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteZoneAction(zone.id);

      if (result.success) {
        toast.success("Zone deleted");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete zone");
      }
    } catch (error) {
      console.error("Error deleting zone:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Tabs defaultValue="general" className="space-y-8">
      <TabsList className="w-full sm:w-auto transition-colors duration-[150ms]">
        <TabsTrigger
          value="general"
          className="text-body-sm font-medium transition-all duration-[150ms] data-[state=active]:shadow-sm"
        >
          General
        </TabsTrigger>
        {dataSources.twitter && (
          <TabsTrigger
            value="twitter"
            className="text-body-sm font-medium transition-all duration-[150ms] data-[state=active]:shadow-sm"
          >
            X
          </TabsTrigger>
        )}
        {dataSources.tiktok && (
          <TabsTrigger
            value="tiktok"
            className="text-body-sm font-medium transition-all duration-[150ms] data-[state=active]:shadow-sm"
          >
            TikTok
          </TabsTrigger>
        )}
        {dataSources.media && (
          <TabsTrigger
            value="media"
            className="text-body-sm font-medium transition-all duration-[150ms] data-[state=active]:shadow-sm"
          >
            Media
          </TabsTrigger>
        )}
      </TabsList>

      {/* General Tab */}
      <TabsContent value="general" className="space-y-6 animate-in fade-in-0 duration-300">
        <Card className="card-padding space-y-6 border-border">
          <div className="space-y-1.5">
            <h3 className="text-heading-3">Basic Information</h3>
            <p className="text-body-sm text-muted-foreground">
              Configure the name and context for this monitoring zone
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone-name" className="text-body-sm font-medium">
              Zone Name
            </Label>
            <Input
              id="zone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit || isSaving}
              placeholder="e.g., Presidential Campaign, Brand Monitoring"
              className="h-10 transition-all duration-[150ms] focus-visible:shadow-[var(--shadow-sm)] focus-visible:ring-2 focus-visible:ring-ring"
            />
            {isSaving && (
              <p className="text-caption text-muted-foreground flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Saving...
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="operational-context"
              className="text-body-sm font-medium"
            >
              Operational Context
            </Label>
            <Textarea
              id="operational-context"
              value={operationalContext}
              onChange={(e) => setOperationalContext(e.target.value)}
              disabled={!canEdit || isSaving}
              placeholder="Describe the monitoring context, objectives, and key focus areas for this zone..."
              className="min-h-[120px] resize-none transition-all duration-[150ms] focus-visible:shadow-[var(--shadow-sm)] focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-caption text-muted-foreground">
              Provide detailed context to help your team understand this zone's purpose and scope
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors duration-[150ms] hover:bg-muted/50">
            <div className="space-y-1">
              <Label htmlFor="zone-active" className="text-body-sm font-medium">
                Zone Status
              </Label>
              <p className="text-body-sm text-muted-foreground">
                {isActive ? "Active and monitoring" : "Inactive - monitoring paused"}
              </p>
            </div>
            <Switch
              id="zone-active"
              checked={isActive}
              onCheckedChange={handleToggleActive}
              disabled={!canEdit}
            />
          </div>
        </Card>

        <Card className="card-padding space-y-6 border-border">
          <div className="space-y-2">
            <h3 className="text-heading-3">Data Sources</h3>
            <p className="text-body text-muted-foreground">
              Enable data sources to activate monitoring for this zone. Enabled sources will appear as tabs in other pages.
            </p>
          </div>

          <div className="space-y-3">
            <div className="card-interactive flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4 transition-all duration-[200ms] hover:bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="source-twitter"
                    className="text-body-sm font-medium cursor-pointer"
                  >
                    X (Twitter)
                  </Label>
                  <p className="text-body-sm text-muted-foreground">
                    Monitor posts, mentions, and trends
                  </p>
                </div>
              </div>
              <Switch
                id="source-twitter"
                checked={dataSources.twitter}
                onCheckedChange={(checked) =>
                  handleToggleDataSource("twitter", checked)
                }
                disabled={!canEdit}
              />
            </div>

            <div className="card-interactive flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4 transition-all duration-[200ms] hover:bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="source-tiktok"
                    className="text-body-sm font-medium cursor-pointer"
                  >
                    TikTok
                  </Label>
                  <p className="text-body-sm text-muted-foreground">
                    Monitor videos, hashtags, and viral trends
                  </p>
                </div>
              </div>
              <Switch
                id="source-tiktok"
                checked={dataSources.tiktok}
                onCheckedChange={(checked) =>
                  handleToggleDataSource("tiktok", checked)
                }
                disabled={!canEdit}
              />
            </div>

            <div className="card-interactive flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4 transition-all duration-[200ms] hover:bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="source-media"
                    className="text-body-sm font-medium cursor-pointer"
                  >
                    Media
                  </Label>
                  <p className="text-body-sm text-muted-foreground">
                    Monitor news sites and traditional media
                  </p>
                </div>
              </div>
              <Switch
                id="source-media"
                checked={dataSources.media}
                onCheckedChange={(checked) =>
                  handleToggleDataSource("media", checked)
                }
                disabled={!canEdit}
              />
            </div>
          </div>
        </Card>

        {/* Attila Automation */}
        <Card className="card-padding space-y-6 border-border">
          <div className="space-y-2">
            <h3 className="text-heading-3 flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Attila Automation
            </h3>
            <p className="text-body text-muted-foreground">
              Enable AI-powered avatar response systems for this zone. This requires Manager privileges to access.
            </p>
          </div>

          <div className="space-y-3">
            <div className="card-interactive flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4 transition-all duration-[200ms] hover:bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="attila-toggle"
                    className="text-body-sm font-medium cursor-pointer"
                  >
                    Enable Attila
                  </Label>
                  <p className="text-body-sm text-muted-foreground">
                    Allow creation of Sniper, Sentinel, and Influence operations
                  </p>
                </div>
              </div>
              <Switch
                id="attila-toggle"
                checked={attilaEnabled}
                onCheckedChange={handleToggleAttila}
                disabled={!canEdit}
              />
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        {canEdit && (
          <Card className="card-padding border-destructive/50 bg-destructive/5">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-heading-3 text-destructive flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  Danger Zone
                </h3>
                <p className="text-body-sm text-muted-foreground">
                  Permanently delete this zone and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2 transition-all duration-[150ms] hover:shadow-lg"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete Zone"}
              </Button>
            </div>
          </Card>
        )}
      </TabsContent>

      {/* X/Twitter Tab */}
      {dataSources.twitter && (
        <TabsContent value="twitter" className="animate-in fade-in-0 duration-300">
          <TwitterSettingsTab zoneId={zone.id} />
        </TabsContent>
      )}

      {/* TikTok Tab */}
      {dataSources.tiktok && (
        <TabsContent value="tiktok" className="animate-in fade-in-0 duration-300">
          <TikTokSettingsTab zoneId={zone.id} />
        </TabsContent>
      )}

      {/* Media Tab */}
      {dataSources.media && (
        <TabsContent value="media" className="animate-in fade-in-0 duration-300">
          <MediaSettingsTab zoneId={zone.id} />
        </TabsContent>
      )}
    </Tabs>
  );
}

