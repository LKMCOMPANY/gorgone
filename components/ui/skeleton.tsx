import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "skeleton-shimmer rounded-md",
        "animate-in fade-in-0 duration-300",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
