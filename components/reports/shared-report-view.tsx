"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { ReportEditor } from "@/components/dashboard/reports/report-editor";
import type { PublishedReportData } from "@/types";

interface SharedReportViewProps {
  report: PublishedReportData;
}

export function SharedReportView({ report }: SharedReportViewProps) {
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/GorgoneWhite.svg" : "/GorgoneBlack.svg";

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Image
              src={logoSrc}
              alt="GORGONE"
              width={32}
              height={32}
              className="size-8"
              priority
            />
            <span className="font-semibold text-lg tracking-tight">GORGONE</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {report.zone_name && (
              <span className="hidden sm:inline">{report.zone_name}</span>
            )}
            <span className="text-xs">
              {format(new Date(report.published_at), "d MMM yyyy")}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 md:px-8 py-8 max-w-4xl">
        <div className="animate-in">
          {/* Report Content - Read-only Editor */}
          <div className="prose-container">
            <ReportEditor
              content={report.content.tiptap_document}
              onContentChange={() => {}}
              editable={false}
              className="border-none shadow-none"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src={logoSrc}
                alt="GORGONE"
                width={24}
                height={24}
                className="size-6 opacity-50"
              />
              <span className="text-sm text-muted-foreground">
                GORGONE Intelligence Platform
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-semibold uppercase tracking-wider">
                Confidential
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              This document is confidential and intended only for authorized recipients.
              Unauthorized distribution is prohibited.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

