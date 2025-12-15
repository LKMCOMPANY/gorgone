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
  Video,
  Newspaper,
  ChevronRight,
  Library,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useGlobalChat } from "@/lib/contexts/global-chat-context";
import { QUICK_ACTIONS } from "@/components/dashboard/chat/chat-quick-actions";
import { XLogo, TikTokLogo } from "@/components/ui/platform-logos";
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
    description: "Post volume over time",
    icon: LineChart,
    chartType: "line" as const,
  },
  {
    id: "engagement-bar",
    title: "Engagement",
    description: "Compare metrics",
    icon: BarChart3,
    chartType: "bar" as const,
  },
  {
    id: "activity-area",
    title: "Activity",
    description: "Area visualization",
    icon: AreaChart,
    chartType: "area" as const,
  },
];

const EMBED_TYPES: Array<{
  id: string;
  title: string;
  description: string;
  icon?: typeof Newspaper;
  IconComponent?: typeof XLogo;
}> = [
  {
    id: "tweet",
    title: "Tweet",
    description: "Embed a tweet",
    IconComponent: XLogo,
  },
  {
    id: "tiktok",
    title: "TikTok",
    description: "Embed a video",
    IconComponent: TikTokLogo,
  },
  {
    id: "article",
    title: "Article",
    description: "Media article",
    icon: Newspaper,
  },
  {
    id: "account",
    title: "Account",
    description: "Influencer card",
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
    <Card className={cn("p-0 h-full flex flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Library className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Library</h3>
            <p className="text-xs text-muted-foreground truncate">
              Insert content into your report
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Charts Section */}
          <Collapsible
            open={openSections.charts}
            onOpenChange={(open) =>
              setOpenSections((prev) => ({ ...prev, charts: open }))
            }
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 px-2 py-2 rounded-lg transition-colors duration-[var(--transition-fast)] group">
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-[var(--transition-fast)]",
                  openSections.charts && "rotate-90"
                )}
              />
              <BarChart3 className="size-4 text-chart-1" />
              <span className="text-xs font-semibold uppercase tracking-wider flex-1 text-left">
                Charts & Stats
              </span>
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {CHART_TEMPLATES.length + 1}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1 pl-6 space-y-1">
              {CHART_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto py-2 px-2 hover:bg-muted/50"
                  onClick={() => handleInsertChart(template)}
                  disabled={!editor}
                >
                  <template.icon className="size-4 mr-2.5 shrink-0 text-chart-1" />
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-medium text-xs">{template.title}</div>
                    <div className="text-xs text-muted-foreground/80 truncate">
                      {template.description}
                    </div>
                  </div>
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-auto py-2 px-2 hover:bg-muted/50"
                onClick={handleInsertStats}
                disabled={!editor}
              >
                <TrendingUp className="size-4 mr-2.5 shrink-0 text-tactical-green" />
                <div className="text-left min-w-0 flex-1">
                  <div className="font-medium text-xs">Stats Card</div>
                  <div className="text-xs text-muted-foreground/80 truncate">
                    Key metrics with trends
                  </div>
                </div>
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* AI Content Section */}
          <Collapsible
            open={openSections.ai}
            onOpenChange={(open) =>
              setOpenSections((prev) => ({ ...prev, ai: open }))
            }
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 px-2 py-2 rounded-lg transition-colors duration-[var(--transition-fast)] group">
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-[var(--transition-fast)]",
                  openSections.ai && "rotate-90"
                )}
              />
              <Sparkles className="size-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider flex-1 text-left">
                AI Analysis
              </span>
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {QUICK_ACTIONS.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1 pl-6 space-y-1">
              <p className="text-xs text-muted-foreground/70 mb-2 px-2">
                Opens chat → use &quot;Add to Report&quot;
              </p>
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto py-2 px-2 hover:bg-muted/50"
                  onClick={() => openWithPrompt(action.query)}
                >
                  <action.icon className="size-4 mr-2.5 shrink-0 text-primary" />
                  <span className="font-medium text-xs">{action.label}</span>
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Embed Content Section */}
          <Collapsible
            open={openSections.embeds}
            onOpenChange={(open) =>
              setOpenSections((prev) => ({ ...prev, embeds: open }))
            }
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 px-2 py-2 rounded-lg transition-colors duration-[var(--transition-fast)] group">
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-[var(--transition-fast)]",
                  openSections.embeds && "rotate-90"
                )}
              />
              <Layers className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider flex-1 text-left">
                Embed Content
              </span>
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {EMBED_TYPES.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1 pl-6 space-y-1">
              <p className="text-xs text-muted-foreground/70 mb-2 px-2">
                Select from zone monitoring
              </p>
              {EMBED_TYPES.map((embed) => {
                const IconComponent = embed.IconComponent;
                const LucideIcon = embed.icon;
                return (
                  <Button
                    key={embed.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-2 hover:bg-muted/50"
                    onClick={embedHandlers[embed.id]}
                  >
                    {IconComponent ? (
                      <IconComponent className="size-4 mr-2.5 shrink-0" />
                    ) : LucideIcon ? (
                      <LucideIcon className="size-4 mr-2.5 shrink-0 text-muted-foreground" />
                    ) : null}
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-xs">{embed.title}</div>
                      <div className="text-xs text-muted-foreground/80 truncate">
                        {embed.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </Card>
  );
}
