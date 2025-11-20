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
    <Tabs defaultValue="data-source" className="space-y-6">
      <TabsList>
        <TabsTrigger value="data-source">Data Source</TabsTrigger>
        <TabsTrigger value="tracked-profiles">
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

