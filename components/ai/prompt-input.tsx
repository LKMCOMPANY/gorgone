"use client";

import * as React from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Type your message...",
  maxLength = 2000,
  className,
}: PromptInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading && !disabled) {
        onSubmit();
      }
    }
  };

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading && !disabled) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative flex items-end w-full", className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading || disabled}
        maxLength={maxLength}
        rows={2}
        className={cn(
          "min-h-[56px] max-h-[200px] resize-none shadow-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-4 pr-14",
          "text-sm placeholder:text-muted-foreground/50",
          className
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!value.trim() || isLoading || disabled}
        className={cn(
          "absolute right-3 bottom-3 size-9 shrink-0 rounded-xl transition-all duration-300",
          // Default / Disabled state
          "bg-background/20 backdrop-blur-md border border-white/10 text-muted-foreground shadow-sm",
          // Hover / Active state
          "hover:bg-primary hover:text-primary-foreground hover:border-primary/20 hover:shadow-md hover:scale-105",
          // Active (has text) override
          value.trim() && "bg-primary text-primary-foreground border-primary/20 shadow-md",
          // Disabled specific
          "disabled:opacity-50 disabled:scale-100 disabled:shadow-none disabled:bg-background/20 disabled:text-muted-foreground disabled:cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}

