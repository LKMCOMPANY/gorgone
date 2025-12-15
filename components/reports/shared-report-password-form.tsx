"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Lock, Eye, EyeOff, AlertCircle, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-background to-background" />
      
      <div className="relative w-full max-w-md space-y-6 animate-in">
        {/* Logo - Tactical styling */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center size-16 sm:size-20 rounded-xl bg-card border border-border/50 shadow-lg mb-4">
            <Image
              src={logoSrc}
              alt="GORGONE"
              width={48}
              height={48}
              className="size-10 sm:size-12"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">GORGONE</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Intelligence Platform</p>
        </div>

        {/* Password Form - Glass card styling */}
        <Card className="glass-card border-border/30 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
              <Lock className="size-5 text-primary" />
            </div>
            <CardTitle className="text-lg sm:text-xl">Access Required</CardTitle>
            <CardDescription className="line-clamp-2 text-sm">
              Enter the password to view<br />
              <span className="font-medium text-foreground/80">&ldquo;{reportTitle}&rdquo;</span>
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
                      "pr-10 h-11 text-base",
                      error && "border-destructive focus-visible:ring-destructive"
                    )}
                    disabled={isLoading}
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-[var(--transition-fast)]"
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
                  <div className="flex items-center gap-2 text-sm text-destructive animate-in">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Access Report"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Confidential Notice - Tactical styling */}
        <div className="text-center space-y-3">
          <Badge 
            variant="outline" 
            className="bg-destructive/10 text-destructive border-destructive/30 text-xs font-semibold uppercase tracking-wider gap-1.5 px-3 py-1"
          >
            <Shield className="size-3" />
            Confidential
          </Badge>
          <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
            This document is confidential and intended only for authorized recipients.
          </p>
        </div>
      </div>
    </div>
  );
}

