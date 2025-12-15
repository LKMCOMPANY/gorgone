"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SharedReportPasswordFormProps {
  token: string;
  reportTitle: string;
}

export function SharedReportPasswordForm({ token, reportTitle }: SharedReportPasswordFormProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/GorgoneWhite.svg" : "/GorgoneBlack.svg";
  
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError("Please enter the password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call API route to verify password and set cookie
      const response = await fetch("/api/reports/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Cookie is set by the API, refresh the page to show content
        router.refresh();
      } else {
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 mb-4">
            <Image
              src={logoSrc}
              alt="GORGONE"
              width={40}
              height={40}
              className="size-10"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">GORGONE</h1>
          <p className="text-sm text-muted-foreground mt-1">Intelligence Platform</p>
        </div>

        {/* Password Form */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-2">
              <Lock className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Password Required</CardTitle>
            <CardDescription className="line-clamp-2">
              Enter the password to access &ldquo;{reportTitle}&rdquo;
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="sr-only">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className={cn(
                      "pr-10 h-11",
                      error && "border-destructive focus-visible:ring-destructive"
                    )}
                    disabled={isLoading}
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Access Report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Confidential Notice */}
        <p className="text-center text-xs text-muted-foreground">
          This document is confidential. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}

