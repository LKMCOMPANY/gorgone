"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Send,
  Archive,
  Link2,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  deleteReportAction,
  duplicateReportAction,
  publishReportAction,
  unpublishReportAction,
  regenerateSharePasswordAction,
} from "@/app/actions/reports";
import { PublishReportDialog } from "./publish-report-dialog";
import type { ReportListItem, PublishReportResult } from "@/types";

interface ReportListProps {
  reports: ReportListItem[];
}

export function ReportList({ reports }: ReportListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [publishData, setPublishData] = React.useState<PublishReportResult | null>(null);
  const [dialogMode, setDialogMode] = React.useState<"publish" | "view">("publish");
  const [currentReportId, setCurrentReportId] = React.useState<string | null>(null);

  const handleDuplicate = async (id: string) => {
    const result = await duplicateReportAction(id);
    if (result.success && result.report) {
      toast.success("Report duplicated");
      router.push(`/dashboard/reports/${result.report.id}`);
    } else {
      toast.error(result.error || "Failed to duplicate report");
    }
  };

  const handlePublish = async (id: string) => {
    setDialogMode("publish");
    setPublishDialogOpen(true);
    setIsPublishing(true);
    setPublishData(null);

    const result = await publishReportAction(id);
    
    setIsPublishing(false);
    
    if (result.success && result.data) {
      setPublishData(result.data);
      router.refresh();
    } else {
      setPublishDialogOpen(false);
      toast.error(result.error || "Failed to publish report");
    }
  };

  const handleViewShareInfo = (reportId: string, shareToken: string) => {
    // Show dialog with existing share info (no password available)
    setCurrentReportId(reportId);
    setDialogMode("view");
    setPublishData({
      shareToken,
      shareUrl: `/r/${shareToken}`,
      password: "", // Password not available - must regenerate
    });
    setIsPublishing(false);
    setIsRegenerating(false);
    setPublishDialogOpen(true);
  };

  const handleRegeneratePassword = async () => {
    if (!currentReportId) return;
    
    setIsRegenerating(true);

    const result = await regenerateSharePasswordAction(currentReportId);
    
    setIsRegenerating(false);
    
    if (result.success && result.data) {
      setPublishData(result.data);
      toast.success("New password generated");
    } else {
      toast.error(result.error || "Failed to regenerate password");
    }
  };

  const handleUnpublish = async (id: string) => {
    const result = await unpublishReportAction(id);
    if (result.success) {
      toast.success("Report unpublished");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to unpublish report");
    }
  };

  const handleCopyShareLink = async (shareToken: string) => {
    const fullUrl = `${window.location.origin}/r/${shareToken}`;
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Share link copied to clipboard");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const result = await deleteReportAction(deleteId);
    setIsDeleting(false);
    setDeleteId(null);
    if (result.success) {
      toast.success("Report deleted");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete report");
    }
  };

  if (reports.length === 0) {
    return (
      <div className="py-16 text-center">
        <FileText className="mx-auto size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first intelligence report to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card
            key={report.id}
            className="group card-interactive overflow-hidden"
          >
            <Link
              href={`/dashboard/reports/${report.id}`}
              className="block p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="size-5 text-primary shrink-0" />
                  <Badge
                    variant={report.status === "published" ? "success" : "outline"}
                    className="text-[10px] h-5"
                  >
                    {report.status === "published" ? "Published" : "Draft"}
                  </Badge>
                  {report.share_token && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-5 gap-1"
                    >
                      <Link2 className="size-3" />
                      Shared
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/reports/${report.id}`}>
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(report.id)}>
                      <Copy className="size-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    
                    {/* Publish/Unpublish actions */}
                    {report.status === "draft" ? (
                      <DropdownMenuItem onClick={() => handlePublish(report.id)}>
                        <Send className="size-4 mr-2" />
                        Publish & Share
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {report.share_token && (
                          <>
                            <DropdownMenuItem onClick={() => handleViewShareInfo(report.id, report.share_token!)}>
                              <KeyRound className="size-4 mr-2" />
                              Share Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyShareLink(report.share_token!)}>
                              <Link2 className="size-4 mr-2" />
                              Copy Share Link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a 
                                href={`/r/${report.share_token}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="size-4 mr-2" />
                                Open Shared View
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleUnpublish(report.id)}>
                          <Archive className="size-4 mr-2" />
                          Unpublish
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteId(report.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                {report.title}
              </h3>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{report.zone_name}</span>
                <span className="shrink-0">
                  {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}
                </span>
              </div>

              {report.word_count !== undefined && report.word_count > 0 && (
                <div className="mt-2 text-[10px] text-muted-foreground/70">
                  {report.word_count.toLocaleString()} words
                </div>
              )}
            </Link>
          </Card>
        ))}
      </div>

      {/* Publish Dialog */}
      <PublishReportDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        publishData={publishData}
        isPublishing={isPublishing}
        mode={dialogMode}
        onRegeneratePassword={handleRegeneratePassword}
        isRegenerating={isRegenerating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
