/**
 * Media Settings Tab Component
 * 
 * Main container for media monitoring configuration.
 * Manages rules for fetching articles from Event Registry API.
 * 
 * Follows the same structure as Twitter settings for consistency.
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MediaRulesList } from "./media-rules-list";
import { MediaRuleDialog } from "./media-rule-dialog";
import { MediaSettingsSkeleton } from "./media-settings-skeleton";
import type { MediaRule } from "@/types";

interface MediaSettingsTabProps {
  zoneId: string;
}

/**
 * Media Settings Tab
 * 
 * Displays and manages media monitoring rules for a zone.
 * Features:
 * - List of active/inactive rules
 * - Create new rules dialog
 * - Edit existing rules
 * - Toggle rule activation
 * - Delete rules
 */
export function MediaSettingsTab({ zoneId }: MediaSettingsTabProps) {
  const [rules, setRules] = useState<MediaRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MediaRule | null>(null);

  // Load rules on mount and when zoneId changes
  useEffect(() => {
    loadRules();
  }, [zoneId]);

  /**
   * Fetch rules from API
   */
  async function loadRules() {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/media/rules?zoneId=${zoneId}`);
      const data = await response.json();
      
      if (data.rules) {
        setRules(data.rules);
      } else {
        console.error("Failed to load media rules:", data.error);
        setRules([]);
      }
    } catch (error) {
      console.error("Failed to load media rules:", error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Open dialog to edit an existing rule
   */
  function handleEdit(rule: MediaRule) {
    setEditingRule(rule);
    setDialogOpen(true);
  }

  /**
   * Open dialog to create a new rule
   */
  function handleCreateNew() {
    setEditingRule(null);
    setDialogOpen(true);
  }

  /**
   * Close dialog and refresh rules list
   */
  function handleDialogClose() {
    setDialogOpen(false);
    setEditingRule(null);
    // Reload rules to get fresh data
    loadRules();
  }

  // Show skeleton during initial load
  if (loading) {
    return <MediaSettingsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header Section */}
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <svg 
            className="size-5 text-primary flex-shrink-0" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
          </svg>
          <span>Media Monitoring</span>
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure monitoring rules to automatically capture news articles matching your criteria
        </p>
      </div>

      {/* Empty State or Rules List */}
      {rules.length === 0 ? (
        <Card className="card-padding">
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-12 sm:p-16">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-body font-semibold">No monitoring rules yet</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Create your first rule to start capturing news articles from specific sources, keywords, or topics
                </p>
              </div>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="size-4" />
                Create First Rule
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <MediaRulesList
          rules={rules}
          onEdit={handleEdit}
          onCreateNew={handleCreateNew}
          onRefresh={loadRules}
        />
      )}

      {/* Create/Edit Rule Dialog */}
      <MediaRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClose={handleDialogClose}
        zoneId={zoneId}
        editingRule={editingRule}
      />
    </div>
  );
}

