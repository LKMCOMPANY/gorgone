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
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 backdrop-blur-sm border-b border-amber-600/50">
      <div className="flex items-center justify-between px-4 py-2 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2 text-amber-950">
          <Shield className="size-4" />
          <span className="text-sm font-medium">
            Viewing as {clientName || "Client"}
          </span>
          <span className="text-xs opacity-75">({adminEmail})</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleExit}
          disabled={isExiting}
          className="h-7 gap-2 text-amber-950 hover:bg-amber-600/20 hover:text-amber-950"
        >
          <LogOut className="size-3.5" />
          Exit Admin View
        </Button>
      </div>
    </div>
  );
}

