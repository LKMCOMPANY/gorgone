import { APP_NAME } from "@/lib/constants";
import { TypographySmall } from "@/components/ui/typography";

export function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="flex h-12 items-center justify-center px-4 lg:h-14">
        <TypographySmall className="text-muted-foreground text-center">
          © {currentYear} {APP_NAME}. All rights reserved.
        </TypographySmall>
      </div>
    </footer>
  );
}
