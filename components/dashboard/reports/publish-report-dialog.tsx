"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, Lock, Send, Loader2, KeyRound, RefreshCw, Shield, AlertTriangle, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PublishReportResult } from "@/types";

interface PublishReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publishData: PublishReportResult | null;
  isPublishing?: boolean;
  mode?: "publish" | "view";
  onRegeneratePassword?: () => void;
  isRegenerating?: boolean;
}

export function PublishReportDialog({
  open,
  onOpenChange,
  publishData,
  isPublishing = false,
  mode = "publish",
  onRegeneratePassword,
  isRegenerating = false,
}: PublishReportDialogProps) {
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [copiedPassword, setCopiedPassword] = React.useState(false);

  // Reset copy states when dialog opens
  React.useEffect(() => {
    if (open) {
      setCopiedUrl(false);
      setCopiedPassword(false);
    }
  }, [open]);

  const hasPassword = publishData?.password && publishData.password.length > 0;
  const isViewMode = mode === "view";

  const handleCopyUrl = async () => {
    if (!publishData) return;
    
    const fullUrl = `${window.location.origin}${publishData.shareUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    toast.success("Link copied to clipboard");
    
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyPassword = async () => {
    if (!publishData) return;
    
    await navigator.clipboard.writeText(publishData.password);
    setCopiedPassword(true);
    toast.success("Password copied to clipboard");
    
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCopyAll = async () => {
    if (!publishData) return;
    
    const fullUrl = `${window.location.origin}${publishData.shareUrl}`;
    const text = `Link: ${fullUrl}\nPassword: ${publishData.password}`;
    await navigator.clipboard.writeText(text);
    toast.success("Link and password copied");
  };

  const handleOpenReport = () => {
    if (!publishData) return;
    window.open(publishData.shareUrl, "_blank");
  };

  // Determine loading state
  const isLoading = isPublishing || isRegenerating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="size-5 animate-spin text-primary" />
                {isRegenerating ? "Generating New Password..." : "Publishing Report..."}
              </>
            ) : isViewMode ? (
              <>
                <KeyRound className="size-5 text-primary" />
                Share Settings
              </>
            ) : (
              <>
                <Send className="size-5 text-tactical-green" />
                Report Published
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isLoading 
              ? isRegenerating ? "Generating new secure password..." : "Generating secure sharing link..."
              : isViewMode && !hasPassword
                ? "View share settings or generate a new access password."
                : "Share this link and password with authorized recipients."
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        ) : publishData ? (
          <div className="space-y-4">
            {/* Share Link */}
            <div className="space-y-2">
              <Label htmlFor="share-url" className="text-sm font-medium flex items-center gap-2">
                <Link2 className="size-3.5 text-muted-foreground" />
                Share Link
              </Label>
              <div className="flex gap-2">
                <Input
                  id="share-url"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${publishData.shareUrl}`}
                  className="font-mono text-sm h-10 bg-muted/30"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  className={cn(
                    "shrink-0 h-10 w-10 transition-all duration-[var(--transition-fast)]",
                    copiedUrl && "bg-tactical-green/10 border-tactical-green/30"
                  )}
                >
                  {copiedUrl ? (
                    <Check className="size-4 text-tactical-green" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Password Section */}
            {hasPassword ? (
              <div className="space-y-2">
                <Label htmlFor="share-password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="size-3.5 text-muted-foreground" />
                  Access Password
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="share-password"
                    readOnly
                    value={publishData.password}
                    className="font-mono text-sm tracking-widest h-10 bg-muted/30"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPassword}
                    className={cn(
                      "shrink-0 h-10 w-10 transition-all duration-[var(--transition-fast)]",
                      copiedPassword && "bg-tactical-green/10 border-tactical-green/30"
                    )}
                  >
                    {copiedPassword ? (
                      <Check className="size-4 text-tactical-green" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <AlertTriangle className="size-3 shrink-0 mt-0.5 text-tactical-amber" />
                  {isViewMode 
                    ? "This is your new password. Save it securely."
                    : "Save this password securely. It will not be shown again."
                  }
                </p>
              </div>
            ) : isViewMode && onRegeneratePassword ? (
              <div className="space-y-3">
                <div className="alert-banner alert-warning">
                  <AlertTriangle className="size-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Password not available</p>
                    <p className="text-xs opacity-80 mt-0.5">
                      The password was only shown at publication time. Generate a new one if needed.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-10"
                  onClick={onRegeneratePassword}
                >
                  <RefreshCw className="size-4 mr-2" />
                  Generate New Password
                </Button>
              </div>
            ) : null}

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {hasPassword ? (
                <Button
                  variant="outline"
                  className="flex-1 h-10"
                  onClick={handleCopyAll}
                >
                  <Copy className="size-4 mr-2" />
                  Copy All
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1 h-10"
                  onClick={handleCopyUrl}
                >
                  <Copy className="size-4 mr-2" />
                  Copy Link
                </Button>
              )}
              <Button
                className="flex-1 h-10"
                onClick={handleOpenReport}
              >
                <ExternalLink className="size-4 mr-2" />
                Open Report
              </Button>
            </div>

            {/* Security Notice */}
            <div className="rounded-xl bg-muted/30 border border-border/50 p-3 flex items-start gap-3">
              <Shield className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Security:</strong> This link is password-protected 
                and will expire when unpublished. Only share with authorized recipients.
              </p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

