"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";
import type { Zone } from "@/types";

interface ZonePageHeaderProps {
  zone: Zone;
  title: string;
  description?: string;
}

const dataSourceLabels = {
  twitter: "X",
  tiktok: "TikTok",
  media: "Media",
} as const;

const dataSourceIcons = {
  twitter: (
    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  tiktok: (
    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  ),
  media: (
    <svg className="size-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
    </svg>
  ),
} as const;

export function ZonePageHeader({
  zone,
  title,
  description,
}: ZonePageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSource = searchParams.get("source") || "twitter";

  // Get enabled data sources
  const enabledSources = Object.entries(zone.data_sources)
    .filter(([_, enabled]) => enabled)
    .map(([source]) => source);

  // If no sources are enabled, don't show tabs
  const showTabs = enabledSources.length > 0;

  const handleSourceChange = (source: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("source", source);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Title & Description */}
      <div className="space-y-1.5">
        <h1 className="text-4xl font-extrabold tracking-tight scroll-m-20">
          {title}
        </h1>
        {description && (
          <p className="text-lg text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Data Source Tabs */}
      {showTabs && (
        <Tabs value={currentSource} onValueChange={handleSourceChange}>
          <TabsList className="w-full sm:w-auto">
            {enabledSources.map((source) => (
              <TabsTrigger
                key={source}
                value={source}
                className="gap-2 px-4"
              >
                {dataSourceIcons[source as keyof typeof dataSourceIcons]}
                <span className="hidden sm:inline">
                  {dataSourceLabels[source as keyof typeof dataSourceLabels] || source}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* No Sources Warning */}
      {!showTabs && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full bg-primary/10 p-2 shadow-sm">
              <Info className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                No data sources enabled
              </p>
              <p className="text-sm text-muted-foreground">
                Enable data sources in zone settings to start monitoring and
                view insights.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

