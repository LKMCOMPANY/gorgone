"use client";

import { PromptInput } from "@/components/ai/prompt-input";

interface ChatInputProps {
  zoneId: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  zoneId,
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = "Ask a question about your data...",
}: ChatInputProps) {
  const handleSubmit = () => {
    onSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleChange = (newValue: string) => {
    onChange({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  return (
    <PromptInput
      value={value}
      onChange={handleChange}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      placeholder={placeholder}
    />
  );
}

