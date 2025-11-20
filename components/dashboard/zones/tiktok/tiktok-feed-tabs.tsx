"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TikTokFeedContent } from "./tiktok-feed-content";
import { TikTokProfilesContent } from "./tiktok-profiles-content";

interface TikTokFeedTabsProps {
  zoneId: string;
  initialView?: string;
  initialSearch?: string;
  initialSearchType?: "keyword" | "user";
}

export function TikTokFeedTabs({ 
  zoneId, 
  initialView = "feed",
  initialSearch,
  initialSearchType,
}: TikTokFeedTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentView = searchParams.get("view") || initialView;

  const handleTabChange = (value: string) => {
    // Update URL with new view parameter (SAME AS TWITTER)
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    
    // If switching to profiles, remove search params
    if (value === "profiles") {
      params.delete("search");
      params.delete("searchType");
    }
    
    router.push(`/dashboard/zones/${zoneId}/feed?${params.toString()}`);
  };

  return (
    <Tabs value={currentView} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="feed">
          Feed
        </TabsTrigger>
        <TabsTrigger value="profiles">
          Profiles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="feed" className="mt-0">
        <TikTokFeedContent 
          zoneId={zoneId}
          initialSearch={initialSearch}
          initialSearchType={initialSearchType}
        />
      </TabsContent>

      <TabsContent value="profiles" className="mt-0">
        <TikTokProfilesContent 
          zoneId={zoneId}
          initialSearch={initialSearch}
        />
      </TabsContent>
    </Tabs>
  );
}

