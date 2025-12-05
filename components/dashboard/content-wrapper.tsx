"use client";

import * as React from "react";
import { useChat } from "./chat/chat-provider";
import { cn } from "@/lib/utils";

export function DashboardContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen } = useChat();

  return (
    <div
      className={cn(
        "flex min-h-screen w-full transition-[margin] duration-300 ease-in-out",
        // Add right margin on desktop when chat is open
        isOpen && "lg:mr-[clamp(360px,28vw,480px)]"
      )}
    >
      {children}
    </div>
  );
}

