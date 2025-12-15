"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, Lock, Send, Loader2, KeyRound, RefreshCw } from "lucide-react";
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
import { toast } from "sonner";
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
      <DialogContent className="sm:max-w-md">
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
                <Send className="size-5 text-primary" />
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
          <div className="py-8 flex justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : publishData ? (
          <div className="space-y-4 py-2">
            {/* Share Link */}
            <div className="space-y-2">
              <Label htmlFor="share-url" className="text-sm font-medium">
                Share Link
              </Label>
              <div className="flex gap-2">
                <Input
                  id="share-url"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${publishData.shareUrl}`}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  className="shrink-0"
                >
                  {copiedUrl ? (
                    <Check className="size-4 text-[var(--tactical-green)]" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password Section */}
            {hasPassword ? (
              <div className="space-y-2">
                <Label htmlFor="share-password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="size-3.5" />
                  Access Password
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="share-password"
                    readOnly
                    value={publishData.password}
                    className="font-mono text-sm tracking-wider"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPassword}
                    className="shrink-0"
                  >
                    {copiedPassword ? (
                      <Check className="size-4 text-[var(--tactical-green)]" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isViewMode 
                    ? "This is your new password. Save it securely."
                    : "Save this password securely. It will not be shown again."
                  }
                </p>
              </div>
            ) : isViewMode && onRegeneratePassword ? (
              <div className="space-y-3 py-2">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Password not available</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The password was only shown at publication time. Generate a new password if needed.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onRegeneratePassword}
                >
                  <RefreshCw className="size-4 mr-2" />
                  Generate New Password
                </Button>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {hasPassword ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyAll}
                >
                  <Copy className="size-4 mr-2" />
                  Copy Link & Password
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyUrl}
                >
                  <Copy className="size-4 mr-2" />
                  Copy Link
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={handleOpenReport}
              >
                <ExternalLink className="size-4 mr-2" />
                Open Report
              </Button>
            </div>

            {/* Security Notice */}
            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 mt-4">
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

