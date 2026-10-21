"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextType {
  toast: {
    success: (message: string, description?: string) => void;
    error: (message: string, description?: string) => void;
    info: (message: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, description }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastMethods = {
    success: (msg: string, desc?: string) => addToast("success", msg, desc),
    error: (msg: string, desc?: string) => addToast("error", msg, desc),
    info: (msg: string, desc?: string) => addToast("info", msg, desc),
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      <div className="fixed bottom-4 sm:bottom-5 right-4 sm:right-5 left-4 sm:left-auto z-50 flex flex-col gap-2 max-w-sm w-auto sm:w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-slide-up bg-white/95 dark:bg-[#111C15]/95 border-[#DCE8DE] dark:border-[#1D3325]",
              t.type === "success" && "border-[#10B981]/50 shadow-[#10B981]/10",
              t.type === "error" && "border-rose-500/50 shadow-rose-500/10",
              t.type === "info" && "border-emerald-500/50 shadow-emerald-500/10"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-[#10B981]" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-500" />}
              {t.type === "info" && <Info className="w-5 h-5 text-[#10B981]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">{t.message}</p>
              {t.description && (
                <p className="text-xs text-[#536E5A] dark:text-[#8EA895] mt-0.5 leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[#536E5A] hover:text-[#0E1B13] dark:text-[#8EA895] dark:hover:text-[#F0FDF4] transition-colors p-1"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
};
