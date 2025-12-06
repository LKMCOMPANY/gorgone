"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Actions({ className, ...props }: ActionsProps) {
  return (
    <div
      className={cn("flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity", className)}
      {...props}
    />
  );
}

interface ActionButtonProps extends ButtonProps {
  label: string;
  tooltip?: string;
  icon?: React.ReactNode;
}

export function ActionButton({
  label,
  tooltip,
  className,
  variant = "ghost",
  size = "icon",
  icon,
  ...props
}: ActionButtonProps) {
  const button = (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      className={cn("h-6 w-6", className)}
      {...props}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
