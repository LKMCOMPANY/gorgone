/**
 * AI Tools Utilities
 * Common helper functions to avoid duplication
 */

/**
 * Get start date from period string
 * Used by all tools for date filtering
 */
export function getStartDate(period: string): Date {
  const hours: Record<string, number> = {
    "3h": 3,
    "6h": 6,
    "12h": 12,
    "24h": 24,
    "7d": 168,
    "30d": 720,
  };
  return new Date(Date.now() - (hours[period] || 24) * 60 * 60 * 1000);
}

/**
 * Format timestamp for chart display (HH:MM)
 */
export function formatChartTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Format date for chart display (MMM DD)
 */
export function formatChartDate(timestamp: string): string {
  const date = new Date(timestamp);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Calculate percentage safely
 */
export function calculatePercentage(value: number, total: number): string {
  if (total === 0) return "0";
  return ((value / total) * 100).toFixed(1);
}

/**
 * Clean username (remove @ and lowercase)
 */
export function cleanUsername(username: string): string {
  return username.replace("@", "").trim().toLowerCase();
}

