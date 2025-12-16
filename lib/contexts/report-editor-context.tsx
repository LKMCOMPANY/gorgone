"use client";

/**
 * Report Editor Context
 * Provides global access to the active report editor for inserting content from chat
 * 
 * This follows the React Context pattern for sharing state across the component tree
 * without prop drilling. The context is consumed by:
 * - ReportEditorPage: to register the active editor
 * - ChatMessages: to show "Add to Report" buttons when a report is active
 */

import * as React from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";

// ============================================================================
// Types
// ============================================================================

export interface ReportEditorContextValue {
  /** The active Tiptap editor instance (null if no report is open) */
  editor: Editor | null;
  /** The ID of the active report */
  reportId: string | null;
  /** The title of the active report */
  reportTitle: string | null;
  /** Whether a report editor is currently active */
  isReportActive: boolean;
  /** Register the active report editor */
  registerEditor: (editor: Editor, reportId: string, title: string) => void;
  /** Unregister the editor (when leaving report page) */
  unregisterEditor: () => void;
  /** Insert content into the active editor */
  insertContent: (content: JSONContent | JSONContent[]) => boolean;
  /** Insert text as paragraphs */
  insertText: (text: string) => boolean;
}

// ============================================================================
// Context
// ============================================================================

const ReportEditorContext = React.createContext<ReportEditorContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface ReportEditorProviderProps {
  children: React.ReactNode;
}

export function ReportEditorProvider({ children }: ReportEditorProviderProps) {
  const [editor, setEditor] = React.useState<Editor | null>(null);
  const [reportId, setReportId] = React.useState<string | null>(null);
  const [reportTitle, setReportTitle] = React.useState<string | null>(null);

  const isReportActive = editor !== null && reportId !== null;

  const registerEditor = React.useCallback(
    (newEditor: Editor, newReportId: string, title: string) => {
      setEditor(newEditor);
      setReportId(newReportId);
      setReportTitle(title);
    },
    []
  );

  const unregisterEditor = React.useCallback(() => {
    setEditor(null);
    setReportId(null);
    setReportTitle(null);
  }, []);

  const insertContent = React.useCallback(
    (content: JSONContent | JSONContent[]): boolean => {
      if (!editor || editor.isDestroyed) {
        return false;
      }

      try {
        editor.chain().focus().insertContent(content).run();
        return true;
      } catch {
        return false;
      }
    },
    [editor]
  );

  const insertText = React.useCallback(
    (text: string): boolean => {
      if (!editor || editor.isDestroyed || !text.trim()) {
        return false;
      }

      try {
        // Split text into paragraphs and convert to Tiptap content
        const paragraphs = text.split(/\n\n+/).filter(Boolean);
        const content: JSONContent[] = paragraphs.map((para) => {
          // Check if it's a heading
          if (para.startsWith("### ")) {
            return {
              type: "heading",
              attrs: { level: 3 },
              content: [{ type: "text", text: para.slice(4) }],
            };
          }
          if (para.startsWith("## ")) {
            return {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: para.slice(3) }],
            };
          }
          if (para.startsWith("# ")) {
            return {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: para.slice(2) }],
            };
          }
          // Default to paragraph
          return {
            type: "paragraph",
            content: [{ type: "text", text: para }],
          };
        });

        editor.chain().focus().insertContent(content).run();
        return true;
      } catch (error) {
        console.error("[ReportEditorContext] Failed to insert text:", error);
        return false;
      }
    },
    [editor]
  );

  const value = React.useMemo<ReportEditorContextValue>(
    () => ({
      editor,
      reportId,
      reportTitle,
      isReportActive,
      registerEditor,
      unregisterEditor,
      insertContent,
      insertText,
    }),
    [
      editor,
      reportId,
      reportTitle,
      isReportActive,
      registerEditor,
      unregisterEditor,
      insertContent,
      insertText,
    ]
  );

  return (
    <ReportEditorContext.Provider value={value}>
      {children}
    </ReportEditorContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useReportEditor(): ReportEditorContextValue {
  const context = React.useContext(ReportEditorContext);
  
  if (!context) {
    throw new Error(
      "useReportEditor must be used within a ReportEditorProvider"
    );
  }
  
  return context;
}

/**
 * Safe version that returns null if not in provider
 * Useful for components that may or may not be in a report context
 */
export function useReportEditorSafe(): ReportEditorContextValue | null {
  return React.useContext(ReportEditorContext);
}

