import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: "warning" | "info" | "alert" | "lightbulb";
  title: string;
  description: string;
  variant?: "default" | "muted";
  className?: string;
}

const icons = {
  warning: AlertTriangle,
  info: Info,
  alert: AlertCircle,
  lightbulb: Lightbulb,
};

export function EmptyState({
  icon = "info",
  title,
  description,
  variant = "default",
  className,
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed p-8 text-center",
        variant === "default"
          ? "border-border bg-muted/40"
          : "border-border/50 bg-muted/20",
        className
      )}
    >
      <div className="mx-auto flex flex-col items-center gap-4 max-w-md">
        {/* Icon */}
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 shadow-sm">
          <Icon className="size-6 text-primary" />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h3 className="text-base font-semibold tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

