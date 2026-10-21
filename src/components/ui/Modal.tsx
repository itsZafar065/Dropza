"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-[#0B120E]/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative w-full max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#111C15] border border-[#DCE8DE] dark:border-[#1D3325] shadow-2xl z-10 overflow-hidden animate-slide-up text-[#0E1B13] dark:text-[#F0FDF4]",
          {
            "max-w-sm": maxWidth === "sm",
            "max-w-md": maxWidth === "md",
            "max-w-lg": maxWidth === "lg",
            "max-w-xl": maxWidth === "xl",
          }
        )}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-[#DCE8DE] dark:border-[#1D3325] shrink-0">
          <div>
            {title && (
              <h3 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4]">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-[#536E5A] dark:text-[#8EA895] mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#536E5A] hover:text-[#0E1B13] dark:text-[#8EA895] dark:hover:text-[#F0FDF4] hover:bg-[#F0F6F1] dark:hover:bg-[#16261D] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
