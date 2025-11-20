/**
 * TikAPI.io Client
 * Handles all communication with TikTok API
 */

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const TIKTOK_API_BASE_URL = "https://api.tikapi.io";

/**
 * Base fetch wrapper with error handling
 */
async function tikApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${TIKTOK_API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "X-API-Key": env.tiktok.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `TikAPI.io error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    logger.error(`TikAPI.io request failed:`, error);
    throw error;
  }
}

/**
 * TikTok API Response Types
 */
export interface TikTokAPIResponse<T> {
  status: string;
  statusCode: number;
  message?: string;
  data?: T;
  hasMore?: boolean;
  cursor?: string;
  nextCursor?: string;
}

export interface TikTokVideo {
  id: string;
  desc: string;
  createTime: number;
  author: TikTokUser;
  video: {
    duration: number;
    height: number;
    width: number;
    cover: string;
    dynamicCover?: string;
    playAddr?: string;
    downloadAddr?: string;
  };
  stats: {
    playCount: number;
    diggCount: number;
    commentCount: number;
    shareCount: number;
    collectCount: number;
  };
  challenges?: Array<{
    id: string;
    title: string;
    desc?: string;
    isCommerce?: boolean;
  }>;
  music?: {
    id: string;
    title: string;
    authorName: string;
    duration: number;
  };
  textExtra?: Array<{
    hashtagName?: string;
    userId?: string;
  }>;
  isAd?: boolean;
  shareUrl?: string;
  locationCreated?: string;
}

export interface TikTokUser {
  id: string;
  uniqueId: string;
  nickname: string;
  avatarThumb: string;
  avatarMedium: string;
  avatarLarger: string;
  signature: string;
  verified: boolean;
  secUid: string;
  privateAccount: boolean;
  region?: string;
  language?: string;
}

export interface TikTokUserInfo {
  user: TikTokUser;
  stats: {
    followerCount: number;
    followingCount: number;
    heart: number;
    heartCount: number;
    videoCount: number;
    diggCount: number;
  };
}

/**
 * Get user profile information
 */
export async function getUserByUsername(
  username: string,
  country?: string
): Promise<TikTokUserInfo | null> {
  try {
    const params = new URLSearchParams({ username });
    if (country) {
      params.append("country", country);
    }

    const endpoint = `/public/check?${params.toString()}`;

    const data = await tikApiFetch<{
      userInfo?: TikTokUserInfo;
      status: string;
    }>(endpoint, {
      method: "GET",
    });

    return data.userInfo || null;
  } catch (error) {
    logger.error(`Error fetching user ${username}:`, error);
    return null;
  }
}

/**
 * Get user's posts
 */
export async function getUserPosts(params: {
  secUid: string;
  count?: number;
  cursor?: string;
  country?: string;
}): Promise<{
  videos: TikTokVideo[];
  cursor?: string;
  hasMore: boolean;
}> {
  try {
    const queryParams = new URLSearchParams({
      secUid: params.secUid,
      count: (params.count || 30).toString(),
    });

    if (params.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params.country) {
      queryParams.append("country", params.country);
    }

    const endpoint = `/public/posts?${queryParams.toString()}`;

    const data = await tikApiFetch<{
      itemList?: TikTokVideo[];
      cursor?: string;
      hasMore?: boolean;
    }>(endpoint, {
      method: "GET",
    });

    return {
      videos: data.itemList || [],
      cursor: data.cursor,
      hasMore: data.hasMore || false,
    };
  } catch (error) {
    logger.error(`Error fetching user posts:`, error);
    return { videos: [], hasMore: false };
  }
}

/**
 * Search videos by keyword
 */
export async function searchVideos(params: {
  query: string;
  nextCursor?: string;
  country?: string;
}): Promise<{
  videos: TikTokVideo[];
  nextCursor?: string;
  hasMore: boolean;
}> {
  try {
    const queryParams = new URLSearchParams({
      query: params.query,
    });

    if (params.nextCursor) {
      queryParams.append("nextCursor", params.nextCursor);
    }
    if (params.country) {
      queryParams.append("country", params.country);
    }

    const endpoint = `/public/search/general?${queryParams.toString()}`;

    const data = await tikApiFetch<{
      data?: Array<{ item: TikTokVideo }>;
      nextCursor?: string;
      has_more?: number;
    }>(endpoint, {
      method: "GET",
    });

    const videos = data.data?.map((result) => result.item).filter(Boolean) || [];

    return {
      videos,
      nextCursor: data.nextCursor,
      hasMore: data.has_more === 1,
    };
  } catch (error) {
    logger.error(`Error searching videos:`, error);
    return { videos: [], hasMore: false };
  }
}

/**
 * Get hashtag posts
 */
export async function getHashtagPosts(params: {
  name?: string;
  id?: string;
  count?: number;
  cursor?: string;
  country?: string;
}): Promise<{
  videos: TikTokVideo[];
  cursor?: string;
  hasMore: boolean;
  hashtagInfo?: {
    id: string;
    title: string;
    desc?: string;
    stats?: {
      viewCount: number;
      videoCount: number;
    };
  };
}> {
  try {
    const queryParams = new URLSearchParams({
      count: (params.count || 30).toString(),
    });

    if (params.name) {
      queryParams.append("name", params.name);
    }
    if (params.id) {
      queryParams.append("id", params.id);
    }
    if (params.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params.country) {
      queryParams.append("country", params.country);
    }

    const endpoint = `/public/hashtag?${queryParams.toString()}`;

    const data = await tikApiFetch<{
      itemList?: TikTokVideo[];
      cursor?: string;
      hasMore?: boolean;
      challengeInfo?: {
        challenge: {
          id: string;
          title: string;
          desc?: string;
          stats?: {
            viewCount: number;
            videoCount: number;
          };
        };
      };
    }>(endpoint, {
      method: "GET",
    });

    return {
      videos: data.itemList || [],
      cursor: data.cursor,
      hasMore: data.hasMore || false,
      hashtagInfo: data.challengeInfo?.challenge,
    };
  } catch (error) {
    logger.error(`Error fetching hashtag posts:`, error);
    return { videos: [], hasMore: false };
  }
}

/**
 * Get video by ID
 */
export async function getVideoById(
  videoId: string,
  country?: string
): Promise<TikTokVideo | null> {
  try {
    const params = new URLSearchParams({ id: videoId });
    if (country) {
      params.append("country", country);
    }

    const endpoint = `/public/video?${params.toString()}`;

    const data = await tikApiFetch<{
      itemInfo?: {
        itemStruct: TikTokVideo;
      };
    }>(endpoint, {
      method: "GET",
    });

    return data.itemInfo?.itemStruct || null;
  } catch (error) {
    logger.error(`Error fetching video ${videoId}:`, error);
    return null;
  }
}

/**
 * Test API connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Try a simple search to test connectivity
    await searchVideos({
      query: "test",
    });

    logger.info("TikAPI.io connection test successful");
    return true;
  } catch (error) {
    logger.error("TikAPI.io connection test failed:", error);
    return false;
  }
}

