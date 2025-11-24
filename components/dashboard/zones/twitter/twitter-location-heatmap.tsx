"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import Map, { Source, Layer } from "react-map-gl";
import type { FillLayer } from "react-map-gl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Get theme-aware color scale for heatmap
 * Uses primary purple palette that works with Mapbox GL
 */
function useColorScale(): string[] {
  const { theme } = useTheme();
  
  // Purple scale that works in both themes (Mapbox GL compatible)
  // Based on primary color: oklch(0.54 0.22 285) = purple
  const lightThemeScale = [
    "#f3e8ff", // Lightest
    "#e9d5ff",
    "#d8b4fe",
    "#c084fc",
    "#a855f7",
    "#9333ea",
    "#7e22ce",
    "#6b21a8", // Darkest
  ];

  const darkThemeScale = [
    "#e9d5ff", // Lighter for dark mode visibility
    "#d8b4fe",
    "#c084fc",
    "#a855f7",
    "#9333ea",
    "#7e22ce",
    "#6b21a8",
    "#581c87", // Even darker for dark mode
  ];

  return theme === "dark" ? darkThemeScale : lightThemeScale;
}

interface CountryData {
  country_code: string;
  country_name: string;
  tweet_count: number;
  profile_count: number;
}

interface TwitterLocationHeatmapProps {
  data: CountryData[];
  loading?: boolean;
  className?: string;
}

/**
 * 3D World heatmap showing tweet distribution by country
 * Uses Mapbox GL with choropleth layer for elegant visualization
 */
