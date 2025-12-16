"use client";

/**
 * Conversation History Component
 * Displays a list of past conversations with ability to resume or delete
 */

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  MessageSquare,
  Trash2,
  MoreHorizontal,
  Plus,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface Conversation {
  id: string;
  title: string | null;
  message_count: number;
  updated_at: string;
}

interface ConversationHistoryProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => Promise<boolean>;
  isLoading?: boolean;
  locale?: "en" | "fr";
}

export function ConversationHistory({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isLoading = false,
  locale = "en",
}: ConversationHistoryProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dateLocale = locale === "fr" ? fr : enUS;

  const handleDeleteClick = (id: string) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;
    
    setIsDeleting(true);
    const success = await onDeleteConversation(conversationToDelete);
    setIsDeleting(false);
    
    if (success) {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: dateLocale,
      });
    } catch {
      return dateString;
    }
  };

  const labels = {
    newChat: locale === "fr" ? "Nouvelle conversation" : "New conversation",
    noConversations: locale === "fr" 
      ? "Aucune conversation. Commencez à discuter !" 
      : "No conversations yet. Start chatting!",
    deleteTitle: locale === "fr" ? "Supprimer la conversation ?" : "Delete conversation?",
    deleteDescription: locale === "fr"
      ? "Cette action est irréversible. La conversation et tous ses messages seront supprimés définitivement."
      : "This action cannot be undone. The conversation and all its messages will be permanently deleted.",
    cancel: locale === "fr" ? "Annuler" : "Cancel",
    delete: locale === "fr" ? "Supprimer" : "Delete",
    messages: locale === "fr" ? "messages" : "messages",
  };

  return (
    <div className="flex flex-col h-full">
      {/* New conversation button */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNewConversation}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          {labels.newChat}
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/50 rounded-md animate-pulse"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              {labels.noConversations}
            </p>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group relative flex items-center gap-2 rounded-md p-2 cursor-pointer",
                  "hover:bg-accent/50 transition-colors",
                  currentConversationId === conversation.id && "bg-accent"
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {conversation.title || "Untitled"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(conversation.updated_at)}</span>
                    <span>•</span>
                    <span>
                      {conversation.message_count} {labels.messages}
                    </span>
                  </div>
                </div>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        currentConversationId === conversation.id && "opacity-100"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(conversation.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {labels.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground shrink-0 opacity-0 transition-opacity",
                    currentConversationId === conversation.id && "opacity-100"
                  )}
                />
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {labels.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {labels.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "..." : labels.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

