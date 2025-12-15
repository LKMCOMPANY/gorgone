"use client";

/**
 * Tiptap Article Node Extension
 * Embeds article cards in reports - uses exact same component as chat
 * 
 * Pattern for Tiptap 3.x: Empty string default + JSON.stringify for data
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { ArticleCard, type ArticleData } from "@/components/ui/article-card";
import { Trash2 } from "lucide-react";

// ============================================================================
// Helper to safely parse data (handles both string and object)
// ============================================================================

function parseArticleData(data: unknown): ArticleData | null {
  if (data === undefined || data === null || data === "") return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as ArticleData;
    } catch {
      return null;
    }
  }
  return data as ArticleData;
}

// ============================================================================
// Node View Component
// ============================================================================

function ArticleNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const article = parseArticleData(node.attrs.article);

  if (!article) {
    return (
      <NodeViewWrapper className="my-3 not-prose" data-type="article-node">
        <div className="p-4 border border-dashed rounded-xl text-muted-foreground text-sm text-center">
          Article data unavailable
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-3 not-prose group relative ${selected ? "ring-2 ring-primary/50 ring-offset-2 rounded-xl" : ""}`}
      data-type="article-node"
    >
      <button
        onClick={deleteNode}
        className="absolute -top-1.5 -right-1.5 z-10 size-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-[var(--transition-fast)] flex items-center justify-center shadow-sm hover:bg-destructive/90 hover:scale-110"
        title="Remove"
      >
        <Trash2 className="size-2.5" />
      </button>
      <ArticleCard article={article} />
    </NodeViewWrapper>
  );
}

// ============================================================================
// Tiptap Extension
// ============================================================================

export const ArticleNode = Node.create({
  name: "articleNode",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      article: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-article'),
        renderHTML: (attributes: { article: string | null }) => {
          if (!attributes.article) return {};
          return { 'data-article': attributes.article };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="article-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "article-node" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ArticleNodeView);
  },
});

// ============================================================================
// Helper to create article node
// ============================================================================

export function createArticleNode(article: ArticleData) {
  return { 
    type: "articleNode", 
    attrs: { article: JSON.stringify(article) },
  };
}
