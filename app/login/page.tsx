import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/utils";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();

  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 animate-in">
        {/* Branding */}
        <div className="text-center space-y-2">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight sm:text-5xl">
            GORGONE
          </h1>
          <p className="text-sm text-muted-foreground">
            Social Media Monitoring Platform
          </p>
        </div>
        
        {/* Login Form */}
        <LoginForm />
      </div>
    </div>
  );
}
