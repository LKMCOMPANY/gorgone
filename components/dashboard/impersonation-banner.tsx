"use client";

import { Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exitImpersonationAction } from "@/app/actions/auth";
import { useState } from "react";
import { toast } from "sonner";

interface ImpersonationBannerProps {
  adminEmail: string;
  clientName?: string;
}

export function ImpersonationBanner({ adminEmail, clientName }: ImpersonationBannerProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = async () => {
    setIsExiting(true);
    try {
      await exitImpersonationAction();
      toast.success("Returned to admin view");
    } catch (error) {
      toast.error("Failed to exit impersonation");
      setIsExiting(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-muted/30 backdrop-blur-md border-b border-border/20">
      <div className="flex items-center justify-between px-4 py-1 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="size-3" />
          <span className="text-xs">
            {clientName || "Client"}
          </span>
          <span className="text-xs opacity-50">·</span>
          <span className="text-xs opacity-50">{adminEmail}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleExit}
          disabled={isExiting}
          className="h-6 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-3" />
          Exit
        </Button>
      </div>
    </div>
  );
}

