"use client";

/**
 * TikTok Settings Tab
 * Main container for TikTok configuration
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TikTokDataSourceTab } from "./tiktok-data-source-tab";
import { TikTokTrackedProfilesTab } from "./tiktok-tracked-profiles-tab";

interface TikTokSettingsTabProps {
  zoneId: string;
}

export function TikTokSettingsTab({ zoneId }: TikTokSettingsTabProps) {
  return (
    <Tabs defaultValue="data-source" className="w-full space-y-6">
      <TabsList className="w-full sm:w-auto h-10 bg-muted/50 p-1">
        <TabsTrigger value="data-source" className="text-sm font-medium transition-all duration-[var(--transition-fast)] data-[state=active]:shadow-sm">
          Data Source
        </TabsTrigger>
        <TabsTrigger value="tracked-profiles" className="text-sm font-medium transition-all duration-[var(--transition-fast)] data-[state=active]:shadow-sm">
          Tracked Profiles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="data-source" className="space-y-6">
        <TikTokDataSourceTab zoneId={zoneId} />
      </TabsContent>

      <TabsContent value="tracked-profiles">
        <TikTokTrackedProfilesTab zoneId={zoneId} />
      </TabsContent>
    </Tabs>
  );
}

