/**
 * AI Tools Utilities
 * Common helper functions for AI tools - DRY principle
 *
 * All tools should import from here instead of defining local versions.
 */

// =============================================================================
// DATE & TIME UTILITIES
// =============================================================================

/** Period string type for consistent typing across tools */
export type Period = "3h" | "6h" | "12h" | "24h" | "7d" | "30d";

/** Map of periods to hours */
const PERIOD_HOURS: Record<Period, number> = {
  "3h": 3,
  "6h": 6,
  "12h": 12,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

/**
 * Get start date from period string
 * Used by all tools for date filtering
 *
 * @param period - Time period (3h, 6h, 12h, 24h, 7d, 30d)
 * @returns Date object representing start of period
 */
export function getStartDate(period: string): Date {
  const hours = PERIOD_HOURS[period as Period] ?? 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/**
 * Get end date (now)
 */
export function getEndDate(): Date {
  return new Date();
}

/**
 * Get date range from period
 */
export function getDateRange(period: string): { startDate: Date; endDate: Date } {
  return {
    startDate: getStartDate(period),
    endDate: getEndDate(),
  };
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
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Format ISO timestamp to readable string
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toISOString();
}

// =============================================================================
// NUMBER & PERCENTAGE UTILITIES
// =============================================================================

/**
 * Calculate percentage safely (handles division by zero)
 */
export function calculatePercentage(value: number, total: number): string {
  if (total === 0) return "0";
  return ((value / total) * 100).toFixed(1);
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Safe number coercion
 */
export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  if (typeof value === "bigint") return Number(value);
  return fallback;
}

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Clean username (remove @ and lowercase)
 */
export function cleanUsername(username: string): string {
  return username.replace(/^@/, "").trim().toLowerCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Extract preview from text (first N chars, word-boundary aware)
 */
export function textPreview(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + "...";
  }
  return truncated + "...";
}

// =============================================================================
// DATA AGGREGATION UTILITIES
// =============================================================================

/**
 * Get top N items from array by key
 */
export function topN<T>(
  items: T[],
  key: keyof T,
  n: number,
  ascending = false
): T[] {
  const sorted = [...items].sort((a, b) => {
    const aVal = safeNumber(a[key]);
    const bVal = safeNumber(b[key]);
    return ascending ? aVal - bVal : bVal - aVal;
  });
  return sorted.slice(0, n);
}

/**
 * Group items by key and count
 */
export function groupByCount<T>(
  items: T[],
  keyFn: (item: T) => string
): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

// =============================================================================
// VISUALIZATION UTILITIES
// =============================================================================

/** Chart type for visualization tools */
export type ChartType = "line" | "bar" | "area";

/** Data type for visualization tools */
export type DataType = "volume" | "engagement" | "growth" | "comparison" | "ranking";

/**
 * Get display label for data type
 */
export function getDataTypeLabel(dataType: DataType): string {
  const labels: Record<DataType, string> = {
    volume: "Posts",
    engagement: "Interactions",
    growth: "Growth %",
    comparison: "Value",
    ranking: "Score",
  };
  return labels[dataType] || "Value";
}

// =============================================================================
// RESULT BUILDERS
// =============================================================================

/**
 * Build visualization result object
 */
export function buildVisualizationResult(params: {
  chartType: ChartType;
  title: string;
  data: Array<{ timestamp: string; value: number; label: string }>;
  dataType?: DataType;
}) {
  return {
    _type: "visualization" as const,
    chart_type: params.chartType,
    title: params.title,
    data: params.data,
    config: {
      timestamp: { label: "Time" },
      value: { label: getDataTypeLabel(params.dataType ?? "volume"), color: "var(--primary)" },
    },
  };
}

/**
 * Build error result for graceful degradation
 */
export function buildErrorResult(source: string, message: string) {
  return {
    [source]: {
      error: message,
      status: "unavailable",
    },
  };
}

// =============================================================================
// TOOL ERROR HANDLING
// =============================================================================

/**
 * Standard error result structure for AI tools
 * Government-grade: includes error classification and recovery hints
 */
export interface ToolErrorResult {
  success: false;
  error: {
    code: "DATA_UNAVAILABLE" | "QUERY_FAILED" | "INVALID_PARAMS" | "TIMEOUT" | "UNKNOWN";
    message: string;
    source?: string;
    recoverable: boolean;
  };
  partial_data?: Record<string, unknown>;
}

/**
 * Wrap tool execution with error handling
 * Returns partial data on failure instead of throwing
 */
export function createToolError(
  code: ToolErrorResult["error"]["code"],
  message: string,
  source?: string,
  partialData?: Record<string, unknown>
): ToolErrorResult {
  return {
    success: false,
    error: {
      code,
      message,
      source,
      recoverable: code !== "INVALID_PARAMS",
    },
    partial_data: partialData,
  };
}

/**
 * Safely execute a data fetch with error capture
 * Returns null on error (for optional platform data)
 */
export async function safeFetch<T>(
  fn: () => Promise<T>,
  fallback: T,
  source?: string
): Promise<{ data: T; error?: string }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { data: fallback, error: `${source || "Fetch"} failed: ${message}` };
  }
}

// =============================================================================
// GOVERNMENT COMPLIANCE METADATA
// =============================================================================

/**
 * Metadata for audit trail and traceability
 * Required for government-grade intelligence reports
 */
export interface ResultMetadata {
  /** ISO timestamp when data was generated */
  generated_at: string;
  /** Time period analyzed */
  period: string;
  /** Zone ID for compartmentalization audit */
  zone_id?: string;
  /** Data sources queried */
  sources_queried: string[];
  /** Total records analyzed */
  record_count?: number;
  /** Data freshness indicator */
  data_freshness: "real-time" | "recent" | "cached" | "stale";
  /** Any limitations or caveats */
  limitations?: string[];
}

/**
 * Build standard metadata for tool results
 */
export function buildResultMetadata(params: {
  period: string;
  zoneId?: string;
  sources: string[];
  recordCount?: number;
  limitations?: string[];
}): ResultMetadata {
  return {
    generated_at: new Date().toISOString(),
    period: params.period,
    zone_id: params.zoneId,
    sources_queried: params.sources,
    record_count: params.recordCount,
    data_freshness: "real-time",
    limitations: params.limitations,
  };
}

/**
 * Wrap a tool result with provenance metadata
 */
export function withProvenance<T extends Record<string, unknown>>(
  result: T,
  metadata: Partial<ResultMetadata>
): T & { _meta: ResultMetadata } {
  return {
    ...result,
    _meta: {
      generated_at: new Date().toISOString(),
      period: metadata.period || "unknown",
      sources_queried: metadata.sources_queried || [],
      data_freshness: metadata.data_freshness || "real-time",
      ...metadata,
    },
  };
}
