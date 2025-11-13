import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";
import { getCurrentUser } from "@/lib/auth/utils";

export default async function LoginPage() {
  const user = await getCurrentUser();

  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <TypographyH1 className="text-4xl sm:text-5xl">GORGONE</TypographyH1>
          <TypographyMuted>Social Media Monitoring Platform</TypographyMuted>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
