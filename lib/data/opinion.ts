import { createClient } from "@/lib/supabase/server";
import type { TwitterOpinionCluster } from "@/types";

export async function getOpinionClusters(zoneId: string): Promise<TwitterOpinionCluster[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("twitter_opinion_clusters")
    .select("*")
    .eq("zone_id", zoneId)
    .order("tweet_count", { ascending: false });

  if (error) {
    console.error("Error fetching opinion clusters:", error);
    return [];
  }

  return data as TwitterOpinionCluster[];
}

