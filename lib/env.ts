/**
 * Environment variables validation and type-safe access
 */

export const env = {
  // App
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",

  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  // Upstash Redis
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  },

  // QStash
  qstash: {
    url: process.env.QSTASH_URL || "https://qstash.upstash.io",
    token: process.env.QSTASH_TOKEN || "",
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
  },

  // Twitter API (twitterapi.io)
  twitter: {
    apiKey: process.env.TWITTER_API_KEY || "",
  },
} as const;

/**
 * Check if we're in production
 */
export const isProduction = env.nodeEnv === "production";

/**
 * Check if we're in development
 */
export const isDevelopment = env.nodeEnv === "development";

/**
 * Validate required environment variables
 */
export function validateEnv() {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: env.supabase.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.supabase.anonKey,
  };

  const optional = {
    TWITTER_API_KEY: env.twitter.apiKey,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0 && isProduction) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Warn about missing optional variables
  const missingOptional = Object.entries(optional)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingOptional.length > 0 && isDevelopment) {
    console.warn(
      `⚠️  Missing optional environment variables: ${missingOptional.join(", ")}`
    );
  }

  return true;
}
