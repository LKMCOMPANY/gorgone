/**
 * Hook to detect current zone from URL
 * Follows user navigation automatically
 */

"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { Zone } from "@/types";

/**
 * Extract zone ID from current URL path
 * Matches pattern: /dashboard/zones/[zoneId]/...
 */
export function useCurrentZone(availableZones: Zone[]): Zone | null {
  const pathname = usePathname();

  return useMemo(() => {
    // Extract zone ID from URL
    const match = pathname.match(/\/zones\/([a-f0-9-]+)/);
    const zoneIdFromUrl = match?.[1];

    if (zoneIdFromUrl) {
      // Find zone by ID from URL
      const zone = availableZones.find((z) => z.id === zoneIdFromUrl);
      if (zone) return zone;
    }

    // Fallback: return first active zone
    return availableZones.length > 0 ? availableZones[0] : null;
  }, [pathname, availableZones]);
}

