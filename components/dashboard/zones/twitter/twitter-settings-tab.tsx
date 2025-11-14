"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TwitterDataSourceTab } from "./twitter-data-source-tab";
import { TwitterTrackedProfilesTab } from "./twitter-tracked-profiles-tab";

interface TwitterSettingsTabProps {
  zoneId: string;
}

/**
 * Twitter Settings Tab
 * Contains sub-tabs for Data Source and Tracked Profiles
 */
export function TwitterSettingsTab({ zoneId }: TwitterSettingsTabProps) {
  return (
    <Tabs defaultValue="data-source" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger 
          value="data-source"
          className="text-body-sm font-medium transition-all duration-[150ms]"
        >
          Data Source
        </TabsTrigger>
        <TabsTrigger 
          value="tracked-profiles"
          className="text-body-sm font-medium transition-all duration-[150ms]"
        >
          Tracked Profiles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="data-source" className="animate-in fade-in-0 duration-300">
        <TwitterDataSourceTab zoneId={zoneId} />
      </TabsContent>

      <TabsContent value="tracked-profiles" className="animate-in fade-in-0 duration-300">
        <TwitterTrackedProfilesTab zoneId={zoneId} />
      </TabsContent>
    </Tabs>
  );
}

