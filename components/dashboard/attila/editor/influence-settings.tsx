"use client";

import { AttilaOperationConfig, TwitterOpinionCluster } from "@/types";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getOpinionClusterColor } from "@/types";

interface InfluenceSettingsProps {
  config: AttilaOperationConfig;
  updateConfig: (updates: Partial<AttilaOperationConfig>) => void;
  clusters: TwitterOpinionCluster[];
}

export function InfluenceSettings({ config, updateConfig, clusters }: InfluenceSettingsProps) {
  
  const toggleCluster = (clusterId: number) => {
    const current = config.target_clusters || [];
    const next = current.includes(clusterId)
      ? current.filter(id => id !== clusterId)
      : [...current, clusterId];
    updateConfig({ target_clusters: next });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Target Opinion Clusters</Label>
        <ScrollArea className="h-[300px] border rounded-md p-4">
          <div className="space-y-4">
            {clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No opinion clusters found. Create an Opinion Map analysis first.
              </p>
            ) : (
              clusters.map((cluster) => {
                const isSelected = (config.target_clusters || []).includes(cluster.cluster_id);
                const color = getOpinionClusterColor(cluster.cluster_id);
                
                return (
                  <div key={cluster.id} className="flex items-start space-x-3 pb-3 border-b last:border-0 last:pb-0">
                    <Checkbox 
                      id={`cluster-${cluster.cluster_id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleCluster(cluster.cluster_id)}
                      className="mt-1"
                    />
                    <div className="space-y-1 cursor-pointer" onClick={() => toggleCluster(cluster.cluster_id)}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: color }}
                        />
                        <Label 
                          htmlFor={`cluster-${cluster.cluster_id}`} 
                          className="font-medium cursor-pointer"
                        >
                          {cluster.label}
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {cluster.keywords?.join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cluster.tweet_count} tweets
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">
          Select the opinion clusters you want to influence. The AI will specifically target tweets belonging to these narratives.
        </p>
      </div>
    </div>
  );
}

