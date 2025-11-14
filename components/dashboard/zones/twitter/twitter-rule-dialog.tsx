"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { generateQuery } from "@/lib/data/twitter/query-builder";
import { TwitterQueryBuilder } from "./twitter-query-builder";
import type { TwitterRule, TwitterQueryBuilderConfig } from "@/types";

interface TwitterRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  zoneId: string;
  editingRule: TwitterRule | null;
}

export function TwitterRuleDialog({
  open,
  onOpenChange,
  onClose,
  zoneId,
  editingRule,
}: TwitterRuleDialogProps) {
  const [mode, setMode] = useState<"simple" | "builder">("builder");
  const [ruleName, setRuleName] = useState("");
  const [queryString, setQueryString] = useState("");
  const [interval, setInterval] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  // Builder config
  const [builderConfig, setBuilderConfig] = useState<TwitterQueryBuilderConfig>({
    keywords: [],
    hashtags: [],
    mentions: [],
    from_users: [],
    to_users: [],
    exclude_keywords: [],
    exclude_users: [],
    verified_only: false,
    has_media: false,
    has_links: false,
    min_retweets: null,
    min_likes: null,
    min_replies: null,
  });

  // Initialize form with editing rule
  useEffect(() => {
    if (editingRule) {
      setRuleName(editingRule.tag || "");
      setQueryString(editingRule.query || "");
      setInterval(editingRule.interval_seconds);
      
      if (editingRule.query_builder_config) {
        setBuilderConfig(editingRule.query_builder_config);
        setMode("builder");
      } else {
        setMode("simple");
      }
    } else {
      // Reset form
      setRuleName("");
      setQueryString("");
      setInterval(100);
      setBuilderConfig({
        keywords: [],
        hashtags: [],
        mentions: [],
        from_users: [],
        to_users: [],
        exclude_keywords: [],
        exclude_users: [],
        verified_only: false,
        has_media: false,
        has_links: false,
        min_retweets: null,
        min_likes: null,
        min_replies: null,
      });
      setMode("builder");
    }
  }, [editingRule, open]);

  // Generate query from builder
  const generatedQuery = mode === "builder" ? generateQuery(builderConfig) : queryString;

  // Validation
  const isValid = ruleName.trim() !== "" && generatedQuery.trim() !== "" && interval >= 60;

  async function handleSave() {
    if (!isValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        zone_id: zoneId,
        tag: ruleName,
        query_type: mode,
        query: mode === "simple" ? queryString : undefined,
        query_builder_config: mode === "builder" ? builderConfig : undefined,
        interval_seconds: interval,
      };

      const response = await fetch(
        editingRule
          ? `/api/twitter/rules/${editingRule.id}`
          : `/api/twitter/rules`,
        {
          method: editingRule ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save rule");
      }

      toast.success(editingRule ? "Rule updated successfully" : "Rule created successfully");
      onClose();
    } catch (error) {
      console.error("Failed to save rule:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save rule");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-heading-2">
            {editingRule ? "Edit Monitoring Rule" : "Create Monitoring Rule"}
          </DialogTitle>
          <DialogDescription className="text-body text-muted-foreground">
            Configure filters to capture tweets matching specific criteria
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="rule-name" className="text-body-sm font-medium">
              Rule Name
            </Label>
            <Input
              id="rule-name"
              placeholder="e.g., Patrick Muyaya Monitoring"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="h-10 transition-all duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
              autoFocus
            />
            <p className="text-caption text-muted-foreground">
              Choose a descriptive name for this monitoring rule
            </p>
          </div>

          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(value) => setMode(value as "simple" | "builder")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simple" className="text-body-sm">
                Simple Mode
              </TabsTrigger>
              <TabsTrigger value="builder" className="text-body-sm">
                Query Builder
              </TabsTrigger>
            </TabsList>

            {/* SIMPLE MODE */}
            <TabsContent value="simple" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="query" className="text-body-sm font-medium">
                  Twitter Query
                </Label>
                <Textarea
                  id="query"
                  placeholder="from:elonmusk OR @elonmusk OR &quot;Elon Musk&quot;"
                  value={queryString}
                  onChange={(e) => setQueryString(e.target.value)}
                  className="min-h-[120px] font-mono text-body-sm resize-none transition-all duration-[150ms]"
                />
                <p className="text-caption text-muted-foreground">
                  Use Twitter's search syntax (AND, OR, -, etc.)
                </p>
              </div>
            </TabsContent>

            {/* BUILDER MODE */}
            <TabsContent value="builder" className="space-y-6 mt-6">
              <TwitterQueryBuilder
                config={builderConfig}
                onChange={setBuilderConfig}
              />

              {/* QUERY PREVIEW */}
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 space-y-2">
                <Label className="text-body-sm font-medium">Generated Query</Label>
                <p className="text-body-sm font-mono text-muted-foreground break-all">
                  {generatedQuery || "(empty query)"}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* INTERVAL */}
          <div className="space-y-3">
            <Label className="text-body-sm font-medium">
              Check Interval: <span className="font-normal text-muted-foreground">{interval} seconds</span>
            </Label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="60"
                max="300"
                step="10"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <p className="text-caption text-muted-foreground">
              How often to check for new tweets (minimum 60 seconds)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="transition-all duration-[150ms]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !isValid}
            className="min-w-[120px] transition-all duration-[150ms]"
          >
            {isSaving ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

