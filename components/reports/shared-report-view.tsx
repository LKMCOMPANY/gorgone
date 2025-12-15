"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { Calendar, Shield, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReportEditor } from "@/components/dashboard/reports/report-editor";
import type { PublishedReportData } from "@/types";

interface SharedReportViewProps {
  report: PublishedReportData;
}

export function SharedReportView({ report }: SharedReportViewProps) {
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/GorgoneWhite.svg" : "/GorgoneBlack.svg";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - Glass effect for tactical feel */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 glass">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src={logoSrc}
              alt="GORGONE"
              width={32}
              height={32}
              className="size-7 sm:size-8"
              priority
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight">GORGONE</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider hidden sm:block">Intelligence</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {report.zone_name && (
              <Badge variant="secondary" className="hidden sm:inline-flex text-xs gap-1">
                <MapPin className="size-3" />
                {report.zone_name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs gap-1 tabular-nums">
              <Calendar className="size-3" />
              <span className="hidden xs:inline">
                {format(new Date(report.published_at), "d MMM yyyy")}
              </span>
              <span className="xs:hidden">
                {format(new Date(report.published_at), "d/M/yy")}
              </span>
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 md:px-8 py-6 sm:py-8 max-w-4xl">
        <div className="animate-in space-y-6">
          {/* Report Title Header */}
          <div className="border-b border-border/50 pb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              {report.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {report.zone_name && (
                <span className="flex items-center gap-1.5 sm:hidden">
                  <MapPin className="size-3.5" />
                  {report.zone_name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Published {format(new Date(report.published_at), "MMMM d, yyyy")}
              </span>
            </div>
          </div>

          {/* Report Content - Read-only Editor */}
          <div className="prose-container">
            <ReportEditor
              content={report.content.tiptap_document}
              onContentChange={() => {}}
              editable={false}
              className="border-none shadow-none bg-transparent"
            />
          </div>
        </div>
      </main>

      {/* Footer - Tactical styling */}
      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src={logoSrc}
                alt="GORGONE"
                width={24}
                height={24}
                className="size-5 sm:size-6 opacity-60"
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  GORGONE
                </span>
                <span className="text-xs text-muted-foreground/80 uppercase tracking-wider">
                  Intelligence Platform
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="bg-destructive/10 text-destructive border-destructive/30 text-xs font-semibold uppercase tracking-wider gap-1.5"
              >
                <Shield className="size-3" />
                Confidential
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground/70">
              This document is confidential and intended only for authorized recipients.
              Unauthorized distribution is prohibited.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

