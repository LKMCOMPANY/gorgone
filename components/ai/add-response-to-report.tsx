"use client";

/**
 * Add Response to Report Button
 * Inserts an entire AI response (text + all components) into the active report
 * User can then edit or delete individual elements in the Tiptap editor
 * 
 * Supports:
 * - Text content (parsed to headings, paragraphs, lists)
 * - Charts/Visualizations
 * - Tweet cards
 * - TikTok videos
 * - Article cards
 * - Account cards
 * - Complete Opinion Reports (with clusters, analysis, tweets)
 */

import * as React from "react";
import type { JSONContent } from "@tiptap/core";
import { FileText, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportEditorSafe } from "@/lib/contexts/report-editor-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OpinionReportData } from "@/components/ui/opinion-report-view";

// ============================================================================
// Types for AI Response Content
// ============================================================================

interface TweetData {
  tweet_id: string;
  text: string;
  author_username: string;
  author_name: string;
  author_verified?: boolean;
  author_profile_picture_url?: string | null;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    views: number;
  };
  tweet_url?: string;
}

interface TikTokData {
  video_id: string;
  description: string;
  author_username: string;
  author_nickname: string;
  author_verified?: boolean;
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  video_url: string;
}

interface ArticleData {
  article_id: string;
  title: string;
  source: string;
  body_preview?: string;
  sentiment?: number | null;
  social_score?: number | null;
  published_at?: string;
  url: string;
}

interface AccountData {
  platform: "twitter" | "tiktok";
  username: string;
  name: string;
  nickname?: string;
  verified?: boolean;
  followers?: number;
  avatar_url?: string | null;
  stats?: {
    post_count: number;
    total_engagement: number;
    avg_engagement: number;
    total_views?: number;
  };
  profile_url?: string;
}

interface ChartData {
  type: "line" | "bar" | "area";
  title: string;
  data: Array<{ timestamp: string; value: number; label: string }>;
  config: Record<string, { label: string; color?: string }>;
}

export interface ResponseContent {
  /** Text content from the AI response */
  text?: string;
  /** Charts/visualizations */
  charts?: ChartData[];
  /** Tweets */
  tweets?: TweetData[];
  /** TikTok videos */
  tiktoks?: TikTokData[];
  /** Articles */
  articles?: ArticleData[];
  /** Accounts */
  accounts?: AccountData[];
  /** Complete Opinion Report (with clusters, analysis, representative tweets) */
  opinionReport?: OpinionReportData;
}

// ============================================================================
// Component
// ============================================================================

interface AddResponseToReportProps {
  /** All content from the AI response */
  content: ResponseContent;
  /** Custom class name */
  className?: string;
}

export function AddResponseToReport({
  content,
  className,
}: AddResponseToReportProps) {
  const reportContext = useReportEditorSafe();
  const [isAdding, setIsAdding] = React.useState(false);
  const [added, setAdded] = React.useState(false);

  // Don't render if no report is active
  if (!reportContext?.isReportActive) {
    return null;
  }

  // Check if there's any content to add
  const hasContent =
    content.text ||
    content.opinionReport ||
    (content.charts && content.charts.length > 0) ||
    (content.tweets && content.tweets.length > 0) ||
    (content.tiktoks && content.tiktoks.length > 0) ||
    (content.articles && content.articles.length > 0) ||
    (content.accounts && content.accounts.length > 0);

  if (!hasContent) {
    return null;
  }

  const handleClick = async () => {
    if (!reportContext) return;

    setIsAdding(true);

    try {
      const nodes: JSONContent[] = [];

      // 1. Add text content as paragraphs/headings
      if (content.text) {
        const textNodes = parseTextToNodes(content.text);
        nodes.push(...textNodes);
      }

      // 2. Add charts
      // IMPORTANT: All complex attrs must be stringified for Tiptap JSON serialization
      if (content.charts && content.charts.length > 0) {
        for (const chart of content.charts) {
          nodes.push({
            type: "chartNode",
            attrs: { chartData: JSON.stringify(chart) },
          });
          nodes.push({ type: "paragraph" });
        }
      }

      // 3. Add tweets
      if (content.tweets && content.tweets.length > 0) {
        for (const tweet of content.tweets) {
          nodes.push({
            type: "tweetNode",
            attrs: { tweet: JSON.stringify(tweet) },
          });
        }
        nodes.push({ type: "paragraph" });
      }

      // 4. Add TikTok videos
      if (content.tiktoks && content.tiktoks.length > 0) {
        for (const video of content.tiktoks) {
          nodes.push({
            type: "tiktokNode",
            attrs: { video: JSON.stringify(video) },
          });
        }
        nodes.push({ type: "paragraph" });
      }

      // 5. Add articles
      if (content.articles && content.articles.length > 0) {
        for (const article of content.articles) {
          nodes.push({
            type: "articleNode",
            attrs: { article: JSON.stringify(article) },
          });
        }
        nodes.push({ type: "paragraph" });
      }

      // 6. Add accounts
      if (content.accounts && content.accounts.length > 0) {
        for (const account of content.accounts) {
          nodes.push({
            type: "accountNode",
            attrs: { account: JSON.stringify(account) },
          });
        }
        nodes.push({ type: "paragraph" });
      }

      // 7. Add complete Opinion Report (with clusters, analysis, tweets)
      if (content.opinionReport) {
        nodes.push({
          type: "opinionReportNode",
          attrs: { reportData: JSON.stringify(content.opinionReport) },
        });
        nodes.push({ type: "paragraph" });
      }

      // Insert all content
      const success = reportContext.insertContent(nodes);

      if (success) {
        setAdded(true);
        toast.success(`Added to "${reportContext.reportTitle}"`, {
          description: "You can now edit or remove any element",
        });
        // Reset after 3 seconds
        setTimeout(() => setAdded(false), 3000);
      } else {
        toast.error("Failed to add content to report");
      }
    } catch (error) {
      console.error("Error adding response to report:", error);
      toast.error("Failed to add content");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isAdding || added}
      className={cn(
        "gap-1.5 text-xs transition-all",
        added && "border-[var(--tactical-green)] text-[var(--tactical-green)] bg-[var(--tactical-green)]/5",
        className
      )}
    >
      {isAdding ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Adding...
        </>
      ) : added ? (
        <>
          <Check className="size-3.5" />
          Added to Report
        </>
      ) : (
        <>
          <FileText className="size-3.5" />
          Add to Report
        </>
      )}
    </Button>
  );
}

// ============================================================================
// Helper: Parse text to Tiptap nodes
// ============================================================================

function parseTextToNodes(text: string): JSONContent[] {
  const nodes: JSONContent[] = [];
  const lines = text.split("\n");

  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join(" ").trim();
      if (content) {
        nodes.push({
          type: "paragraph",
          content: [{ type: "text", text: content }],
        });
      }
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line = end of paragraph
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      nodes.push({
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: trimmed.slice(4) }],
      });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      nodes.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: trimmed.slice(3) }],
      });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushParagraph();
      nodes.push({
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: trimmed.slice(2) }],
      });
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      nodes.push({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: trimmed.slice(2) }],
              },
            ],
          },
        ],
      });
      continue;
    }

    // Regular text - accumulate
    currentParagraph.push(trimmed);
  }

  // Flush remaining paragraph
  flushParagraph();

  return nodes;
}

