"use client";

/**
 * Tiptap Image Node Extension
 * Embeds uploaded images in reports with caption support
 * 
 * Pattern for Tiptap 3.x: Empty string default + JSON.stringify for data
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import Image from "next/image";

// ============================================================================
// Types
// ============================================================================

export interface ImageNodeAttributes {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

// ============================================================================
// Helper to safely parse image data
// ============================================================================

function parseImageData(data: unknown): ImageNodeAttributes | null {
  if (data === undefined || data === null || data === "") return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as ImageNodeAttributes;
    } catch {
      return null;
    }
  }
  return data as ImageNodeAttributes;
}

// ============================================================================
// Node View Component
// ============================================================================

function ImageNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const attrs = parseImageData(node.attrs.imageData);

  if (!attrs || !attrs.src) {
    return (
      <NodeViewWrapper className="my-3 not-prose" data-type="image-node">
        <div className="p-4 border border-dashed rounded-xl text-muted-foreground text-sm text-center">
          Image unavailable
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-4 not-prose group relative ${selected ? "ring-2 ring-primary/50 ring-offset-2 rounded-xl" : ""}`}
      data-type="image-node"
    >
      {/* Delete button */}
      <button
        onClick={deleteNode}
        className="absolute -top-2 -right-2 z-10 size-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-[var(--transition-fast)] flex items-center justify-center shadow-md hover:bg-destructive/90 hover:scale-110"
        title="Remove image"
      >
        <Trash2 className="size-3" />
      </button>

      {/* Image container */}
      <figure className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
        <div className="relative w-full">
          {/* Use next/image for optimization, with unoptimized for external URLs */}
          <Image
            src={attrs.src}
            alt={attrs.alt || "Report image"}
            width={attrs.width || 800}
            height={attrs.height || 600}
            className="w-full h-auto object-contain max-h-[500px]"
            unoptimized // External URLs from Supabase Storage
          />
        </div>

        {/* Caption */}
        {attrs.caption && (
          <figcaption className="px-4 py-2 text-sm text-muted-foreground text-center border-t border-border bg-muted/50">
            {attrs.caption}
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  );
}

// ============================================================================
// Tiptap Extension
// ============================================================================

export const ImageNode = Node.create({
  name: "imageNode",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      imageData: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-image-data"),
        renderHTML: (attributes) => {
          if (!attributes.imageData) return {};
          return {
            "data-image-data":
              typeof attributes.imageData === "string"
                ? attributes.imageData
                : JSON.stringify(attributes.imageData),
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "image-node" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

// ============================================================================
// Helper to create image node from upload response
// ============================================================================

export function createImageNode(attrs: ImageNodeAttributes) {
  return {
    type: "imageNode",
    attrs: {
      imageData: JSON.stringify(attrs),
    },
  };
}

