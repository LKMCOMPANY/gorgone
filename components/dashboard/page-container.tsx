"use client";

import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function PageContainer({ children, className, fullWidth = false, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full", 
        !fullWidth && "p-4 sm:p-6 lg:p-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

