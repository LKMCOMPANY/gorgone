"use client";

/**
 * Tiptap Stats Card Node Extension
 * Embeds KPI/statistics cards in reports
 * 
 * Pattern for Tiptap 3.x: Empty string default + JSON.stringify for data
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatsCardNodeAttributes } from "./types";

// ============================================================================
// Helper to safely parse stats data
// ============================================================================

function parseStatsData(data: unknown): StatsCardNodeAttributes | null {
  if (data === undefined || data === null || data === "") return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as StatsCardNodeAttributes;
    } catch {
      return null;
    }
  }
  return data as StatsCardNodeAttributes;
}

// ============================================================================
// Stats Card Component (same design as chat)
// ============================================================================

function StatsCardContent({ title, stats, period }: StatsCardNodeAttributes) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {period && (
            <Badge variant="secondary" className="text-xs">
              {period}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const TrendIcon =
              stat.trend === "up" ? TrendingUp
                : stat.trend === "down" ? TrendingDown
                : Minus;
            const trendColor =
              stat.trend === "up" ? "text-tactical-green"
                : stat.trend === "down" ? "text-tactical-red"
                : "text-muted-foreground";

            return (
              <div key={idx} className="text-center p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-2xl font-bold text-foreground">
                    {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                  </span>
                  {stat.trend && <TrendIcon className={cn("size-4", trendColor)} />}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                {stat.change !== undefined && (
                  <div className={cn("text-xs mt-0.5 font-medium", stat.change >= 0 ? "text-tactical-green" : "text-tactical-red")}>
                    {stat.change >= 0 ? "+" : ""}{stat.change}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Node View Component
// ============================================================================

function StatsNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const attrs = parseStatsData(node.attrs.statsData);

  if (!attrs || !Array.isArray(attrs.stats) || attrs.stats.length === 0) {
    return (
      <NodeViewWrapper className="my-3 not-prose" data-type="stats-node">
        <div className="p-4 border border-dashed rounded-xl text-muted-foreground text-sm text-center">
          Stats data unavailable
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-3 not-prose group relative ${selected ? "ring-2 ring-primary/50 ring-offset-2 rounded-xl" : ""}`}
      data-type="stats-node"
    >
      <button
        onClick={deleteNode}
        className="absolute -top-1.5 -right-1.5 z-10 size-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-[var(--transition-fast)] flex items-center justify-center shadow-sm hover:bg-destructive/90 hover:scale-110"
        title="Remove"
      >
        <Trash2 className="size-2.5" />
      </button>
      <StatsCardContent {...attrs} />
    </NodeViewWrapper>
  );
}

// ============================================================================
// Tiptap Extension
// ============================================================================

export const StatsNode = Node.create({
  name: "statsNode",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      statsData: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-stats'),
        renderHTML: (attributes: { statsData: string | null }) => {
          if (!attributes.statsData) return {};
          return { 'data-stats': attributes.statsData };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="stats-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "stats-node" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StatsNodeView);
  },
});

// ============================================================================
// Helper to create stats node
// ============================================================================

export function createStatsNode(attrs: StatsCardNodeAttributes) {
  return { 
    type: "statsNode", 
    attrs: {
      statsData: JSON.stringify(attrs),
    },
  };
}
