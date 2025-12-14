"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { ReportToolbar } from "./report-toolbar";
import { cn } from "@/lib/utils";
import type { TiptapDocument } from "@/types";

// Custom node extensions for rich content embedding
import { reportExtensions } from "./extensions";

interface ReportEditorProps {
  content: TiptapDocument;
  onContentChange: (content: TiptapDocument) => void;
  onWordCountChange?: (count: number) => void;
  onEditorReady?: (editor: Editor) => void;
  className?: string;
  editable?: boolean;
}

export function ReportEditor({
  content,
  onContentChange,
  onWordCountChange,
  onEditorReady,
  className,
  editable = true,
}: ReportEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // Disable SSR rendering to avoid hydration mismatches
    extensions: [
      // StarterKit in Tiptap 3.13.0 includes Link and Underline by default
      // We configure them here to customize their behavior
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // Configure Link within StarterKit
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-2 hover:text-primary/80 transition-colors",
          },
        },
        // Underline is included by default in StarterKit 3.x
      }),
      Placeholder.configure({
        placeholder: "Start writing your report...",
        emptyEditorClass: "is-editor-empty",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      // Custom report extensions for embedding charts, tweets, etc.
      ...reportExtensions,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "min-h-[400px] p-6 focus:outline-none",
          "prose-headings:scroll-m-20 prose-headings:tracking-tight",
          "prose-h1:text-3xl prose-h1:font-bold",
          "prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8",
          "prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6",
          "prose-p:leading-7 prose-p:mb-4",
          "prose-ul:my-4 prose-ul:ml-6 prose-ul:list-disc",
          "prose-ol:my-4 prose-ol:ml-6 prose-ol:list-decimal",
          "prose-li:mt-2",
          "prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:italic",
          "prose-strong:font-semibold",
          "prose-a:text-primary prose-a:underline"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as TiptapDocument;
      onContentChange(json);

      // Calculate word count
      if (onWordCountChange) {
        const text = editor.getText();
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        onWordCountChange(words);
      }
    },
  });

  // NOTE: We intentionally do NOT sync React state back to the editor.
  // The editor is the source of truth. Content flows: Editor → React state → Database
  // Syncing the other way would cause race conditions and overwrite user edits.

  // Notify parent when editor is ready
  React.useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-muted rounded-t-xl" />
        <div className="h-[400px] bg-muted/50 rounded-b-xl" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-background shadow-xs overflow-hidden", className)}>
      <ReportToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

