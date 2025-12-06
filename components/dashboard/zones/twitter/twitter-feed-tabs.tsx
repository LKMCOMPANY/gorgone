"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TwitterFeedContent } from "./twitter-feed-content";
import { TwitterProfilesContent } from "./twitter-profiles-content";

interface TwitterFeedTabsProps {
  zoneId: string;
  initialView?: string;
  initialSearch?: string;
  initialSearchType?: "keyword" | "user";
}

export function TwitterFeedTabs({ 
  zoneId, 
  initialView = "feed",
  initialSearch,
  initialSearchType,
}: TwitterFeedTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentView = searchParams.get("view") || initialView;

  const handleTabChange = (value: string) => {
    // Update URL with new view parameter
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
    <Tabs value={currentView} onValueChange={handleTabChange} className="w-full space-y-6">
      <TabsList className="w-full sm:w-auto h-10 bg-muted/50 p-1">
        <TabsTrigger value="feed" className="text-sm font-medium transition-all duration-[var(--transition-fast)] data-[state=active]:shadow-sm">
          Feed
        </TabsTrigger>
        <TabsTrigger value="profiles" className="text-sm font-medium transition-all duration-[var(--transition-fast)] data-[state=active]:shadow-sm">
          Profiles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="feed" className="mt-0">
        <TwitterFeedContent 
          zoneId={zoneId}
          initialSearch={initialSearch}
          initialSearchType={initialSearchType}
        />
      </TabsContent>

      <TabsContent value="profiles" className="mt-0">
        <TwitterProfilesContent 
          zoneId={zoneId}
          initialSearch={initialSearch}
        />
      </TabsContent>
    </Tabs>
  );
}

