/**
 * Media Rules List Component
 * 
 * Displays list of media monitoring rules with actions.
 * Follows the same design patterns as Twitter rules list for consistency.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Pencil, Pause, Play, Trash2, Clock, Activity, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MediaRule } from "@/types";

/**
 * Format time distance to now (e.g., "2 hours ago")
 */
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

interface MediaRulesListProps {
  rules: MediaRule[];
  onEdit: (rule: MediaRule) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export function MediaRulesList({
  rules,
  onEdit,
  onCreateNew,
  onRefresh,
}: MediaRulesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  /**
   * Toggle rule active status
   */
  async function handleToggle(rule: MediaRule) {
    setTogglingId(rule.id);
    try {
      const response = await fetch(`/api/media/rules/${rule.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update rule");
      }
      
      toast.success(rule.is_active ? "Rule paused" : "Rule activated");
      onRefresh();
    } catch (error) {
      console.error("Failed to toggle rule:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update rule");
    } finally {
      setTogglingId(null);
    }
  }

  /**
   * Manually fetch articles for a rule
   */
  async function handleFetchNow(rule: MediaRule) {
    setFetchingId(rule.id);
    try {
      const response = await fetch("/api/media/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule.id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch articles");
      }
      
      toast.success(data.message || "Articles fetched successfully");
      onRefresh();
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch articles");
    } finally {
      setFetchingId(null);
    }
  }

  /**
   * Delete a rule
   */
  async function handleDelete(rule: MediaRule) {
    if (
      !confirm(
        `Are you sure you want to delete the rule "${rule.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(rule.id);
    try {
      const response = await fetch(`/api/media/rules/${rule.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
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

  /**
   * Get query preview text
   */
  function getQueryPreview(rule: MediaRule): string {
    const config = rule.query_config;
    
    if (rule.query_type === "simple") {
      if (config.keyword) {
        return `Keyword: "${config.keyword}"`;
      }
      if (config.sourceUri) {
        return `Source: ${config.sourceUri}`;
      }
    } else {
      // Advanced query - show main parameters
      const parts: string[] = [];
      if (config.keyword) parts.push(`"${config.keyword}"`);
      if (config.sourceUri) parts.push(`Source: ${config.sourceUri}`);
      if (config.lang) parts.push(`Lang: ${Array.isArray(config.lang) ? config.lang.join(", ") : config.lang}`);
      return parts.join(" • ") || "Advanced query";
    }
    
    return "No query configured";
  }

  return (
    <Card className="p-4">
      <div className="space-y-5">
        {/* Header with count and action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {rules.length} monitoring rule{rules.length !== 1 ? "s" : ""}
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
              className="rounded-xl border border-border bg-background p-4 space-y-3 transition-all duration-[var(--transition-fast)] hover:border-primary/30 hover:shadow-sm"
            >
              {/* Header: Status + Name + Actions */}
              <div className="flex items-start gap-3">
                <Badge 
                  variant={rule.is_active ? "outline" : "secondary"}
                  className={cn(
                    "flex-shrink-0 gap-1.5 pl-2",
                    rule.is_active ? "bg-tactical-green/10 text-tactical-green border-tactical-green/20" : "text-muted-foreground"
                  )}
                >
                  {rule.is_active ? (
                    <>
                      <Activity className="size-3" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <Pause className="size-3" />
                      <span>Paused</span>
                    </>
                  )}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {rule.name}
                  </p>
                  {rule.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {rule.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 flex-shrink-0"
                      disabled={deletingId === rule.id || togglingId === rule.id || fetchingId === rule.id}
                    >
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleFetchNow(rule)}>
                      <Download className="mr-2 size-4" />
                      <span>Fetch Now</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(rule)}>
                      <Pencil className="mr-2 size-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggle(rule)}>
                      {rule.is_active ? (
                        <>
                          <Pause className="mr-2 size-4" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 size-4" />
                          <span>Activate</span>
                        </>
                      )}
                    </DropdownMenuItem>
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
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {getQueryPreview(rule)}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 flex-shrink-0" />
                  <span>
                    Fetch every{" "}
                    {rule.fetch_interval_minutes >= 60
                      ? `${Math.floor(rule.fetch_interval_minutes / 60)}h`
                      : `${rule.fetch_interval_minutes}min`}
                  </span>
                </span>
                {rule.last_fetched_at && (
                  <>
                    <span className="hidden sm:inline text-border">•</span>
                    <span className="flex items-center gap-1.5">
                      <Activity className="size-3.5 flex-shrink-0" />
                      <span>Last fetched {formatDistanceToNow(new Date(rule.last_fetched_at))}</span>
                    </span>
                  </>
                )}
                <span className="hidden sm:inline text-border">•</span>
                <span><span className="font-mono font-medium text-foreground">{rule.articles_collected}</span> articles collected</span>
              </div>

              {/* Fetch status (if error) */}
              {rule.last_fetch_status === "error" && rule.last_fetch_error && (
                <div className="rounded-lg border border-tactical-red/30 bg-tactical-red/5 p-3">
                  <p className="text-xs text-tactical-red font-medium">
                    Last fetch failed: {rule.last_fetch_error}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

