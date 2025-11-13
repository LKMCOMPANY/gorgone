/**
 * Centralized constants for Gorgone V2
 */

export const APP_NAME = "GORGONE";
export const APP_DESCRIPTION = "Social media monitoring platform";

// Colors
export const BRAND_COLOR = "#7550ff";

// Cache durations (in seconds)
export const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
} as const;

// Routes
export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  LOGIN: "/login",
  LOGOUT: "/logout",
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  VIEWER: "viewer",
} as const;
