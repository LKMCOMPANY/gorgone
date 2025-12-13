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
import { cn } from "@/lib/utils";
import {
  deleteReportAction,
  duplicateReportAction,
  updateReportStatusAction,
} from "@/app/actions/reports";
import type { ReportListItem, ReportStatus } from "@/types";

interface ReportListProps {
  reports: ReportListItem[];
}

export function ReportList({ reports }: ReportListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDuplicate = async (id: string) => {
    const result = await duplicateReportAction(id);
    if (result.success && result.report) {
      toast.success("Report duplicated");
      router.push(`/dashboard/reports/${result.report.id}`);
    } else {
      toast.error(result.error || "Failed to duplicate report");
    }
  };

  const handleStatusChange = async (id: string, status: ReportStatus) => {
    const result = await updateReportStatusAction(id, status);
    if (result.success) {
      toast.success(status === "published" ? "Report published" : "Report moved to drafts");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update status");
    }
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
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-primary shrink-0" />
                  <Badge
                    variant={report.status === "published" ? "success" : "outline"}
                    className="text-[10px] h-5"
                  >
                    {report.status === "published" ? "Published" : "Draft"}
                  </Badge>
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
                    {report.status === "draft" ? (
                      <DropdownMenuItem onClick={() => handleStatusChange(report.id, "published")}>
                        <Send className="size-4 mr-2" />
                        Publish
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleStatusChange(report.id, "draft")}>
                        <Archive className="size-4 mr-2" />
                        Move to Draft
                      </DropdownMenuItem>
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

