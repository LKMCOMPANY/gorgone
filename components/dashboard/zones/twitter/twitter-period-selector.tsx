"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Period = "3h" | "6h" | "24h" | "7d" | "30d";

interface TwitterPeriodSelectorProps {
  currentPeriod: Period;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "3h", label: "3H" },
  { value: "6h", label: "6H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

/**
 * Period selector for Twitter overview
 * Uses Shadcn Tabs component for standardized pill styling
 */
export function TwitterPeriodSelector({ currentPeriod }: TwitterPeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (value: string) => {
    if (value === currentPeriod) return;
    
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-primary" />
        ) : (
          <Clock className="size-4" />
        )}
        <span className="text-sm font-medium hidden sm:inline">Period</span>
      </div>
      
      <Tabs 
        value={currentPeriod} 
        onValueChange={handlePeriodChange}
        className={cn("w-auto", isPending && "opacity-50 pointer-events-none")}
      >
        <TabsList className="h-9 w-full justify-start bg-muted/50 p-1">
          {PERIODS.map((period) => (
            <TabsTrigger 
              key={period.value} 
              value={period.value}
              className="h-7 px-3 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-[var(--transition-fast)]"
            >
              {period.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
