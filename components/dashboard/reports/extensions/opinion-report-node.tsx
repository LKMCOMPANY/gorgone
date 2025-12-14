"use client";

/**
 * Tiptap Opinion Report Node Extension
 * 
 * Embeds a complete Opinion Report in the report editor.
 * Reuses the same OpinionReportView component from the chat for consistency.
 * 
 * IMPORTANT: Follows the same pattern as all other report extensions (TweetNode,
 * ChartNode, etc.) for consistent JSON serialization in Tiptap 3.x.
 * - Use empty string as default (not null)
 * - Data is stored as JSON-stringified string
 * - No 'rendered: false' option (incompatible with Tiptap 3.x JSON serialization)
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  OpinionReportView,
  type OpinionReportData,
} from "@/components/ui/opinion-report-view";
import { Trash2 } from "lucide-react";

// ============================================================================
// Helper to safely parse data (handles both string and object)
// ============================================================================

function parseReportData(data: unknown): OpinionReportData | null {
  if (data === undefined || data === null || data === "") return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as OpinionReportData;
    } catch (e) {
      console.error("[OpinionReportNode] Failed to parse:", e);
      return null;
    }
  }
  return data as OpinionReportData;
}

// ============================================================================
// Node View Component
// ============================================================================

function OpinionReportNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const report = parseReportData(node.attrs.reportData);

  if (!report || !report.session || !report.clusters) {
    return (
      <NodeViewWrapper className="my-4 not-prose" data-type="opinion-report-node">
        <div className="p-4 border border-dashed rounded-xl text-muted-foreground text-sm text-center">
          Opinion report data unavailable
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-4 not-prose group relative ${
        selected ? "ring-2 ring-primary/50 ring-offset-2 rounded-xl" : ""
      }`}
      data-type="opinion-report-node"
    >
      <button
        onClick={deleteNode}
        className="absolute -top-2 -right-2 z-10 size-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md hover:bg-destructive/90"
        title="Remove opinion report"
      >
        <Trash2 className="size-3" />
      </button>
      <OpinionReportView report={report} />
    </NodeViewWrapper>
  );
}

// ============================================================================
// Tiptap Extension
// ============================================================================

export const OpinionReportNode = Node.create({
  name: "opinionReportNode",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      reportData: {
        default: null,
        // Parse from HTML data attribute
        parseHTML: (element: HTMLElement) => element.getAttribute('data-report'),
        // Render to HTML data attribute  
        renderHTML: (attributes: { reportData: string | null }) => {
          if (!attributes.reportData) {
            return {};
          }
          return { 'data-report': attributes.reportData };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="opinion-report-node"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Include the reportData in the HTML output for round-trip
    return [
      "div", 
      mergeAttributes(
        { "data-type": "opinion-report-node" }, 
        HTMLAttributes,
        node.attrs.reportData ? { 'data-report': node.attrs.reportData } : {}
      )
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(OpinionReportNodeView);
  },
});

// ============================================================================
// Helper to create opinion report node
// ============================================================================

export function createOpinionReportNode(report: OpinionReportData) {
  return {
    type: "opinionReportNode",
    attrs: { reportData: JSON.stringify(report) },
  };
}
