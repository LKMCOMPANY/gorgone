"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatChart } from "./chat-chart";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  content: string;
  role: "user" | "assistant" | "system" | "data";
  toolInvocations?: any[];
}

export function MessageContent({ content, role, toolInvocations }: MessageContentProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [content]);

  // Extract visualizations from tool results
  const visualizations = React.useMemo(() => {
    if (!toolInvocations) return [];
    
    return toolInvocations
      .filter((inv) => inv.state === "result" && inv.result?._type === "visualization")
      .map((inv) => inv.result);
  }, [toolInvocations]);

  // User messages: simple text
  if (role === "user") {
    return (
      <div className="flex items-start gap-2">
        <p className="text-body flex-1 whitespace-pre-wrap">{content}</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="size-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {copied ? (
            <Check className="size-3.5 text-[var(--tactical-green)]" />
          ) : (
            <Copy className="size-3.5" />
          )}
          <span className="sr-only">Copy message</span>
        </Button>
      </div>
    );
  }

  // Assistant messages: markdown rendering + visualizations
  return (
    <div className="group flex items-start gap-2">
      <div className="flex-1 min-w-0 max-w-full space-y-4">
        {/* Visualizations (if any) */}
        {visualizations.map((viz, idx) => (
          <ChatChart
            key={idx}
            type={viz.chart_type}
            title={viz.title}
            data={viz.data}
            config={viz.config}
          />
        ))}

        {/* Markdown content */}
        <div className="prose prose-sm dark:prose-invert max-w-full break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            // Headings with word break
            h1: ({ children }) => (
              <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4 mt-6 first:mt-0 break-words">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight mb-3 mt-5 first:mt-0 break-words">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-body font-semibold mb-2 mt-4 first:mt-0 break-words">
                {children}
              </h3>
            ),

            // Paragraphs with proper wrapping
            p: ({ children }) => (
              <p className="text-body mb-4 leading-relaxed last:mb-0 break-words max-w-full">
                {children}
              </p>
            ),

            // Lists with proper wrapping
            ul: ({ children }) => (
              <ul className="mb-4 ml-4 list-disc space-y-1 text-body max-w-full">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 ml-4 list-decimal space-y-1 text-body max-w-full">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-body break-words">{children}</li>
            ),

            // Links with break for long URLs
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="link-primary font-medium underline underline-offset-2 transition-colors duration-[var(--transition-fast)] break-all"
              >
                {children}
              </a>
            ),

            // Code blocks (including SVG)
            code: ({ className, children }) => {
              const isBlock = className?.includes("language-");
              const language = className?.replace("language-", "");
              
              // SVG code block - Render as actual SVG (inline visualization)
              if (language === "svg" && typeof children === "string") {
                // Clean SVG: remove height="auto" (invalid for SVG)
                const cleanedSvg = children.replace(/height="auto"/g, "");
                
                return (
                  <div className="my-4 flex justify-center max-w-full overflow-x-auto">
                    <div
                      className="inline-block w-full max-w-full"
                      dangerouslySetInnerHTML={{ __html: cleanedSvg }}
                    />
                  </div>
                );
              }
              
              if (isBlock) {
                // Regular code block with horizontal scroll
                return (
                  <div className="relative my-4 rounded-lg border border-border bg-muted/30 max-w-full overflow-hidden">
                    <pre className="overflow-x-auto p-4 max-w-full">
                      <code className="text-sm font-mono break-all">{children}</code>
                    </pre>
                  </div>
                );
              }

              // Inline code with word break
              return (
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm break-all">
                  {children}
                </code>
              );
            },

            // Blockquote
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4">
                {children}
              </blockquote>
            ),

            // Tables with horizontal scroll
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto max-w-full">
                <table className="min-w-full border-collapse rounded-lg border border-border">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-muted/30">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="border-b border-border px-4 py-2 text-left text-sm font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b border-border px-4 py-2 text-sm">
                {children}
              </td>
            ),

            // Horizontal rule
            hr: () => (
              <hr className="my-6 border-border" />
            ),

            // Strong/Bold
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),

            // Emphasis/Italic
            em: ({ children }) => <em className="italic">{children}</em>,

            // Images (filter empty src, responsive)
            img: ({ src, alt }) => {
              if (!src || src === "") return null;
              
              // Type guard: ensure src is string
              const srcString = typeof src === "string" ? src : "";
              if (!srcString) return null;
              
              // Filter out base64 SVG charts (GPT shouldn't create these anymore)
              if (srcString.startsWith("data:image/svg")) {
                return (
                  <div className="my-4 rounded-lg border border-border bg-muted/10 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Chart detected. Please use the create_visualization tool instead.
                    </p>
                  </div>
                );
              }
              
              return (
                <img
                  src={srcString}
                  alt={alt || ""}
                  className="my-4 rounded-lg w-full max-w-full h-auto object-contain"
                />
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
        </div>
      </div>

      {/* Copy Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        {copied ? (
          <Check className="size-3.5 text-[var(--tactical-green)]" />
        ) : (
          <Copy className="size-3.5" />
        )}
        <span className="sr-only">Copy message</span>
      </Button>
    </div>
  );
}

