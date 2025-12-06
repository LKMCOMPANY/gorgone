/**
 * Media Rule Dialog Component
 * 
 * Professional dialog for creating and editing media monitoring rules.
 * Features both Simple and Advanced modes with full Event Registry API support.
 * 
 * Follows Twitter rule dialog pattern for consistency.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { MediaRule } from "@/types";

interface MediaRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  zoneId: string;
  editingRule: MediaRule | null;
}

/**
 * Media Rule Dialog
 * 
 * Comprehensive form for configuring media monitoring rules.
 * Supports all Event Registry API parameters.
 */
export function MediaRuleDialog({
  open,
  onOpenChange,
  onClose,
  zoneId,
  editingRule,
}: MediaRuleDialogProps) {
  // Form state
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [ruleName, setRuleName] = useState("");
  const [description, setDescription] = useState("");
  const [fetchInterval, setFetchInterval] = useState(60);
  const [articlesPerFetch, setArticlesPerFetch] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  // Simple mode state
  const [keyword, setKeyword] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);

  // Date filters (shared between simple and advanced)
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  // Advanced mode state
  const [keywords, setKeywords] = useState<string[]>([]);
  const [sourceUris, setSourceUris] = useState<string[]>([]);
  const [sourceLocations, setSourceLocations] = useState<string[]>([]);
  const [ignoreKeywords, setIgnoreKeywords] = useState<string[]>([]);
  const [ignoreSourceUris, setIgnoreSourceUris] = useState<string[]>([]);
  const [minSentiment, setMinSentiment] = useState<number | null>(null);
  const [maxSentiment, setMaxSentiment] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "rel" | "sourceImportance" | "socialScore">("date");
  const [dataTypes, setDataTypes] = useState<string[]>(["news"]);
  const [forceMaxDataTimeWindow, setForceMaxDataTimeWindow] = useState<7 | 31 | null>(null);

  // Initialize form with editing rule
  useEffect(() => {
    if (editingRule) {
      setRuleName(editingRule.name);
      setDescription(editingRule.description || "");
      setFetchInterval(editingRule.fetch_interval_minutes);
      setArticlesPerFetch(editingRule.articles_per_fetch);
      setMode(editingRule.query_type);
      setSortBy(editingRule.sort_by);
      setDataTypes(editingRule.data_types);
      setForceMaxDataTimeWindow(
        editingRule.force_max_data_time_window === 7 || editingRule.force_max_data_time_window === 31
          ? editingRule.force_max_data_time_window
          : null
      );

      const config = editingRule.query_config;

      if (editingRule.query_type === "simple") {
        setKeyword(config.keyword || "");
        setLanguages(config.lang || []);
        setDateStart("");
        setDateEnd("");
      } else {
        setKeywords(Array.isArray(config.keyword) ? config.keyword : config.keyword ? [config.keyword] : []);
        setSourceUris(Array.isArray(config.sourceUri) ? config.sourceUri : config.sourceUri ? [config.sourceUri] : []);
        setSourceLocations(Array.isArray(config.sourceLocationUri) ? config.sourceLocationUri : []);
        setIgnoreKeywords(Array.isArray(config.ignoreKeyword) ? config.ignoreKeyword : []);
        setIgnoreSourceUris(Array.isArray(config.ignoreSourceUri) ? config.ignoreSourceUri : []);
        setLanguages(Array.isArray(config.lang) ? config.lang : config.lang ? [config.lang] : ["eng"]);
        setMinSentiment(config.minSentiment ?? null);
        setMaxSentiment(config.maxSentiment ?? null);
        setDateStart(config.dateStart || "");
        setDateEnd(config.dateEnd || "");
      }
    } else {
      // Reset form
      resetForm();
    }
  }, [editingRule, open]);

  function resetForm() {
    setMode("simple");
    setRuleName("");
    setDescription("");
    setKeyword("");
    setLanguages([]);
    setDateStart("");
    setDateEnd("");
    setKeywords([]);
    setSourceUris([]);
    setSourceLocations([]);
    setIgnoreKeywords([]);
    setIgnoreSourceUris([]);
    setMinSentiment(null);
    setMaxSentiment(null);
    setFetchInterval(60);
    setArticlesPerFetch(100);
    setSortBy("date");
    setDataTypes(["news"]);
    setForceMaxDataTimeWindow(7);
  }

  // Build query config based on mode
  function buildQueryConfig() {
    if (mode === "simple") {
      // BEST PRACTICE: One rule = one keyword (no splitting)
      // This avoids Event Registry API bugs with multi-word phrases + OR operator
      const trimmedKeyword = keyword.trim();
      
      return {
        keyword: trimmedKeyword,  // Single keyword or phrase
        ...(languages.length > 0 && { lang: languages }),
        ...(dateStart && { dateStart }),
        ...(dateEnd && { dateEnd }),
      };
    } else {
      return {
        ...(keywords.length > 0 && { keyword: keywords }),
        ...(sourceUris.length > 0 && { sourceUri: sourceUris }),
        ...(sourceLocations.length > 0 && { sourceLocationUri: sourceLocations }),
        ...(ignoreKeywords.length > 0 && { ignoreKeyword: ignoreKeywords }),
        ...(ignoreSourceUris.length > 0 && { ignoreSourceUri: ignoreSourceUris }),
        ...(languages.length > 0 && { lang: languages }),
        ...(minSentiment !== null && { minSentiment }),
        ...(maxSentiment !== null && { maxSentiment }),
        ...(dateStart && { dateStart }),
        ...(dateEnd && { dateEnd }),
      };
    }
  }

  // Validation
  function validate(): boolean {
    if (!ruleName.trim()) {
      toast.error("Rule name is required");
      return false;
    }

    if (mode === "simple") {
      if (!keyword.trim()) {
        toast.error("Keyword is required in simple mode");
        return false;
      }
    } else {
      if (keywords.length === 0 && sourceUris.length === 0) {
        toast.error("At least one keyword or source is required in advanced mode");
        return false;
      }
    }

    if (fetchInterval < 15) {
      toast.error("Fetch interval must be at least 15 minutes");
      return false;
    }

    if (articlesPerFetch < 1 || articlesPerFetch > 100) {
      toast.error("Articles per fetch must be between 1 and 100");
      return false;
    }

    if (minSentiment !== null && (minSentiment < -1 || minSentiment > 1)) {
      toast.error("Min sentiment must be between -1 and 1");
      return false;
    }

    if (maxSentiment !== null && (maxSentiment < -1 || maxSentiment > 1)) {
      toast.error("Max sentiment must be between -1 and 1");
      return false;
    }

    return true;
  }

  // Save rule
  async function handleSave() {
    if (!validate()) return;

    setIsSaving(true);

    try {
      const body = {
        zone_id: zoneId,
        name: ruleName.trim(),
        description: description.trim() || null,
        query_type: mode,
        query_config: buildQueryConfig(),
        fetch_interval_minutes: fetchInterval,
        articles_per_fetch: articlesPerFetch,
        sort_by: sortBy,
        sort_asc: false,
        data_types: dataTypes,
        force_max_data_time_window: mode === "simple" ? 31 : forceMaxDataTimeWindow,  // 31 days for simple mode (better coverage)
        duplicate_filter: "skipDuplicates",
        event_filter: "keepAll",
        include_body: true,
        include_social_score: true,
        include_sentiment: true,
        include_concepts: false,
        include_categories: false,
        include_authors: true,
        include_videos: false,
        include_links: false,
      };

      const url = editingRule
        ? `/api/media/rules/${editingRule.id}`
        : "/api/media/rules";
      
      const method = editingRule ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
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

  // Tag input helpers
  function addTag(value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    const trimmed = value.trim();
    if (trimmed) {
      setter(prev => [...prev, trimmed]);
    }
  }

  function removeTag(index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? "Edit Media Rule" : "Create Media Rule"}
          </DialogTitle>
          <DialogDescription>
            Configure a rule to automatically fetch news articles from Event Registry
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name" className="text-sm font-medium">Rule Name *</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Climate News Monitoring"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="rule-description"
                placeholder="Optional description of what this rule monitors"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[60px] resize-none"
              />
            </div>
          </div>

          {/* Query Configuration */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as "simple" | "advanced")}>
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="simple" className="text-xs font-medium h-7">Simple</TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs font-medium h-7">Advanced</TabsTrigger>
            </TabsList>

            {/* Simple Mode */}
            <TabsContent value="simple" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="keyword" className="text-sm font-medium">Keyword or Phrase *</Label>
                <Input
                  id="keyword"
                  placeholder='e.g., "Climate Change"'
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="h-9"
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <strong>Best Practice:</strong> Create one rule per keyword for better results
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avoid multiple keywords in one rule - create separate rules instead
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="simple-lang" className="text-sm font-medium">Language</Label>
                <Select
                  value={languages[0] || "all"}
                  onValueChange={(v) => setLanguages(v === "all" ? [] : [v])}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="eng">English</SelectItem>
                    <SelectItem value="fra">French</SelectItem>
                    <SelectItem value="spa">Spanish</SelectItem>
                    <SelectItem value="deu">German</SelectItem>
                    <SelectItem value="ita">Italian</SelectItem>
                    <SelectItem value="por">Portuguese</SelectItem>
                    <SelectItem value="rus">Russian</SelectItem>
                    <SelectItem value="zho">Chinese</SelectItem>
                    <SelectItem value="ara">Arabic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select language or "All" for multilingual monitoring
                </p>
              </div>
            </TabsContent>

            {/* Advanced Mode */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              {/* Keywords */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add keyword and press Enter"
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(e.currentTarget.value, setKeywords);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {kw}
                        <X
                          className="size-3 cursor-pointer"
                          onClick={() => removeTag(i, setKeywords)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Sources */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Source URIs</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., bbc.com (press Enter)"
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(e.currentTarget.value, setSourceUris);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
                {sourceUris.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sourceUris.map((src, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {src}
                        <X
                          className="size-3 cursor-pointer"
                          onClick={() => removeTag(i, setSourceUris)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Ignore Keywords */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Exclude Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Keywords to exclude (press Enter)"
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(e.currentTarget.value, setIgnoreKeywords);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
                {ignoreKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ignoreKeywords.map((kw, i) => (
                      <Badge key={i} variant="destructive" className="gap-1">
                        {kw}
                        <X
                          className="size-3 cursor-pointer"
                          onClick={() => removeTag(i, setIgnoreKeywords)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Sentiment Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-sentiment" className="text-sm font-medium">Min Sentiment</Label>
                  <Input
                    id="min-sentiment"
                    type="number"
                    min="-1"
                    max="1"
                    step="0.1"
                    placeholder="-1 to 1"
                    value={minSentiment ?? ""}
                    onChange={(e) => setMinSentiment(e.target.value ? parseFloat(e.target.value) : null)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-sentiment" className="text-sm font-medium">Max Sentiment</Label>
                  <Input
                    id="max-sentiment"
                    type="number"
                    min="-1"
                    max="1"
                    step="0.1"
                    placeholder="-1 to 1"
                    value={maxSentiment ?? ""}
                    onChange={(e) => setMaxSentiment(e.target.value ? parseFloat(e.target.value) : null)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adv-date-start" className="text-sm font-medium">Start Date</Label>
                  <Input
                    id="adv-date-start"
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adv-date-end" className="text-sm font-medium">End Date</Label>
                  <Input
                    id="adv-date-end"
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Fetch Configuration */}
          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <h4 className="text-sm font-medium">Fetch Configuration</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval" className="text-sm font-medium">Fetch Interval (min)</Label>
                <Input
                  id="interval"
                  type="number"
                  min="15"
                  max="1440"
                  value={fetchInterval}
                  onChange={(e) => setFetchInterval(parseInt(e.target.value) || 60)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="articles-count" className="text-sm font-medium">Articles per Fetch</Label>
                <Input
                  id="articles-count"
                  type="number"
                  min="1"
                  max="100"
                  value={articlesPerFetch}
                  onChange={(e) => setArticlesPerFetch(parseInt(e.target.value) || 100)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort-by" className="text-sm font-medium">Sort By</Label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (newest first)</SelectItem>
                  <SelectItem value="rel">Relevance</SelectItem>
                  <SelectItem value="sourceImportance">Source Importance</SelectItem>
                  <SelectItem value="socialScore">Social Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
