/**
 * AI Chat Types
 * Type definitions for AI tools and chat system
 */

export interface ToolContext {
  zoneId: string;
  dataSources: {
    twitter: boolean;
    tiktok: boolean;
    media: boolean;
  };
}

