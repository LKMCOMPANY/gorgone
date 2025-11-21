"use client";

import * as React from "react";
import type { Zone } from "@/types";

interface ChatContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  currentZone: Zone | null;
  setCurrentZone: (zone: Zone) => void;
}

const ChatContext = React.createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
  defaultZone?: Zone | null;
}

export function ChatProvider({ children, defaultZone = null }: ChatProviderProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentZone, setCurrentZone] = React.useState<Zone | null>(defaultZone);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  const value = React.useMemo(
    () => ({ isOpen, open, close, toggle, currentZone, setCurrentZone }),
    [isOpen, open, close, toggle, currentZone]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = React.useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}

