"use client";

/**
 * TikTok Data Source Tab
 * Configure TikTok monitoring rules
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TikTokRuleDialog } from "./tiktok-rule-dialog";
import { TikTokRulesList } from "./tiktok-rules-list";
import { TikTokDataSourceSkeleton } from "./tiktok-data-source-skeleton";
import { toast } from "sonner";

interface TikTokRule {
  id: string;
  rule_type: "keyword" | "hashtag" | "user" | "combined";
  rule_name: string;
  query?: string;
  hashtag?: string;
  username?: string;
  country?: string;
  interval_minutes: 60 | 180 | 360;
  is_active: boolean;
  last_polled_at?: string;
  total_videos_collected: number;
  last_video_count: number;
  created_at: string;
}

interface TikTokDataSourceTabProps {
  zoneId: string;
}

export function TikTokDataSourceTab({ zoneId }: TikTokDataSourceTabProps) {
  const [rules, setRules] = useState<TikTokRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TikTokRule | null>(null);

  useEffect(() => {
    loadRules();
  }, [zoneId]);

  async function loadRules() {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/tiktok/rules?zone_id=${zoneId}`);
      const data = await response.json();
      
      setRules(data.rules || []);
    } catch (error) {
      console.error("Failed to load rules:", error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(rule: TikTokRule) {
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
    loadRules();
  }

  if (loading) {
    return <TikTokDataSourceSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Header with Collect Now button */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <svg className="size-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
            <span>Data Sources</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure monitoring rules to automatically capture videos matching your criteria
          </p>
        </div>
        
        {rules.length > 0 && (
          <Button
            onClick={async () => {
              try {
                const response = await fetch('/api/tiktok/test-polling', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ zone_id: zoneId }),
                });
                const data = await response.json();
                if (data.success) {
                  const totalVideos = data.results?.reduce((sum: number, r: any) => sum + (r.videos_created || 0), 0) || 0;
                  toast.success(`Collected ${totalVideos} new video${totalVideos !== 1 ? 's' : ''}`);
                  loadRules();
                } else {
                  toast.error('Failed to collect videos');
                }
              } catch (error) {
                toast.error('Failed to collect videos');
              }
            }}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Collect Now
          </Button>
        )}
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
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Create your first rule to start capturing videos that match specific keywords, hashtags, or users
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
        <TikTokRulesList
          rules={rules}
          onEdit={handleEdit}
          onCreateNew={handleCreateNew}
          onRefresh={loadRules}
        />
      )}

      {/* Create/Edit Dialog */}
      <TikTokRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClose={handleDialogClose}
        zoneId={zoneId}
        editingRule={editingRule}
      />
    </div>
  );
}

