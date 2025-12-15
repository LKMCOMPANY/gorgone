"use client";

import * as React from "react";
import { type Editor } from "@tiptap/react";
import {
  BarChart3,
  LineChart,
  AreaChart,
  Sparkles,
  TrendingUp,
  Users,
  Twitter,
  Video,
  Newspaper,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useGlobalChat } from "@/lib/contexts/global-chat-context";
import { QUICK_ACTIONS } from "@/components/dashboard/chat/chat-quick-actions";
import type { ChartNodeAttributes, StatsCardNodeAttributes } from "./extensions/types";

interface ReportLibraryPanelProps {
  zoneId: string;
  editor: Editor | null;
  onOpenPicker?: (type: "tweet" | "tiktok" | "article" | "account") => void;
  className?: string;
}

const CHART_TEMPLATES = [
  {
    id: "volume-trend",
    title: "Volume Trend",
    description: "Show post volume over time",
    icon: LineChart,
    chartType: "line" as const,
  },
  {
    id: "engagement-bar",
    title: "Engagement Distribution",
    description: "Compare engagement metrics",
    icon: BarChart3,
    chartType: "bar" as const,
  },
  {
    id: "activity-area",
    title: "Activity Overview",
    description: "Activity with area visualization",
    icon: AreaChart,
    chartType: "area" as const,
  },
];

const EMBED_TYPES = [
  {
    id: "tweet",
    title: "Tweet",
    description: "Embed a tweet card",
    icon: Twitter,
  },
  {
    id: "tiktok",
    title: "TikTok Video",
    description: "Embed a TikTok video",
    icon: Video,
  },
  {
    id: "article",
    title: "Article",
    description: "Embed a media article",
    icon: Newspaper,
  },
  {
    id: "account",
    title: "Account Card",
    description: "Embed an influencer card",
    icon: Users,
  },
];

export function ReportLibraryPanel({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  zoneId,
  editor,
  onOpenPicker,
  className,
}: ReportLibraryPanelProps) {
  const { openWithPrompt } = useGlobalChat();
  const [openSections, setOpenSections] = React.useState({
    charts: true,
    ai: true,
    embeds: true,
  });

  // Insert chart node into editor
  const handleInsertChart = (template: (typeof CHART_TEMPLATES)[0]) => {
    if (!editor) return;

    // Create sample chart data (in production, this would come from AI or zone data)
    const chartAttrs: ChartNodeAttributes = {
      type: template.chartType,
      title: template.title,
      data: [
        { timestamp: "Mon", value: 120, label: "Posts" },
        { timestamp: "Tue", value: 180, label: "Posts" },
        { timestamp: "Wed", value: 150, label: "Posts" },
        { timestamp: "Thu", value: 210, label: "Posts" },
        { timestamp: "Fri", value: 190, label: "Posts" },
        { timestamp: "Sat", value: 140, label: "Posts" },
        { timestamp: "Sun", value: 160, label: "Posts" },
      ],
      config: {
        timestamp: { label: "Day" },
        value: { label: "Posts", color: "var(--primary)" },
      },
    };

    // Data must be stringified for proper Tiptap JSON serialization
    editor
      .chain()
      .focus()
      .insertContent({
        type: "chartNode",
        attrs: { chartData: JSON.stringify(chartAttrs) },
      })
      .run();
  };

  // Insert stats card node
  const handleInsertStats = () => {
    if (!editor) return;

    const statsAttrs: StatsCardNodeAttributes = {
      title: "Key Metrics",
      period: "Last 7 days",
      stats: [
        { label: "Total Posts", value: 1234, change: 12, trend: "up" },
        { label: "Engagement", value: "45.2K", change: 8, trend: "up" },
        { label: "Accounts", value: 89, change: -3, trend: "down" },
        { label: "Reach", value: "2.1M", trend: "neutral" },
      ],
    };

    // Data must be stringified for proper Tiptap JSON serialization
    editor
      .chain()
      .focus()
      .insertContent({
        type: "statsNode",
        attrs: { statsData: JSON.stringify(statsAttrs) },
      })
      .run();
  };

  const embedHandlers: Record<string, () => void> = {
    tweet: () => onOpenPicker?.("tweet"),
    tiktok: () => onOpenPicker?.("tiktok"),
    article: () => onOpenPicker?.("article"),
    account: () => onOpenPicker?.("account"),
  };

  return (
    <Card className={cn("p-4 h-full flex flex-col", className)}>
      <div className="mb-4">
        <h3 className="font-semibold text-sm mb-1">Library</h3>
        <p className="text-xs text-muted-foreground">
          Insert charts, content and AI analysis
        </p>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-4">
          {/* Charts Section */}
          <Collapsible
            open={openSections.charts}
            onOpenChange={(open) =>
              setOpenSections((prev) => ({ ...prev, charts: open }))
            }
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  openSections.charts && "rotate-90"
                )}
              />
              <BarChart3 className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Charts & Stats
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid gap-2">
                {CHART_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2.5 px-3"
                    onClick={() => handleInsertChart(template)}
                    disabled={!editor}
                  >
                    <template.icon className="size-4 mr-2 shrink-0 text-primary" />
                    <div className="text-left min-w-0">
                      <div className="font-medium text-xs">{template.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {template.description}
                      </div>
                    </div>
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2.5 px-3"
                  onClick={handleInsertStats}
                  disabled={!editor}
                >
                  <TrendingUp className="size-4 mr-2 shrink-0 text-primary" />
                  <div className="text-left min-w-0">
                    <div className="font-medium text-xs">Stats Card</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      Key metrics with trends
                    </div>
                  </div>
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* AI Content Section - Uses same QUICK_ACTIONS as chat */}
          <Collapsible
            open={openSections.ai}
            onOpenChange={(open) =>
              setOpenSections((prev) => ({ ...prev, ai: open }))
            }
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  openSections.ai && "rotate-90"
                )}
              />
              <Sparkles className="size-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                AI Content
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <p className="text-[10px] text-muted-foreground mb-2">
                Opens AI chat with prompt - use &quot;Add to Report&quot;
              </p>
              <div className="grid gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2.5 px-3"
                    onClick={() => openWithPrompt(action.query)}
                  >
                    <action.icon className="size-4 mr-2 shrink-0 text-primary" />
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-xs">{action.label}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Embed Content Section */}
          <Collapsible
            open={openSections.embeds}
            onOpenChange={(open) =>
              setOpenSections((prev) => ({ ...prev, embeds: open }))
            }
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-md transition-colors">
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  openSections.embeds && "rotate-90"
                )}
              />
              <Twitter className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Embed Content
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <p className="text-[10px] text-muted-foreground mb-2">
                Select content from zone monitoring
              </p>
              <div className="grid gap-2">
                {EMBED_TYPES.map((embed) => (
                  <Button
                    key={embed.id}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2.5 px-3"
                    onClick={embedHandlers[embed.id]}
                  >
                    <embed.icon className="size-4 mr-2 shrink-0 text-primary" />
                    <div className="text-left min-w-0">
                      <div className="font-medium text-xs">{embed.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {embed.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

    </Card>
  );
}
