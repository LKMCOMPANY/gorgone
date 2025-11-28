"use client";

import { AttilaOperationConfig } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SentinelSettingsProps {
  config: AttilaOperationConfig;
  updateConfig: (updates: Partial<AttilaOperationConfig>) => void;
}

export function SentinelSettings({ config, updateConfig }: SentinelSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="alert-threshold">Volume Alert Threshold</Label>
        <Input
          id="alert-threshold"
          type="number"
          min="1"
          value={config.alert_threshold || 100}
          onChange={(e) => updateConfig({ alert_threshold: parseInt(e.target.value) || 0 })}
          className="bg-background"
        />
        <p className="text-xs text-muted-foreground">
          Triggers response when tweet volume exceeds this % increase per hour.
        </p>
      </div>
      
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
        <p className="text-sm text-blue-400">
          Sentinel operations run in background and only activate when anomaly detection triggers an alert based on the threshold above.
        </p>
      </div>
    </div>
  );
}

