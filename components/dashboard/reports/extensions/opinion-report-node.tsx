"use client";

/**
 * Tiptap Opinion Report Node Extension
 * 
 * Embeds a complete Opinion Report in the report editor.
 * Reuses the same OpinionReportView component from the chat for consistency.
 * 
 * CRITICAL: Attribute must have a non-null default for Tiptap to properly
 * serialize it in getJSON(). We use an empty string as default.
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
// Node View Component
// ============================================================================

function OpinionReportNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const reportDataRaw = node.attrs.reportData;
  
  // Parse the data - it should be a JSON string
  let report: OpinionReportData | null = null;
  
  if (reportDataRaw && typeof reportDataRaw === "string" && reportDataRaw.length > 0) {
    try {
      report = JSON.parse(reportDataRaw) as OpinionReportData;
    } catch (e) {
      console.error("[OpinionReportNode] Failed to parse report data:", e);
    }
  }

  // Guard: if report data is missing or invalid
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
      {/* Delete button - visible on hover */}
      <button
        onClick={deleteNode}
        className="absolute -top-2 -right-2 z-10 size-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md hover:bg-destructive/90"
        title="Remove opinion report"
      >
        <Trash2 className="size-3" />
      </button>

      {/* Opinion Report Content - exact same component as chat */}
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
      // CRITICAL: 
      // 1. Use empty string as default, NOT null
      // 2. Use rendered: false to store in JSON, not HTML attributes
      // This ensures the large JSON string is properly serialized
      reportData: {
        default: "",
        // Do not render this attribute as HTML attribute
        // It will only be stored in the JSON representation
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="opinion-report-node"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Only include data-type for identification, not the reportData
    return [
      "div",
      mergeAttributes({ "data-type": "opinion-report-node" }, HTMLAttributes),
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
    attrs: { 
      reportData: JSON.stringify(report),
    },
  };
}
