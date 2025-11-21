"use client";

import * as React from "react";
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
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  {
    icon: TrendingUp,
    label: "Zone overview",
    query: "Give me a complete overview of the zone activity",
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
    icon: BarChart3,
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
    label: "Media coverage",
    query: "Analyze media coverage on a specific topic",
  },
  {
    icon: GitCompare,
    label: "Compare accounts",
    query: "Compare two accounts",
  },
  {
    icon: MessageCircle,
    label: "Opinion analysis",
    query: "What are the dominant opinions in the discussion?",
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
    <div className="border-b border-border p-4">
      <p className="text-body-sm font-medium mb-3">Quick actions</p>
      <div className="grid gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            className={cn(
              "h-auto justify-start gap-3 p-3",
              "transition-colors duration-[150ms]",
              "hover:bg-muted/50"
            )}
            onClick={() => onSelect?.(action.query)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
              <action.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-body-sm text-left">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

