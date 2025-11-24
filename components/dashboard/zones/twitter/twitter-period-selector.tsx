"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Period = "3h" | "6h" | "24h" | "7d" | "30d";

interface TwitterPeriodSelectorProps {
  currentPeriod: Period;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "3h", label: "3 Hours" },
  { value: "6h", label: "6 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

/**
 * Period selector for Twitter overview
 * Professional pill-style selector with loading indicator
 * Syncs selection with URL parameter for persistence
 */
export function TwitterPeriodSelector({ currentPeriod }: TwitterPeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (period: Period) => {
    if (period === currentPeriod) return;
    
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-muted-foreground">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
        <span className="text-body-sm font-medium">Period</span>
      </div>
      <div className={cn(
        "inline-flex rounded-lg border border-border bg-muted/30 p-1 gap-1 shadow-sm transition-opacity duration-200",
        isPending && "opacity-50"
      )}>
        {PERIODS.map((period) => (
          <button
            key={period.value}
            onClick={() => handlePeriodChange(period.value)}
            disabled={currentPeriod === period.value || isPending}
            className={cn(
              "relative px-3 py-1.5 text-body-sm font-medium rounded-md",
              "transition-all duration-200 ease-out",
              "disabled:cursor-not-allowed",
              !isPending && "hover:scale-105 active:scale-95",
              currentPeriod === period.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/80"
            )}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );
}