export function TwitterLocationHeatmap({
  data,
  loading = false,
  className,
}: TwitterLocationHeatmapProps) {
  const mapRef = useRef<any>(null);
  const { theme } = useTheme();
  const colorScale = useColorScale();

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

  // Continuous rotation using Mapbox official pattern
  const onMapLoad = useRef((event: any) => {
    const map = event.target;
    
    // Spin globe: rotate continuously at 6 degrees per second
    // Complete rotation in 60 seconds
    const secondsPerRevolution = 60;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    
    let userInteracting = false;
    let spinEnabled = true;
    
    const spinGlobe = () => {
      const zoom = map.getZoom();
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          // Slow spinning at higher zooms
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = map.getCenter();
        center.lng -= distancePerSecond;
        // Smoothly animate camera
        map.easeTo({ center, duration: 1000, easing: (n: number) => n });
      }
    };
    
    // Pause spinning on user interaction
    map.on('mousedown', () => { userInteracting = true; });
    map.on('dragstart', () => { userInteracting = true; });
    map.on('mouseup', () => { userInteracting = false; });
    map.on('dragend', () => { userInteracting = false; });
    map.on('touchstart', () => { userInteracting = true; });
    map.on('touchend', () => { userInteracting = false; });
    
    // Trigger re-render every second
    spinGlobe();
    setInterval(spinGlobe, 1000);
  });

  // Theme-aware map style
  const mapStyle = theme === "dark" 
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";

  // Calculate max value for color scale
  const maxTweets = Math.max(...data.map((d) => d.tweet_count), 1);

  // Create expression for fill color based on tweet count
  const getFillColor = (): any => {
    if (data.length === 0) {
      return "rgba(229, 231, 235, 0.1)";
    }

    // Build Mapbox expression for choropleth using generated color scale
    const expression: any = [
      "case",
      ...data.flatMap((country) => {
        const intensity = country.tweet_count / maxTweets;
        const colorIndex = Math.min(
          Math.floor(intensity * colorScale.length),
          colorScale.length - 1
        );
        return [
          ["==", ["get", "iso_3166_1"], country.country_code],
          colorScale[colorIndex],
        ];
      }),
      "rgba(229, 231, 235, 0.1)", // Default for countries with no data
    ];

    return expression;
  };

  // Layer for country fills (choropleth)
  const countriesLayer: FillLayer = {
    id: "countries-fill",
    type: "fill",
    source: "composite",
    "source-layer": "country_boundaries",
    paint: {
      "fill-color": getFillColor(),
      "fill-opacity": 0.8,
    },
  };

  // Layer for country borders (theme-aware)
  const bordersLayer: any = {
    id: "countries-border",
    type: "line",
    source: "composite",
    "source-layer": "country_boundaries",
    paint: {
      "line-color": theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      "line-width": 0.5,
      "line-opacity": 0.6,
    },
  };

  if (loading) {
    return <TwitterLocationHeatmapSkeleton className={className} />;
  }

  if (!mapboxToken) {
    return (
      <Card className={cn("overflow-hidden border-border/50", className)}>
        <div className="flex flex-col items-center justify-center h-[540px] text-center space-y-3 p-6 bg-muted/10">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Globe className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <p className="text-body-sm font-medium">Mapbox Token Missing</p>
            <p className="text-caption text-muted-foreground max-w-sm">
              Configure NEXT_PUBLIC_MAPBOX_TOKEN to enable the location heatmap
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={cn("overflow-hidden border-border/50", className)}>
        <div className="flex flex-col items-center justify-center h-[540px] text-center space-y-3 p-6 bg-muted/10">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-body-sm font-medium">No Location Data</p>
            <p className="text-caption text-muted-foreground max-w-sm">
              Location data will appear when profiles include geographic information
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("group overflow-hidden border-border/50 transition-all duration-300 hover:shadow-md", className)}>
      {/* Map - Full card with overlay labels */}
      <div className="relative h-[540px] bg-muted/20 flex items-center justify-center">
        <Map
          ref={mapRef}
          onLoad={onMapLoad.current}
          initialViewState={{
            longitude: 0,
            latitude: 0,
            zoom: 1.4,
            pitch: 0,
            bearing: 0,
            padding: { top: 60, bottom: 60, left: 240, right: 240 }
          }}
          mapStyle={mapStyle}
          mapboxAccessToken={mapboxToken}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          reuseMaps
          preserveDrawingBuffer
          dragRotate={true}
          touchZoomRotate={true}
          projection={{ name: "globe" }}
        >
          {/* Hide Mapbox logo with CSS trick */}
          <style>{`
            .mapboxgl-ctrl-logo {
              display: none !important;
            }
            .mapboxgl-ctrl-attrib {
              display: none !important;
            }
            .mapboxgl-ctrl-bottom-left {
              display: none !important;
            }
            .mapboxgl-ctrl-bottom-right {
              display: none !important;
            }
          `}</style>

          {/* Choropleth layers */}
          <Source
            id="countries"
            type="vector"
            url="mapbox://mapbox.country-boundaries-v1"
          >
            <Layer {...countriesLayer} />
            <Layer {...bordersLayer} />
          </Source>
        </Map>

        {/* Legend - bottom left, minimal */}
        <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg px-2.5 py-1.5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div 
                className="h-2 w-3 rounded" 
                style={{ background: colorScale[0] }}
              />
              <span className="text-[10px] text-muted-foreground">Low</span>
            </div>
            <div className="h-px w-2 bg-border/30" />
            <div className="flex items-center gap-1">
              <div 
                className="h-2 w-3 rounded" 
                style={{ background: colorScale[colorScale.length - 1] }}
              />
              <span className="text-[10px] text-muted-foreground">High</span>
            </div>
          </div>
        </div>

        {/* Minimal title overlay - top left */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg px-2.5 py-1.5 shadow-sm">
          <Globe className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Geographic Distribution</span>
          <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">
            {data.length}
          </Badge>
        </div>

        {/* Top countries list - top right */}
        <div className="absolute top-3 right-3 w-[200px] sm:w-[220px] bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg p-2.5 shadow-sm transition-all duration-200 hover:shadow-md">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Top Regions
          </p>
          <div className="space-y-2">
            {data.slice(0, 5).map((country) => {
              const intensity = country.tweet_count / maxTweets;
              const colorIndex = Math.min(
                Math.floor(intensity * colorScale.length),
                colorScale.length - 1
              );
              
              return (
                <div key={country.country_code} className="flex items-center justify-between gap-2 group/item">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div 
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: colorScale[colorIndex] }}
                    />
                    <span className="text-[10px] text-foreground truncate">
                      {country.country_name}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-primary flex-shrink-0">
                    {country.tweet_count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for location heatmap
 * Elegant animation with globe icon
 */
export function TwitterLocationHeatmapSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden border-border/50 animate-in fade-in-0 duration-500", className)}>
      {/* Map Skeleton with elegant loader - no header */}
      <div className="relative h-[540px] bg-muted/20 flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent animate-pulse" />
        
        {/* Center content */}
        <div className="relative flex flex-col items-center gap-4 text-muted-foreground">
          <div className="relative">
            <Globe className="h-12 w-12 text-primary/40 animate-pulse" />
            <Loader2 className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-body-sm font-medium text-foreground">Loading Geographic Data</p>
            <p className="text-[11px] text-muted-foreground">
              Analyzing locations and normalizing countries...
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

