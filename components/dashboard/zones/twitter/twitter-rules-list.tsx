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
import { Plus, MoreVertical, Pencil, Pause, Play, Trash2, Clock, Activity } from "lucide-react";
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

  return (
    <Card className="card-padding">
      <div className="space-y-5">
        {/* Header with count and action */}
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-muted-foreground">
            {rules.length} active rule{rules.length !== 1 && 's'}
          </p>
          <Button onClick={onCreateNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Rule
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
                <Badge variant={rule.is_active ? "default" : "secondary"}>
                  {rule.is_active ? "Active" : "Paused"}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium truncate">
                    {rule.rule_name || "Monitoring Rule"}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(rule.updated_at))}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={deletingId === rule.id || pausingId === rule.id}
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(rule)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePause(rule)}>
                      {rule.is_active ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Resume
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(rule)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Query Preview */}
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                <p className="text-caption font-mono text-muted-foreground break-all">
                  {rule.query_string || rule.query_simple || "(empty query)"}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-caption text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Check every {rule.interval}s
                </span>
                {rule.last_checked_at && (
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Last checked {formatDistanceToNow(new Date(rule.last_checked_at))}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

