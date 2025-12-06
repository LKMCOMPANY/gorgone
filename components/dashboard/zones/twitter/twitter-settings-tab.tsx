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
 * Follows design system and best practices for responsive UX
 */
export function TwitterSettingsTab({ zoneId }: TwitterSettingsTabProps) {
  return (
    <Tabs defaultValue="data-source" className="w-full space-y-6">
      <TabsList className="w-full sm:w-auto h-10 bg-muted/50 p-1">
        <TabsTrigger 
          value="data-source"
          className="text-sm font-medium transition-all duration-[var(--transition-fast)] data-[state=active]:shadow-sm"
        >
          Data Source
        </TabsTrigger>
        <TabsTrigger 
          value="tracked-profiles"
          className="text-sm font-medium transition-all duration-[var(--transition-fast)] data-[state=active]:shadow-sm"
        >
          Tracked Profiles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="data-source" className="animate-in fade-in-0 duration-300 mt-0">
        <TwitterDataSourceTab zoneId={zoneId} />
      </TabsContent>

      <TabsContent value="tracked-profiles" className="animate-in fade-in-0 duration-300 mt-0">
        <TwitterTrackedProfilesTab zoneId={zoneId} />
      </TabsContent>
    </Tabs>
  );
}

