"use client";

/**
 * Global Chat Context
 * 
 * Provides centralized control over the global chat sheet.
 * Allows any component to open the chat with an optional pre-filled prompt.
 * 
 * Usage:
 * - Wrap app with <GlobalChatProvider>
 * - Use useGlobalChat() hook to control the chat
 * - Call openWithPrompt("your prompt") to open chat and send message
 */

import * as React from "react";

interface GlobalChatContextType {
  /** Whether the chat sheet is open */
  isOpen: boolean;
  /** Open the chat sheet */
  open: () => void;
  /** Close the chat sheet */
  close: () => void;
  /** Toggle the chat sheet */
  toggle: () => void;
  /** Open the chat and immediately send a prompt */
  openWithPrompt: (prompt: string) => void;
  /** The pending prompt to be sent (consumed by DashboardChat) */
  pendingPrompt: string | null;
  /** Clear the pending prompt after it's been consumed */
  clearPendingPrompt: () => void;
}

const GlobalChatContext = React.createContext<GlobalChatContextType | undefined>(
  undefined
);

export function GlobalChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [pendingPrompt, setPendingPrompt] = React.useState<string | null>(null);

  const open = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openWithPrompt = React.useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    setIsOpen(true);
  }, []);

  const clearPendingPrompt = React.useCallback(() => {
    setPendingPrompt(null);
  }, []);

  const value = React.useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      openWithPrompt,
      pendingPrompt,
      clearPendingPrompt,
    }),
    [isOpen, open, close, toggle, openWithPrompt, pendingPrompt, clearPendingPrompt]
  );

  return (
    <GlobalChatContext.Provider value={value}>
      {children}
    </GlobalChatContext.Provider>
  );
}

export function useGlobalChat() {
  const context = React.useContext(GlobalChatContext);
  if (context === undefined) {
    throw new Error("useGlobalChat must be used within a GlobalChatProvider");
  }
  return context;
}

// Safe hook for components that might not always be within a provider
export function useGlobalChatSafe() {
  return React.useContext(GlobalChatContext);
}

