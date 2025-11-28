import { createClient } from "@/lib/supabase/server";
import type { 
  AttilaOperation, 
  AttilaOperationConfig, 
  AttilaOperationType, 
  AttilaOperationStatus,
  TwitterTweetWithProfile 
} from "@/types";

export async function getOperations(zoneId: string): Promise<AttilaOperation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attila_operations")
    .select("*")
    .eq("zone_id", zoneId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching Attila operations:", error);
    return [];
  }

  return data as AttilaOperation[];
}

export async function getOperationById(id: string): Promise<AttilaOperation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attila_operations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching Attila operation ${id}:`, error);
    return null;
  }

  return data as AttilaOperation;
}

export async function createOperation(
  zoneId: string,
  name: string,
  type: AttilaOperationType,
  config: AttilaOperationConfig,
  userId: string
): Promise<AttilaOperation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attila_operations")
    .insert({
      zone_id: zoneId,
      name,
      type,
      config: config as any, // JSONB casting
      status: "draft",
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating Attila operation:", error);
    throw new Error(error.message);
  }

  return data as AttilaOperation;
}

export async function updateOperation(
  id: string,
  updates: Partial<AttilaOperation>
): Promise<AttilaOperation | null> {
  const supabase = await createClient();

  // Filter out fields that shouldn't be updated directly or don't exist in table
  const { id: _, created_at, updated_at, ...validUpdates } = updates;

  const { data, error } = await supabase
    .from("attila_operations")
    .update(validUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating Attila operation ${id}:`, error);
    throw new Error(error.message);
  }

  return data as AttilaOperation;
}

export async function deleteOperation(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("attila_operations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`Error deleting Attila operation ${id}:`, error);
    return false;
  }

  return true;
}

export interface AttilaThread {
  target: TwitterTweetWithProfile | null;
  responses: TwitterTweetWithProfile[];
}

export async function getAttilaActivity(zoneId: string): Promise<AttilaThread[]> {
  const supabase = await createClient();

  // 1. Get Attila Profile IDs for this zone
  const { data: tags, error: tagsError } = await supabase
    .from("twitter_profile_zone_tags")
    .select("profile_id")
    .eq("zone_id", zoneId)
    .eq("tag_type", "attila");

  if (tagsError || !tags || tags.length === 0) {
    return [];
  }

  const attilaIds = tags.map(t => t.profile_id);

  // 2. Get Tweets from these profiles (Responses)
  const { data: responses, error: responsesError } = await supabase
    .from("twitter_tweets")
    .select(`
      *,
      author:author_profile_id(*, raw_data)
    `)
    .in("author_profile_id", attilaIds)
    .eq("zone_id", zoneId)
    .order("twitter_created_at", { ascending: false })
    .limit(50);

  if (responsesError || !responses) {
    return [];
  }

  // 3. Get Target Tweets (Parents)
  const targetIds = responses
    .map(r => r.in_reply_to_tweet_id)
    .filter((id): id is string => !!id);

  // Using a Map to group responses by target ID (or 'orphan' for no target)
  const threadMap = new Map<string, AttilaThread>();

  // Initialize map with known targets
  if (targetIds.length > 0) {
    const { data: targets, error: targetsError } = await supabase
      .from("twitter_tweets")
      .select(`
        *,
        author:author_profile_id(*, raw_data)
      `)
      .in("tweet_id", targetIds)
      .eq("zone_id", zoneId);

    if (!targetsError && targets) {
      targets.forEach(target => {
        threadMap.set(target.tweet_id, {
          target: target as unknown as TwitterTweetWithProfile,
          responses: []
        });
      });
    }
  }

  // Group responses
  responses.forEach(response => {
    const parentId = response.in_reply_to_tweet_id;
    const tweet = response as unknown as TwitterTweetWithProfile;

    if (parentId && threadMap.has(parentId)) {
      // Add to existing thread
      threadMap.get(parentId)!.responses.push(tweet);
    } else {
      // Treat as thread without visible target (or original post by Attila)
      // Use the response's own ID as key to ensure uniqueness for orphans
      threadMap.set(response.tweet_id, {
        target: null,
        responses: [tweet]
      });
    }
  });

  return Array.from(threadMap.values());
}
