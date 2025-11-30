"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AttilaOperation, TwitterOpinionCluster, AttilaOperationConfig } from "@/types";
import { updateOperationAction, toggleOperationStatusAction } from "@/app/actions/attila";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Pause, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { CommonSettings } from "./common-settings";
import { SniperSettings } from "./sniper-settings";
import { SentinelSettings } from "./sentinel-settings";
import { InfluenceSettings } from "./influence-settings";
import { Badge } from "@/components/ui/badge";

interface AttilaEditorLayoutProps {
  operation: AttilaOperation;
  zoneId: string;
  clusters: TwitterOpinionCluster[];
}

export function AttilaEditorLayout({ 
  operation, 
  zoneId, 
  clusters 
}: AttilaEditorLayoutProps) {
  const router = useRouter();
  const [name, setName] = useState(operation.name);
  const [config, setConfig] = useState<AttilaOperationConfig>(operation.config);
  const [status, setStatus] = useState(operation.status);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        name !== operation.name || 
        JSON.stringify(config) !== JSON.stringify(operation.config)
      ) {
        handleSave();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [name, config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateOperationAction(zoneId, operation.id, {
        name,
        config,
      });
      if (!result.success) {
        toast.error("Failed to save changes");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = status === "active" ? "paused" : "active";
    try {
      const result = await toggleOperationStatusAction(zoneId, operation.id, newStatus);
      if (result.success) {
        setStatus(newStatus);
        toast.success(`Operation ${newStatus === "active" ? "started" : "paused"}`);
        router.refresh();
      } else {
        toast.error("Failed to change status");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const updateConfig = (updates: Partial<AttilaOperationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="flex flex-col max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/zones/${zoneId}/attila`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-heading-4 font-semibold h-auto p-0 border-none focus-visible:ring-0 bg-transparent w-[300px]"
              />
              <Badge variant="outline" className="capitalize">{operation.type}</Badge>
              {isSaving && <span className="text-caption text-muted-foreground animate-pulse">Saving...</span>}
            </div>
            <div className="flex items-center gap-2 text-body-sm">
               <div className={`h-2 w-2 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`} />
               <span className="capitalize text-muted-foreground">{status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button 
             onClick={handleToggleStatus}
             variant={status === 'active' ? "outline" : "default"}
             className="gap-2"
           >
             {status === 'active' ? (
               <>
                 <Pause className="h-4 w-4" /> Pause Operation
               </>
             ) : (
               <>
                 <Play className="h-4 w-4" /> Start Operation
               </>
             )}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Core Configuration (Context, Guidelines) */}
        <div className="lg:col-span-2 space-y-6">
           <CommonSettings config={config} updateConfig={updateConfig} />
        </div>

        {/* Right Column: Specific Configuration */}
        <div className="space-y-6 sticky top-6">
           <Card className="p-6 space-y-6">
             <div className="space-y-2">
               <h3 className="font-semibold text-lg">Operation Settings</h3>
               <p className="text-sm text-muted-foreground">
                 Specific parameters for {operation.type} mode.
               </p>
             </div>

             {operation.type === 'sniper' && (
               <SniperSettings config={config} updateConfig={updateConfig} />
             )}
             
             {operation.type === 'sentinel' && (
               <SentinelSettings config={config} updateConfig={updateConfig} />
             )}

             {operation.type === 'influence' && (
               <InfluenceSettings 
                 config={config} 
                 updateConfig={updateConfig} 
                 clusters={clusters} 
               />
             )}
           </Card>
        </div>
      </div>
    </div>
  );
}

