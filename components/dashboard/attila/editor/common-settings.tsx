"use client";

import { AttilaOperationConfig } from "@/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface CommonSettingsProps {
  config: AttilaOperationConfig;
  updateConfig: (updates: Partial<AttilaOperationConfig>) => void;
}

export function CommonSettings({ config, updateConfig }: CommonSettingsProps) {
  return (
    <Card className="p-6 space-y-8">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="context" className="text-lg font-medium">
            Operational Context
          </Label>
          <p className="text-sm text-muted-foreground">
            Describe the situation, the background, and what the AI needs to know to understand the environment.
          </p>
        </div>
        <Textarea
          id="context"
          value={config.context}
          onChange={(e) => updateConfig({ context: e.target.value })}
          placeholder="e.g., The current political climate is tense regarding the new transportation bill..."
          className="min-h-[150px] resize-y bg-muted/10"
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="guidelines" className="text-lg font-medium">
            Strategic Guidelines
          </Label>
          <p className="text-sm text-muted-foreground">
            Define the objectives and behavioral rules for the avatars (e.g., defend the narrative, be diplomatic, use humor).
          </p>
        </div>
        <Textarea
          id="guidelines"
          value={config.guidelines}
          onChange={(e) => updateConfig({ guidelines: e.target.value })}
          placeholder="e.g., 1. Always remain polite but firm.\n2. Emphasize the economic benefits.\n3. Correct misinformation immediately."
          className="min-h-[150px] resize-y bg-muted/10"
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="language" className="text-lg font-medium">
            Language Elements & Key Messages
          </Label>
          <p className="text-sm text-muted-foreground">
            Specific phrases, hashtags, or terminology that should be used or avoided.
          </p>
        </div>
        <Textarea
          id="language"
          value={config.language_elements}
          onChange={(e) => updateConfig({ language_elements: e.target.value })}
          placeholder="Keywords: #Progress, #Future\nPhrases: 'Sustainable growth', 'Community first'"
          className="min-h-[100px] resize-y bg-muted/10"
        />
      </div>
    </Card>
  );
}

