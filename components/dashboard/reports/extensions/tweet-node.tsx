"use client";

/**
 * Tiptap Tweet Node Extension
 * Embeds tweet cards in reports - uses exact same component as chat
 * 
 * Pattern for Tiptap 3.x: Empty string default + JSON.stringify for data
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { TweetCard, type TweetData } from "@/components/ui/tweet-card";
import { Trash2 } from "lucide-react";

// ============================================================================
// Helper to safely parse data (handles both string and object)
// ============================================================================

function parseTweetData(data: unknown): TweetData | null {
  if (data === undefined || data === null || data === "") return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as TweetData;
    } catch {
      return null;
    }
  }
  return data as TweetData;
}

// ============================================================================
// Node View Component
// ============================================================================

function TweetNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const tweet = parseTweetData(node.attrs.tweet);

  if (!tweet) {
    return (
      <NodeViewWrapper className="my-3 not-prose" data-type="tweet-node">
        <div className="p-4 border border-dashed rounded-xl text-muted-foreground text-sm text-center">
          Tweet data unavailable
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-3 not-prose group relative ${selected ? "ring-2 ring-primary/50 ring-offset-2 rounded-xl" : ""}`}
      data-type="tweet-node"
    >
      <button
        onClick={deleteNode}
        className="absolute -top-1.5 -right-1.5 z-10 size-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-destructive/90"
        title="Remove"
      >
        <Trash2 className="size-2.5" />
      </button>
      <TweetCard tweet={tweet} showEngagement />
    </NodeViewWrapper>
  );
}

// ============================================================================
// Tiptap Extension
// ============================================================================

export const TweetNode = Node.create({
  name: "tweetNode",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      tweet: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-tweet'),
        renderHTML: (attributes: { tweet: string | null }) => {
          if (!attributes.tweet) return {};
          return { 'data-tweet': attributes.tweet };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tweet-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "tweet-node" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TweetNodeView);
  },
});

// ============================================================================
// Helper to create tweet node
// ============================================================================

export function createTweetNode(tweet: TweetData) {
  return { 
    type: "tweetNode", 
    attrs: { tweet: JSON.stringify(tweet) },
  };
}
