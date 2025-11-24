/**
 * Configuration and helpers for Upstash Redis
 */

import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { CACHE_DURATION } from "@/lib/constants";

/**
 * Upstash Redis client instance
 */
export const redis = new Redis({
  url: env.redis.url,
  token: env.redis.token,
});

/**
 * Get a value from cache
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    return value as T | null;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

/**
 * Store a value in cache
 */
export async function setCached<T>(
  key: string,
  value: T,
  duration: number = CACHE_DURATION.MEDIUM
): Promise<void> {
  try {
    await redis.setex(key, duration, JSON.stringify(value));
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

/**
 * Invalidate a cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Redis delete error:", error);
  }
}
