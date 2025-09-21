"use client";

import { Atom } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
  isActive?: boolean;
}

export function FloatingActionButton({ onClick, className, isActive }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "!fixed !bottom-6 !right-6", // Force positioning with !important
        "!z-[9999]", // Ensure it's above everything
        "w-14 h-14 rounded-full",
        "shadow-lg hover:shadow-xl",
        "flex items-center justify-center",
        "transition-all duration-200 ease-in-out",
        "group",
        "pointer-events-auto", // Ensure it's clickable
        isActive 
          ? "bg-green-600 hover:bg-green-700 active:bg-green-800 animate-pulse" 
          : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
        className
      )}
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999
      }}
      aria-label={isActive ? "AI chat active" : "Open AI assistant"}
    >
      {isActive && (
        <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping" />
      )}
      <Atom className={cn(
        "w-6 h-6 text-white transition-transform",
        "group-hover:scale-110",
        isActive && "animate-pulse"
      )} />
    </button>
  );
}