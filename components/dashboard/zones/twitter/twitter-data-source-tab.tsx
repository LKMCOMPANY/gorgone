"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TwitterRulesList } from "./twitter-rules-list";
import { TwitterRuleDialog } from "./twitter-rule-dialog";
import { TwitterDataSourceSkeleton } from "./twitter-data-source-skeleton";
import type { TwitterRule } from "@/types";

interface TwitterDataSourceTabProps {
  zoneId: string;
}

export function TwitterDataSourceTab({ zoneId }: TwitterDataSourceTabProps) {
  const [rules, setRules] = useState<TwitterRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TwitterRule | null>(null);

  useEffect(() => {
    loadRules();
  }, [zoneId]);

  async function loadRules() {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/twitter/rules?zone_id=${zoneId}`);
      const data = await response.json();
      
      if (data.success) {
        setRules(data.rules || []);
      } else {
        console.error("Failed to load rules:", data.error);
        setRules([]);
      }
    } catch (error) {
      console.error("Failed to load rules:", error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(rule: TwitterRule) {
    setEditingRule(rule);
    setDialogOpen(true);
  }

  function handleCreateNew() {
    setEditingRule(null);
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingRule(null);
    // Reload rules after dialog closes to get fresh data
    loadRules();
  }

  if (loading) {
    return <TwitterDataSourceSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="space-y-1.5">
        <h3 className="text-heading-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span>Data Sources</span>
        </h3>
        <p className="text-body-sm text-muted-foreground">
          Configure monitoring rules to automatically capture tweets matching your criteria
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
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-body font-semibold">No monitoring rules yet</p>
                <p className="text-body-sm text-muted-foreground max-w-md mx-auto">
                  Create your first rule to start capturing tweets that match specific keywords, mentions, or criteria
                </p>
              </div>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Rule
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <TwitterRulesList
          rules={rules}
          onEdit={handleEdit}
          onCreateNew={handleCreateNew}
          onRefresh={loadRules}
        />
      )}

      {/* Create/Edit Dialog */}
      <TwitterRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClose={handleDialogClose}
        zoneId={zoneId}
        editingRule={editingRule}
      />
    </div>
  );
}

