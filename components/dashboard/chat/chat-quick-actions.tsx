"use client";

import {
  TrendingUp,
  Users,
  Hash,
  BarChart3,
  UserSearch,
  AlertTriangle,
  Newspaper,
  GitCompare,
  MessageCircle,
  PieChart,
  Smile,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export const QUICK_ACTIONS = [
  {
    icon: TrendingUp,
    label: "Zone overview",
    query: "Give me a complete overview of the zone activity",
  },
  {
    icon: BarChart3,
    label: "Top tweets",
    query: "Show me the top tweets by engagement in the last 24 hours",
  },
  {
    icon: Users,
    label: "Top accounts",
    query: "Show me the top 10 accounts by engagement in the last 24 hours",
  },
  {
    icon: Hash,
    label: "Trending hashtags",
    query: "What are the trending hashtags across all platforms?",
  },
  {
    icon: TrendingUp,
    label: "Engagement chart",
    query: "Show me a chart of engagement trends over the last 7 days",
  },
  {
    icon: UserSearch,
    label: "Analyze account",
    query: "Analyze a specific account profile",
  },
  {
    icon: AlertTriangle,
    label: "Detect anomalies",
    query: "Detect any anomalies and unusual activity spikes",
  },
  {
    icon: Newspaper,
    label: "Media report",
    query: "Generate a complete media coverage report for the zone",
  },
  {
    icon: GitCompare,
    label: "Compare accounts",
    query: "Compare two accounts",
  },
  {
    icon: MessageCircle,
    label: "Opinion report",
    query: "Generate a complete opinion report with cluster analysis and tweet examples",
  },
  {
    icon: PieChart,
    label: "Share of voice",
    query: "Show share of voice between allies and adversaries",
  },
  {
    icon: Smile,
    label: "Sentiment analysis",
    query: "Analyze the overall sentiment and mood in the zone",
  },
  {
    icon: FileText,
    label: "Generate report",
    query: "Generate a comprehensive monitoring report of the last 24 hours with visualizations",
  },
];

interface ChatQuickActionsProps {
  onSelect?: (query: string) => void;
  show?: boolean;
}

export function ChatQuickActions({ onSelect, show = false }: ChatQuickActionsProps) {
  if (!show) return null;

  return (
    <div className="w-full pb-2">
      <p className="text-xs text-muted-foreground mb-2 px-1">Quick actions</p>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max gap-2 px-1">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => onSelect?.(action.query)}
              className="h-8 rounded-full bg-background/50 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:text-accent-foreground transition-all shadow-sm"
            >
              <action.icon className="size-4 mr-2 text-primary" />
              {action.label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

