"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResponseProps {
  children: string;
  showCopy?: boolean;
  className?: string;
}

export function Response({ children, showCopy = true, className }: ResponseProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [children]);

  return (
    <div className="group/response relative">
      {/* Copy Button */}
      {showCopy && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="absolute -top-2 -right-2 size-7 opacity-0 transition-opacity group-hover/response:opacity-100"
        >
          {copied ? (
            <Check className="size-3.5 text-[var(--tactical-green)]" />
          ) : (
            <Copy className="size-3.5" />
          )}
          <span className="sr-only">Copy response</span>
        </Button>
      )}

      {/* Markdown Content */}
      <div className={cn("prose prose-sm dark:prose-invert max-w-full", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            // Headings
            h1: ({ children }) => (
              <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4 mt-6 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight mb-3 mt-5 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="scroll-m-20 text-lg font-semibold tracking-tight mb-2 mt-4 first:mt-0">
                {children}
              </h3>
            ),

            // Paragraphs
            p: ({ children }) => (
              <p className="leading-7 mb-4 last:mb-0 [&:not(:first-child)]:mt-0">
                {children}
              </p>
            ),

            // Lists
            ul: ({ children }) => (
              <ul className="my-4 ml-6 list-disc [&>li]:mt-2">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="my-4 ml-6 list-decimal [&>li]:mt-2">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-7">{children}</li>
            ),

            // Links
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium underline underline-offset-2 hover:text-primary/80 transition-colors duration-[var(--transition-fast)]"
              >
                {children}
              </a>
            ),

            // Code
            code: ({ className, children }) => {
              const isBlock = className?.includes("language-");
              
              if (isBlock) {
                return (
                  <div className="my-4 rounded-lg border border-border bg-muted/30 overflow-hidden">
                    <pre className="overflow-x-auto p-4">
                      <code className="text-sm font-mono">{children}</code>
                    </pre>
                  </div>
                );
              }

              return (
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                  {children}
                </code>
              );
            },

            // Tables
            table: ({ children }) => (
              <div className="my-4 w-full overflow-x-auto">
                <table className="w-full border-collapse">
                  {children}
                </table>
              </div>
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

            // Blockquotes
            blockquote: ({ children }) => (
              <blockquote className="mt-6 border-l-2 border-primary pl-6 italic">
                {children}
              </blockquote>
            ),

            // Strong
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),

            // Emphasis
            em: ({ children }) => (
              <em className="italic">{children}</em>
            ),

            // Horizontal rule
            hr: () => (
              <hr className="my-6 border-border" />
            ),
          }}
        >
          {children}
        </ReactMarkdown>
      </div>
    </div>
  );
}

