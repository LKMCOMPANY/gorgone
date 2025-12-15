"use client";

/**
 * Tiptap TikTok Node Extension
 * Embeds TikTok video cards in reports - uses exact same component as chat
 * 
 * Pattern for Tiptap 3.x: Empty string default + JSON.stringify for data
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { TikTokVideoCard, type TikTokVideoData } from "@/components/ui/tiktok-video-card";
import { Trash2 } from "lucide-react";

// ============================================================================
// Helper to safely parse data (handles both string and object)
// ============================================================================

function parseVideoData(data: unknown): TikTokVideoData | null {
  if (data === undefined || data === null || data === "") return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as TikTokVideoData;
    } catch {
      return null;
    }
  }
  return data as TikTokVideoData;
}

// ============================================================================
// Node View Component
// ============================================================================

function TikTokNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const video = parseVideoData(node.attrs.video);

  if (!video) {
    return (
      <NodeViewWrapper className="my-3 not-prose" data-type="tiktok-node">
        <div className="p-4 border border-dashed rounded-xl text-muted-foreground text-sm text-center">
          TikTok data unavailable
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-3 not-prose group relative ${selected ? "ring-2 ring-primary/50 ring-offset-2 rounded-xl" : ""}`}
      data-type="tiktok-node"
    >
      <button
        onClick={deleteNode}
        className="absolute -top-1.5 -right-1.5 z-10 size-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-[var(--transition-fast)] flex items-center justify-center shadow-sm hover:bg-destructive/90 hover:scale-110"
        title="Remove"
      >
        <Trash2 className="size-2.5" />
      </button>
      <TikTokVideoCard video={video} />
    </NodeViewWrapper>
  );
}

// ============================================================================
// Tiptap Extension
// ============================================================================

export const TikTokNode = Node.create({
  name: "tiktokNode",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      video: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-video'),
        renderHTML: (attributes: { video: string | null }) => {
          if (!attributes.video) return {};
          return { 'data-video': attributes.video };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tiktok-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "tiktok-node" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TikTokNodeView);
  },
});

// ============================================================================
// Helper to create tiktok node
// ============================================================================

export function createTikTokNode(video: TikTokVideoData) {
  return { 
    type: "tiktokNode", 
    attrs: { video: JSON.stringify(video) },
  };
}
