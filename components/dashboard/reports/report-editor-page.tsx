"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type Editor } from "@tiptap/react";
import {
  ArrowLeft,
  Download,
  Send,
  Archive,
  Clock,
  CheckCircle2,
  PanelRightOpen,
  PanelRightClose,
  KeyRound,
  Library,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PageContainer } from "@/components/dashboard/page-container";
import { ReportEditor } from "./report-editor";
import { ReportLibraryPanel } from "./report-library-panel";
import { ReportContentPicker } from "./report-content-picker";
import { exportReportToPDF } from "./report-pdf-export";
import { useReportEditor } from "@/lib/contexts/report-editor-context";
import type { TweetData } from "@/components/ui/tweet-card";
import type { TikTokVideoData } from "@/components/ui/tiktok-video-card";
import type { ArticleData } from "@/components/ui/article-card";
import type { AccountData } from "@/components/ui/account-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  updateReportAction,
  publishReportAction,
  unpublishReportAction,
  regenerateSharePasswordAction,
} from "@/app/actions/reports";
import { PublishReportDialog } from "./publish-report-dialog";
import type { ReportWithZone, TiptapDocument, ReportContent, PublishReportResult } from "@/types";

interface ReportEditorPageProps {
  report: ReportWithZone;
}

export function ReportEditorPage({ report }: ReportEditorPageProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { registerEditor, unregisterEditor } = useReportEditor();
  const [title, setTitle] = React.useState(report.title);
  const [content, setContent] = React.useState<ReportContent>(report.content);
  const [wordCount, setWordCount] = React.useState(
    report.content.metadata.word_count || 0
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [showLibrary, setShowLibrary] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [editor, setEditor] = React.useState<Editor | null>(null);
  const editorContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Content picker state (lifted to avoid TabsContent re-render issues)
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerType, setPickerType] = React.useState<"tweet" | "tiktok" | "article" | "account">("tweet");
  
  // Publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [publishData, setPublishData] = React.useState<PublishReportResult | null>(null);
  const [dialogMode, setDialogMode] = React.useState<"publish" | "view">("publish");

  // Register editor in global context for chat "Add to Report" feature
  React.useEffect(() => {
    if (editor) {
      registerEditor(editor, report.id, title);
    }
    return () => {
      unregisterEditor();
    };
  }, [editor, report.id, title, registerEditor, unregisterEditor]);

  // Auto-save with debounce
  // Use refs to always have the latest values in the debounced callback (avoid stale closures)
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = React.useRef(content);
  const latestTitleRef = React.useRef(title);
  const latestWordCountRef = React.useRef(wordCount);

  // Keep refs in sync with state
  React.useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

  React.useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);

  React.useEffect(() => {
    latestWordCountRef.current = wordCount;
  }, [wordCount]);

  const performSave = React.useCallback(async () => {
    // Always use the latest values from refs
    const currentTitle = latestTitleRef.current;
    const currentContent = latestContentRef.current;
    const currentWordCount = latestWordCountRef.current;

    setIsSaving(true);

    const updatedContent: ReportContent = {
      ...currentContent,
      metadata: {
        ...currentContent.metadata,
        word_count: currentWordCount,
        last_edited_at: new Date().toISOString(),
      },
    };

    // Serialize content to JSON string for reliable Server Action transmission
    // This prevents data loss with complex nested objects (Tiptap node attrs)
    const serializedContent = JSON.stringify(updatedContent);
    
    const result = await updateReportAction(report.id, {
      title: currentTitle,
      contentJson: serializedContent,
    });

    setIsSaving(false);

    if (result.success) {
      setLastSaved(new Date());
      setHasChanges(false);
    } else {
      toast.error("Failed to save");
    }
  }, [report.id]);

  // Debounced auto-save - triggers on any change
  React.useEffect(() => {
    if (!hasChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 2000); // 2 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, hasChanges, performSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleContentChange = (newDocument: TiptapDocument) => {
    setContent({
      ...content,
      tiptap_document: newDocument,
    });
    setHasChanges(true);
  };

  const handleWordCountChange = (count: number) => {
    setWordCount(count);
  };

  const handleEditorReady = React.useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
  }, []);

  const handlePublish = async () => {
    // Save first
    await performSave();

    // Show dialog and start publishing
    setDialogMode("publish");
    setPublishDialogOpen(true);
    setIsPublishing(true);
    setPublishData(null);

    const result = await publishReportAction(report.id);
    
    setIsPublishing(false);
    
    if (result.success && result.data) {
      setPublishData(result.data);
      router.refresh();
    } else {
      setPublishDialogOpen(false);
      toast.error(result.error || "Failed to publish");
    }
  };

  const handleViewShareSettings = () => {
    if (!report.share_token) return;
    
    setDialogMode("view");
    setPublishData({
      shareToken: report.share_token,
      shareUrl: `/r/${report.share_token}`,
      password: "", // Password not available - must regenerate
    });
    setIsPublishing(false);
    setIsRegenerating(false);
    setPublishDialogOpen(true);
  };

  const handleRegeneratePassword = async () => {
    setIsRegenerating(true);

    const result = await regenerateSharePasswordAction(report.id);
    
    setIsRegenerating(false);
    
    if (result.success && result.data) {
      setPublishData(result.data);
      toast.success("New password generated");
    } else {
      toast.error(result.error || "Failed to regenerate password");
    }
  };

  const handleUnpublish = async () => {
    const result = await unpublishReportAction(report.id);
    if (result.success) {
      toast.success("Report unpublished");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update status");
    }
  };

  const handleExportPDF = async () => {
    if (!editorContainerRef.current) {
      toast.error("Editor not ready");
      return;
    }

    // Save first before export
    await performSave();

    setIsExporting(true);
    toast.info("Generating PDF...");

    try {
      await exportReportToPDF({
        report,
        contentElement: editorContainerRef.current,
        theme: resolvedTheme === "dark" ? "dark" : "light",
      });
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Open content picker
  const handleOpenPicker = (type: "tweet" | "tiktok" | "article" | "account") => {
    setPickerType(type);
    setPickerOpen(true);
  };

  // Handle content selection from picker
  const handleContentSelect = (content: TweetData | TikTokVideoData | ArticleData | AccountData) => {
    if (!editor) return;

    // Determine content type and insert appropriate node
    // Data must be stringified for proper Tiptap JSON serialization
    if ("tweet_id" in content) {
      editor.chain().focus().insertContent({
        type: "tweetNode",
        attrs: { tweet: JSON.stringify(content) },
      }).run();
    } else if ("video_id" in content) {
      editor.chain().focus().insertContent({
        type: "tiktokNode",
        attrs: { video: JSON.stringify(content) },
      }).run();
    } else if ("article_id" in content) {
      editor.chain().focus().insertContent({
        type: "articleNode",
        attrs: { article: JSON.stringify(content) },
      }).run();
    } else if ("platform" in content) {
      editor.chain().focus().insertContent({
        type: "accountNode",
        attrs: { account: JSON.stringify(content) },
      }).run();
    }
  };

  return (
    <PageContainer className="max-w-6xl">
      <div className="animate-in space-y-4 md:space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col gap-4">
          {/* Top row: Back + Title + Actions */}
          <div className="flex items-center gap-3 md:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              asChild 
              className="shrink-0 transition-colors duration-[var(--transition-fast)]"
            >
              <Link href="/dashboard/reports">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>

            <div className="min-w-0 flex-1">
              <Input
                value={title}
                onChange={handleTitleChange}
                className="h-auto text-xl md:text-2xl font-semibold border-none bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                placeholder="Untitled Report"
              />
              
              {/* Metadata row - Scrollable on mobile */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 overflow-x-auto scrollbar-hide">
                <Badge
                  variant={report.status === "published" ? "success" : "outline"}
                  className="text-xs h-5 shrink-0"
                >
                  {report.status === "published" ? "Published" : "Draft"}
                </Badge>
                <span className="shrink-0 text-muted-foreground/50">•</span>
                <Badge variant="outline" className="text-xs h-5 shrink-0 font-normal">
                  {report.zone?.name}
                </Badge>
                <span className="shrink-0 text-muted-foreground/50">•</span>
                <span className="shrink-0 tabular-nums">{wordCount.toLocaleString()} words</span>
                {lastSaved && (
                  <>
                    <span className="shrink-0 text-muted-foreground/50">•</span>
                    <span className="flex items-center gap-1 shrink-0 text-tactical-green">
                      <CheckCircle2 className="size-3" />
                      <span className="hidden sm:inline">Saved</span>
                    </span>
                  </>
                )}
                {isSaving && (
                  <>
                    <span className="shrink-0 text-muted-foreground/50">•</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="size-3 animate-pulse" />
                      <span className="hidden sm:inline">Saving...</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions row - Responsive */}
          <div className="flex items-center gap-2 justify-end flex-wrap">
            {/* Mobile Library Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="lg:hidden transition-all duration-[var(--transition-fast)]"
                >
                  <Library className="size-4 mr-2" />
                  Library
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0">
                <SheetHeader className="p-4 pb-0">
                  <SheetTitle>Content Library</SheetTitle>
                </SheetHeader>
                <div className="p-4 h-[calc(100vh-80px)]">
                  <ReportLibraryPanel
                    zoneId={report.zone_id}
                    editor={editor}
                    onOpenPicker={handleOpenPicker}
                    className="h-full"
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Library Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLibrary(!showLibrary)}
              className="hidden lg:flex transition-colors duration-[var(--transition-fast)]"
            >
              {showLibrary ? (
                <PanelRightClose className="size-4" />
              ) : (
                <PanelRightOpen className="size-4" />
              )}
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF} 
              disabled={isExporting}
              className="transition-all duration-[var(--transition-fast)]"
            >
              <Download className={cn("size-4", isExporting && "animate-pulse")} />
              <span className="hidden sm:inline ml-2">{isExporting ? "Exporting..." : "PDF"}</span>
            </Button>

            {report.status === "draft" ? (
              <Button 
                size="sm" 
                onClick={handlePublish}
                className="transition-all duration-[var(--transition-fast)]"
              >
                <Send className="size-4" />
                <span className="hidden sm:inline ml-2">Publish</span>
              </Button>
            ) : (
              <>
                {report.share_token && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleViewShareSettings}
                    className="transition-all duration-[var(--transition-fast)]"
                  >
                    <KeyRound className="size-4" />
                    <span className="hidden sm:inline ml-2">Share</span>
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleUnpublish}
                  className="transition-all duration-[var(--transition-fast)]"
                >
                  <Archive className="size-4" />
                  <span className="hidden sm:inline ml-2">Unpublish</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Editor with Library/AI Panel */}
        <div className="flex gap-6">
          {/* Main Editor */}
          <div className="flex-1 min-w-0" ref={editorContainerRef}>
            <ReportEditor
              content={content.tiptap_document}
              onContentChange={handleContentChange}
              onWordCountChange={handleWordCountChange}
              onEditorReady={handleEditorReady}
            />
          </div>

          {/* Side Panel - Library (Desktop only) */}
          {/* AI features are now integrated via the global chat with "Add to Report" buttons */}
          {showLibrary && (
            <div className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-24">
                <ReportLibraryPanel
                  zoneId={report.zone_id}
                  editor={editor}
                  onOpenPicker={handleOpenPicker}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Picker Dialog - Rendered at page level for proper portal behavior */}
      <ReportContentPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        zoneId={report.zone_id}
        contentType={pickerType}
        onSelect={handleContentSelect}
      />

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
    </PageContainer>
  );
}
