"use client";

/**
 * TikTok Rule Dialog
 * Create/Edit TikTok monitoring rules
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface TikTokRule {
  id: string;
  rule_type: "keyword" | "hashtag" | "user" | "combined";
  rule_name: string;
  query?: string;
  hashtag?: string;
  username?: string;
  country?: string;
  interval_minutes: 60 | 180 | 360;
}

interface TikTokRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  zoneId: string;
  editingRule: TikTokRule | null;
}

type RuleType = "keyword" | "hashtag" | "user" | "combined";

export function TikTokRuleDialog({
  open,
  onOpenChange,
  onClose,
  zoneId,
  editingRule,
}: TikTokRuleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [ruleType, setRuleType] = useState<RuleType>("keyword");
  const [ruleName, setRuleName] = useState("");
  const [query, setQuery] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState<60 | 180 | 360>(60);

  // Initialize form when dialog opens or editingRule changes
  useEffect(() => {
    if (editingRule) {
      setRuleName(editingRule.rule_name);
      setRuleType(editingRule.rule_type);
      setQuery(editingRule.query || "");
      setHashtag(editingRule.hashtag || "");
      setUsername(editingRule.username || "");
      setCountry(editingRule.country || "");
      setIntervalMinutes(editingRule.interval_minutes);
    } else {
      resetForm();
    }
  }, [editingRule, open]);

  const resetForm = () => {
    setRuleType("keyword");
    setRuleName("");
    setQuery("");
    setHashtag("");
    setUsername("");
    setCountry("");
    setIntervalMinutes(60);
  };

  const handleSubmit = async () => {
    // Validation
    if (!ruleName.trim()) {
      toast.error("Rule name is required");
      return;
    }

    if (ruleType === "keyword" && !query.trim()) {
      toast.error("Search query is required for keyword rules");
      return;
    }

    if (ruleType === "hashtag" && !hashtag.trim()) {
      toast.error("Hashtag is required for hashtag rules");
      return;
    }

    if (ruleType === "user" && !username.trim()) {
      toast.error("Username is required for user rules");
      return;
    }

    if (ruleType === "combined" && !query.trim()) {
      toast.error("Search query is required for combined rules");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        zone_id: zoneId,
        rule_type: ruleType,
        rule_name: ruleName.trim(),
        query: query.trim() || undefined,
        hashtag: hashtag.trim().replace(/^#/, "") || undefined,
        username: username.trim().replace(/^@/, "") || undefined,
        country: country === "none" ? undefined : country || undefined,
        interval_minutes: intervalMinutes,
      };

      const url = editingRule 
        ? `/api/tiktok/rules/${editingRule.id}`
        : "/api/tiktok/rules";
      
      const method = editingRule ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${editingRule ? 'update' : 'create'} rule`);
      }

      toast.success(editingRule ? "Rule updated successfully" : "Rule created successfully");
      resetForm();
      onOpenChange(false);
      onClose();
    } catch (error: any) {
      console.error("Error creating TikTok rule:", error);
      toast.error(error.message || "Failed to create rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRule ? "Edit" : "Create"} TikTok Rule</DialogTitle>
          <DialogDescription>
            Configure a monitoring rule to collect TikTok videos. The system will check for new content based on your selected interval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="rule-name">Rule Name *</Label>
            <Input
              id="rule-name"
              placeholder="e.g., Elon Musk Posts"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Rule Type */}
          <div className="space-y-2">
            <Label htmlFor="rule-type">Rule Type *</Label>
            <Select
              value={ruleType}
              onValueChange={(value) => setRuleType(value as RuleType)}
              disabled={loading}
            >
              <SelectTrigger id="rule-type" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Keywords (Search)</SelectItem>
                <SelectItem value="hashtag">Hashtag</SelectItem>
                <SelectItem value="user">User Profile</SelectItem>
                <SelectItem value="combined">Combined (Hashtag + Keywords)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ruleType === "keyword" && "Search for videos containing specific keywords (AND logic)"}
              {ruleType === "hashtag" && "Collect all videos using a specific hashtag"}
              {ruleType === "user" && "Monitor all posts from a specific TikTok user"}
              {ruleType === "combined" && "Mix hashtags and keywords in your search"}
            </p>
          </div>

          {/* Type-specific fields */}
          {(ruleType === "keyword" || ruleType === "combined") && (
            <div className="space-y-2">
              <Label htmlFor="query">Search Query *</Label>
              <Input
                id="query"
                placeholder={
                  ruleType === "combined"
                    ? "#tesla stock analysis"
                    : "Elon Musk"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Multiple words are treated as AND (all words must be present)
              </p>
            </div>
          )}

          {ruleType === "hashtag" && (
            <div className="space-y-2">
              <Label htmlFor="hashtag">Hashtag *</Label>
              <Input
                id="hashtag"
                placeholder="tesla (without #)"
                value={hashtag}
                onChange={(e) => setHashtag(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Enter hashtag without the # symbol
              </p>
            </div>
          )}

          {ruleType === "user" && (
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="elonmusk (without @)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Enter TikTok username without the @ symbol
              </p>
            </div>
          )}

          {/* Country Filter */}
          <div className="space-y-2">
            <Label htmlFor="country">Country Filter (Optional)</Label>
            <Select value={country || "none"} onValueChange={(value) => setCountry(value === "none" ? "" : value)} disabled={loading}>
              <SelectTrigger id="country" className="h-9">
                <SelectValue placeholder="Any country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any country</SelectItem>
                <SelectItem value="cd">🇨🇩 Congo (DRC)</SelectItem>
                <SelectItem value="fr">🇫🇷 France</SelectItem>
                <SelectItem value="us">🇺🇸 United States</SelectItem>
                <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
                <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                <SelectItem value="de">🇩🇪 Germany</SelectItem>
                <SelectItem value="be">🇧🇪 Belgium</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optionally filter results by geographic region
            </p>
          </div>

          {/* Polling Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval">Check Interval *</Label>
            <Select
              value={intervalMinutes.toString()}
              onValueChange={(value) => setIntervalMinutes(Number(value) as 60 | 180 | 360)}
              disabled={loading}
            >
              <SelectTrigger id="interval" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">Every 1 hour (High Priority)</SelectItem>
                <SelectItem value="180">Every 3 hours (Normal)</SelectItem>
                <SelectItem value="360">Every 6 hours (Low Priority)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often to check for new videos matching this rule
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingRule ? "Update" : "Create"} Rule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

