"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, MoreVertical, Pencil, Pause, Play, Trash2, Clock, Activity, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TwitterRule } from "@/types";

// Simple date formatting helper
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

interface TwitterRulesListProps {
  rules: TwitterRule[];
  onEdit: (rule: TwitterRule) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export function TwitterRulesList({
  rules,
  onEdit,
  onCreateNew,
  onRefresh,
}: TwitterRulesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [backfillDialogOpen, setBackfillDialogOpen] = useState(false);
  const [backfillingRule, setBackfillingRule] = useState<TwitterRule | null>(null);
  const [backfillCount, setBackfillCount] = useState("100");
  const [backfillLoading, setBackfillLoading] = useState(false);

  async function handlePause(rule: TwitterRule) {
    setPausingId(rule.id);
    try {
      const response = await fetch(`/api/twitter/rules/${rule.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update rule");
      }
      
      toast.success(rule.is_active ? "Rule paused" : "Rule resumed");
      onRefresh();
    } catch (error) {
      console.error("Failed to pause rule:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update rule");
    } finally {
      setPausingId(null);
    }
  }

  async function handleDelete(rule: TwitterRule) {
    if (
      !confirm(
        `Are you sure you want to delete the rule "${rule.tag || 'Untitled'}"? This will also remove the webhook from TwitterAPI.io. This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(rule.id);
    try {
      const response = await fetch(`/api/twitter/rules/${rule.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete rule");
      }
      
      toast.success("Rule deleted successfully");
      onRefresh();
    } catch (error) {
      console.error("Failed to delete rule:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete rule");
    } finally {
      setDeletingId(null);
    }
  }

  function handleOpenBackfillDialog(rule: TwitterRule) {
    setBackfillingRule(rule);
    setBackfillCount("100");
    setBackfillDialogOpen(true);
  }

  async function handleBackfill() {
    if (!backfillingRule) return;

    const count = parseInt(backfillCount);
    if (isNaN(count) || count < 1 || count > 500) {
      toast.error("Please enter a number between 1 and 500");
      return;
    }

    setBackfillLoading(true);
    try {
      // Get the zone_id from the first rule (they all belong to the same zone)
      const zoneId = backfillingRule.zone_id;
      
      const response = await fetch(
        `/api/twitter/backfill?zoneId=${zoneId}&count=${count}&queryType=Latest`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to backfill tweets");
      }

      toast.success(
        `Successfully fetched ${data.stats.created} new tweets (${data.stats.duplicates} duplicates skipped)`
      );
      
      setBackfillDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error("Failed to backfill:", error);
      toast.error(error instanceof Error ? error.message : "Failed to backfill tweets");
    } finally {
      setBackfillLoading(false);
    }
  }

  return (
    <Card className="card-padding">
      <div className="space-y-5">
        {/* Header with count and action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {rules.length} rule{rules.length !== 1 ? 's' : ''} 
            {rules.length > 0 && (
              <span className="ml-1">
                ({rules.filter(r => r.is_active).length} active, {rules.filter(r => !r.is_active).length} paused)
              </span>
            )}
          </p>
          <Button onClick={onCreateNew} size="sm" className="gap-2 w-full sm:w-auto">
            <Plus className="size-4" />
            <span>New Rule</span>
          </Button>
        </div>

        {/* Rules List */}
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="card-interactive p-4 space-y-3"
            >
              {/* Header: Status + Name + Actions */}
              <div className="flex items-start gap-3">
                <Badge 
                  variant={rule.is_active ? "default" : "secondary"}
                  className="flex-shrink-0"
                >
                  {rule.is_active ? "Active" : "Paused"}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {rule.tag || "Monitoring Rule"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(rule.updated_at))}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 flex-shrink-0"
                      disabled={deletingId === rule.id || pausingId === rule.id}
                    >
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onEdit(rule)}>
                      <Pencil className="mr-2 size-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePause(rule)}>
                      {rule.is_active ? (
                        <>
                          <Pause className="mr-2 size-4" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 size-4" />
                          <span>Resume</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleOpenBackfillDialog(rule)}>
                      <History className="mr-2 size-4" />
                      <span>Backfill</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(rule)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Query Preview */}
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {rule.query || "(empty query)"}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 flex-shrink-0" />
                  <span>Check every {rule.interval_seconds}s</span>
                </span>
                {rule.last_triggered_at && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5">
                      <Activity className="size-3.5 flex-shrink-0" />
                      <span>Last checked {formatDistanceToNow(new Date(rule.last_triggered_at))}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backfill Dialog */}
      <Dialog open={backfillDialogOpen} onOpenChange={setBackfillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backfill Historical Tweets</DialogTitle>
            <DialogDescription>
              Fetch historical tweets for the rule &quot;{backfillingRule?.tag || "Untitled"}&quot;.
              This will search for past tweets matching your query and add them to your zone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backfill-count">Number of tweets to fetch</Label>
              <Input
                id="backfill-count"
                type="number"
                min="1"
                max="500"
                value={backfillCount}
                onChange={(e) => setBackfillCount(e.target.value)}
                placeholder="100"
                disabled={backfillLoading}
              />
              <p className="text-xs text-muted-foreground">
                Maximum: 500 tweets per request
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">What happens:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Searches for latest tweets matching your rule&apos;s query</li>
                <li>Deduplicates (skips already existing tweets)</li>
                <li>Processes through the same pipeline (vectorization, etc.)</li>
                <li>Tweets appear in your feed in ~5 seconds</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBackfillDialogOpen(false)}
              disabled={backfillLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBackfill}
              disabled={backfillLoading}
            >
              {backfillLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <History className="mr-2 size-4" />
                  Fetch Tweets
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

