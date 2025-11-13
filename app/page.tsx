import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-7xl font-bold tracking-tight text-foreground sm:text-8xl md:text-9xl">
          GORGONE
        </h1>
        <Link href={ROUTES.DASHBOARD}>
          <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8">
            Login
          </Button>
        </Link>
      </main>
    </div>
  );
}
