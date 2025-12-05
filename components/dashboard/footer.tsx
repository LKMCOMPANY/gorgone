import { APP_NAME } from "@/lib/constants";

export function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-center px-4 lg:h-14">
        <small className="text-sm font-medium leading-none text-muted-foreground text-center">
          © {currentYear} {APP_NAME}. All rights reserved.
        </small>
      </div>
    </footer>
  );
}
