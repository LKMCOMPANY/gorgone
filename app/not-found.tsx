import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center space-y-6 animate-in">
        <div className="space-y-3">
          <h1 className="scroll-m-20 text-6xl font-extrabold tracking-tight sm:text-8xl">
            404
          </h1>
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight sm:text-3xl">
            Page Not Found
          </h2>
          <p className="text-sm text-muted-foreground mt-4">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
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
