/**
 * AI Tool: Create Visualization
 * Generates chart data for visual representation
 */

import { type Tool, type ToolCallOptions, zodSchema } from "ai";
import { z } from "zod";
import {
  getHourlyVolumeTrend,
  getTikTokHourlyVolumeTrend,
  getMediaDailyVolumeTrend,
} from "@/lib/data/twitter/volume-analytics";
import { logger } from "@/lib/logger";
import { getToolContext } from "@/lib/ai/types";
import {
  getStartDate,
  formatChartTimestamp,
  getDataTypeLabel,
  type DataType,
} from "@/lib/ai/utils";

const parametersSchema = z.object({
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
});

type Parameters = z.infer<typeof parametersSchema>;
type Output = Record<string, unknown>;

export const createVisualizationTool: Tool<Parameters, Output> = {
  description:
    "Generate interactive charts (line, bar, or area) for volume trends, engagement evolution, or comparisons. Use when users ask for 'show me a graph', 'chart of activity', or 'visualize the trend'. Returns structured data rendered as Recharts component.",

  inputSchema: zodSchema(parametersSchema),

  execute: async (
    { chart_type, title, data_type, period, custom_data },
    options: ToolCallOptions
  ): Promise<Output> => {
    const { zoneId, dataSources } = getToolContext(options);
    try {
      logger.info(`[AI Tool] create_visualization called`, {
        chart_type,
        title,
        data_type,
        period,
        has_custom_data: !!custom_data,
      });

      const startDate = getStartDate(period);
      const endDate = new Date();

      let chartData: Array<{
        timestamp: string;
        value: number;
        label: string;
      }> = [];

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
            timestamp: { label: "Category" },
            value: { label: getDataTypeLabel(data_type as DataType), color: "var(--primary)" },
          },
        };
      }

      if (dataSources.twitter) {
        try {
          const twitterData = await getHourlyVolumeTrend(zoneId, startDate, endDate);

          for (const point of twitterData) {
            chartData.push({
              timestamp: formatChartTimestamp(point.timestamp),
              value: data_type === "volume" ? point.tweet_count : point.total_engagement,
              label: "Twitter",
            });
          }
        } catch (error) {
          logger.error("Twitter volume data failed:", error);
        }
      }

      if (dataSources.tiktok) {
        try {
          const tiktokData = await getTikTokHourlyVolumeTrend(zoneId, startDate, endDate);

          if (chartData.length === 0) {
            for (const point of tiktokData) {
              chartData.push({
                timestamp: formatChartTimestamp(point.timestamp),
                value: data_type === "volume" ? point.tweet_count : point.total_engagement,
                label: "TikTok",
              });
            }
          }
        } catch (error) {
          logger.error("TikTok volume data failed:", error);
        }
      }

      if (dataSources.media && chartData.length === 0) {
        try {
          const mediaData = await getMediaDailyVolumeTrend(zoneId, startDate, endDate);

          for (const point of mediaData) {
            chartData.push({
              timestamp: formatChartTimestamp(point.timestamp),
              value: data_type === "volume" ? point.tweet_count : point.total_engagement,
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
          timestamp: { label: "Time" },
          value: { label: getDataTypeLabel(data_type as DataType), color: "var(--primary)" },
        },
      };
    } catch (error) {
      logger.error("[AI Tool] create_visualization error", { error });
      return {
        _type: "visualization",
        chart_type,
        title,
        data: [],
        error: "Failed to retrieve data for visualization",
        config: {
          timestamp: { label: "Time" },
          value: { label: "Value", color: "var(--primary)" },
        },
      };
    }
  },
};

// Local helpers removed - using shared utilities from @/lib/ai/utils
