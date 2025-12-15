"use client";

/**
 * Tiptap Account Node Extension
 * Embeds account cards in reports - uses exact same component as chat
 * 
 * Pattern for Tiptap 3.x: Empty string default + JSON.stringify for data
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { AccountCard, type AccountData } from "@/components/ui/account-card";
import { Trash2 } from "lucide-react";

// ============================================================================
// Helper to safely parse data (handles both string and object)
// ============================================================================

function parseAccountData(data: unknown): AccountData | null {
  if (data === undefined || data === null || data === "") return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as AccountData;
    } catch {
      return null;
    }
  }
  return data as AccountData;
}

// ============================================================================
// Node View Component
// ============================================================================

function AccountNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const account = parseAccountData(node.attrs.account);

  if (!account) {
    return (
      <NodeViewWrapper className="my-3 not-prose" data-type="account-node">
        <div className="p-4 border border-dashed rounded-xl text-muted-foreground text-sm text-center">
          Account data unavailable
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-3 not-prose group relative ${selected ? "ring-2 ring-primary/50 ring-offset-2 rounded-xl" : ""}`}
      data-type="account-node"
    >
      <button
        onClick={deleteNode}
        className="absolute -top-1.5 -right-1.5 z-10 size-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-[var(--transition-fast)] flex items-center justify-center shadow-sm hover:bg-destructive/90 hover:scale-110"
        title="Remove"
      >
        <Trash2 className="size-2.5" />
      </button>
      <AccountCard account={account} />
    </NodeViewWrapper>
  );
}

// ============================================================================
// Tiptap Extension
// ============================================================================

export const AccountNode = Node.create({
  name: "accountNode",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      account: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-account'),
        renderHTML: (attributes: { account: string | null }) => {
          if (!attributes.account) return {};
          return { 'data-account': attributes.account };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="account-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "account-node" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AccountNodeView);
  },
});

// ============================================================================
// Helper to create account node
// ============================================================================

export function createAccountNode(account: AccountData) {
  return { 
    type: "accountNode", 
    attrs: { account: JSON.stringify(account) },
  };
}
