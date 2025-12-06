import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <main className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700">
        {/* Logo */}
        <div className="relative w-[180px] h-[48px] sm:w-[240px] sm:h-[64px] md:w-[300px] md:h-[80px]">
          <Image
            src="/GorgoneBlack.svg"
            alt="Gorgone"
            fill
            className="object-contain dark:hidden"
            priority
          />
          <Image
            src="/GorgoneWhite.svg"
            alt="Gorgone"
            fill
            className="object-contain hidden dark:block"
            priority
          />
        </div>

        <h1 className="text-5xl font-extrabold tracking-tighter text-foreground sm:text-7xl md:text-8xl">
          GORGONE
        </h1>
        
        <div className="mt-4">
          <Link href="/login">
            <Button size="lg" className="h-12 px-8 text-base font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
              Login to Platform
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
