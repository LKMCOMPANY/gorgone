"use client";

/**
 * Tiptap Chart Node Extension
 * Embeds charts in reports - uses exact same component as chat
 * 
 * Uses `rendered: false` pattern for reliable JSON serialization
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { ChatChart } from "@/components/dashboard/chat/chat-chart";
import { Trash2 } from "lucide-react";
import type { ChartNodeAttributes } from "./types";

// ============================================================================
// Helper to safely parse chart data
// ============================================================================

function parseChartData(data: unknown): ChartNodeAttributes | null {
  if (!data || data === "") return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as ChartNodeAttributes;
    } catch {
      return null;
    }
  }
  return data as ChartNodeAttributes;
}

// ============================================================================
// Node View Component
// ============================================================================

function ChartNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const attrs = parseChartData(node.attrs.chartData);

  if (!attrs || !Array.isArray(attrs.data) || attrs.data.length === 0) {
    return (
      <NodeViewWrapper className="my-3 not-prose" data-type="chart-node">
        <div className="p-4 border border-dashed rounded-xl text-muted-foreground text-sm text-center">
          Chart data unavailable
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-3 not-prose group relative ${selected ? "ring-2 ring-primary/50 ring-offset-2 rounded-xl" : ""}`}
      data-type="chart-node"
    >
      <button
        onClick={deleteNode}
        className="absolute -top-1.5 -right-1.5 z-10 size-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-destructive/90"
        title="Remove"
      >
        <Trash2 className="size-2.5" />
      </button>
      <ChatChart
        type={attrs.type}
        title={attrs.title}
        data={attrs.data}
        config={attrs.config}
      />
    </NodeViewWrapper>
  );
}

// ============================================================================
// Tiptap Extension
// ============================================================================

export const ChartNode = Node.create({
  name: "chartNode",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      // CRITICAL: Use empty string as default, NOT null
      // Tiptap only includes attrs in JSON if they differ from default
      chartData: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="chart-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "chart-node" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});

// ============================================================================
// Helper to create chart node
// ============================================================================

export const createChartNode = (attrs: ChartNodeAttributes) => ({
  type: "chartNode",
  attrs: {
    chartData: JSON.stringify(attrs),
  },
});
