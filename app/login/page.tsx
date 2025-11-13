import { LoginForm } from "@/components/auth/login-form";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <TypographyH1 className="text-4xl sm:text-5xl">GORGONE</TypographyH1>
          <TypographyMuted>
            Social Media Monitoring Platform
          </TypographyMuted>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

