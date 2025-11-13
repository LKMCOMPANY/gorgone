import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TypographyH1, TypographyP } from "@/components/ui/typography";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center space-y-6">
        <div className="space-y-2">
          <TypographyH1 className="text-6xl sm:text-8xl">404</TypographyH1>
          <TypographyH1 className="text-2xl sm:text-3xl">
            Page Not Found
          </TypographyH1>
          <TypographyP className="text-muted-foreground mt-4">
            The page you're looking for doesn't exist or has been moved.
          </TypographyP>
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href={ROUTES.HOME}>
            <Button variant="default">Go Home</Button>
          </Link>
          <Link href={ROUTES.DASHBOARD}>
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

