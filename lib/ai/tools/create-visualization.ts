/**
 * AI Tool: Create Visualization
 * Generates chart data for visual representation
 */

import { tool } from "ai";
import { z } from "zod";
import {
  getHourlyVolumeTrend,
  getTikTokHourlyVolumeTrend,
  getMediaDailyVolumeTrend,
} from "@/lib/data/twitter/volume-analytics";
import { logger } from "@/lib/logger";
import type { ToolContext } from "@/lib/ai/types";

export const createVisualizationTool = tool({
  description: `Create a visual chart to display data trends and statistics.

Use this tool when the user asks for:
- "Show me a chart of..." (trends, rankings, comparisons)
- "Visualize the trend..." (time series)
- "Graph the engagement over time" (temporal data)
- "Chart the top accounts" (rankings)
- "Compare X vs Y" (bar chart comparison)

You can use this tool in two ways:
1. Auto-fetch data: Set data_type (volume/engagement) and period
2. Custom data: Provide custom_data array with {label, value} for rankings/comparisons

This tool renders professional Recharts with clean labels, tooltips, and responsive layout.
Use this instead of creating manual SVG for bar/line/area charts.`,

  parameters: z.object({
    chart_type: z
      .enum(["line", "bar", "area"])
      .describe("Type of chart to create"),
    title: z.string().describe("Chart title"),
    data_type: z
      .enum(["volume", "engagement", "growth", "comparison", "ranking"])
      .describe("What data to visualize"),
    custom_data: z
      .array(
        z.object({
          label: z.string(),
          value: z.number(),
        })
      )
      .optional()
      .describe("Custom data points for ranking/comparison charts"),
    period: z
      .enum(["3h", "6h", "12h", "24h", "7d", "30d"])
      .default("24h")
      .describe("Time period"),
  }),

  execute: async (
    { chart_type, title, data_type, period, custom_data },
    context: any
  ) => {
    try {
      logger.info(`[AI Tool] create_visualization called`, {
        chart_type,
        title,
        data_type,
        period,
        has_custom_data: !!custom_data,
      });

      const { zoneId, dataSources } = context;
      const startDate = getStartDate(period);
      const endDate = new Date();

      let chartData: any[] = [];

      // If custom data provided (for rankings/comparisons)
      if (custom_data && custom_data.length > 0) {
        chartData = custom_data.map((item) => ({
          timestamp: item.label,
          value: item.value,
          label: item.label,
        }));
        
        return {
          _type: "visualization",
          chart_type,
          title,
          data: chartData,
          config: {
            timestamp: {
              label: "Category",
            },
            value: {
              label: getValueLabel(data_type),
              color: "var(--primary)",
            },
          },
        };
      }

      // Twitter data
      if (dataSources.twitter) {
        try {
          const twitterData = await getHourlyVolumeTrend(zoneId, startDate, endDate);
          
          for (const point of twitterData) {
            chartData.push({
              timestamp: formatTimestamp(point.timestamp),
              value:
                data_type === "volume"
                  ? point.tweet_count
                  : point.total_engagement,
              label: "Twitter",
            });
          }
        } catch (error) {
          logger.error("Twitter volume data failed:", error);
        }
      }

      // TikTok data
      if (dataSources.tiktok) {
        try {
          const tiktokData = await getTikTokHourlyVolumeTrend(
            zoneId,
            startDate,
            endDate
          );

          // Merge with Twitter data or add separately
          if (chartData.length === 0) {
            for (const point of tiktokData) {
              chartData.push({
                timestamp: formatTimestamp(point.timestamp),
                value:
                  data_type === "volume"
                    ? point.tweet_count
                    : point.total_engagement,
                label: "TikTok",
              });
            }
          }
        } catch (error) {
          logger.error("TikTok volume data failed:", error);
        }
      }

      // Media data (daily, not hourly)
      if (dataSources.media && chartData.length === 0) {
        try {
          const mediaData = await getMediaDailyVolumeTrend(
            zoneId,
            startDate,
            endDate
          );

          for (const point of mediaData) {
            chartData.push({
              timestamp: formatTimestamp(point.timestamp),
              value:
                data_type === "volume"
                  ? point.tweet_count
                  : point.total_engagement,
              label: "Media",
            });
          }
        } catch (error) {
          logger.error("Media volume data failed:", error);
        }
      }

      return {
        _type: "visualization",
        chart_type,
        title,
        data: chartData,
        config: {
          timestamp: {
            label: "Time",
          },
          value: {
            label: getValueLabel(data_type),
            color: "var(--primary)",
          },
        },
      };
    } catch (error) {
      logger.error("[AI Tool] create_visualization error", { error });
      throw new Error("Failed to create visualization");
    }
  },
});

// Helper functions
function getStartDate(period: string): Date {
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

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getValueLabel(dataType: string): string {
  const labels: Record<string, string> = {
    volume: "Posts",
    engagement: "Interactions",
    growth: "Growth %",
    comparison: "Value",
    ranking: "Score",
  };
  return labels[dataType] || "Value";
}

