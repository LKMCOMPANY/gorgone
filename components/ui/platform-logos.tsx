"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

/**
 * X (formerly Twitter) Logo
 * Official X brand logo
 */
export function XLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-4", className)}
      aria-label="X"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * TikTok Logo
 * Official TikTok brand logo
 */
export function TikTokLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-4", className)}
      aria-label="TikTok"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

/**
 * Gorgone Logo (uses SVG from public folder via Image component)
 * For inline SVG use, import this component
 */
export function GorgoneLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={cn("size-4", className)}
      aria-label="Gorgone"
    >
      <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.1" />
      <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.2" />
      <circle cx="50" cy="50" r="20" fill="currentColor" />
    </svg>
  );
}

