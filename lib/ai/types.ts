/**
 * AI Chat Types
 * Type definitions for AI tools and chat system
 */

// Re-export ToolCallOptions from ai package
export type { ToolCallOptions } from "ai";

/**
 * Context passed to AI tools via experimental_context
 */
export interface ToolContext {
  zoneId: string;
  dataSources: {
    twitter: boolean;
    tiktok: boolean;
    media: boolean;
  };
}

/**
 * Extract ToolContext from options.experimental_context
 * Helper function to safely get context from SDK 5.x tool call options
 */
export function getToolContext(options: { experimental_context?: unknown }): ToolContext {
  const context = options.experimental_context as ToolContext | undefined;
  if (!context) {
    throw new Error("Tool context not provided");
  }
  return context;
}
