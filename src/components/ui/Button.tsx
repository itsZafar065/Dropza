import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 touch-manipulation",
          {
            // Variants
            "bg-[#10B981] hover:bg-[#059669] text-white font-semibold shadow-md shadow-[#10B981]/25 hover:shadow-lg hover:shadow-[#10B981]/35":
              variant === "primary",
            "bg-[#EFF6F0] hover:bg-[#E2ECE3] text-[#0E1B13] border border-[#DCE8DE] dark:bg-[#16261D] dark:hover:bg-[#1D3325] dark:text-[#F0FDF4] dark:border-[#1D3325]":
              variant === "secondary",
            "bg-transparent border border-[#DCE8DE] hover:bg-[#F0F6F1] text-[#0E1B13] dark:border-[#1D3325] dark:hover:bg-[#16261D] dark:text-[#F0FDF4]":
              variant === "outline",
            "bg-transparent hover:bg-[#F0F6F1] text-[#536E5A] dark:hover:bg-[#16261D] dark:text-[#8EA895] hover:text-[#0E1B13] dark:hover:text-[#F0FDF4]":
              variant === "ghost",
            "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25":
              variant === "danger",

            // Sizes
            "text-xs px-3 py-1.5 min-h-[36px] gap-1.5": size === "sm",
            "text-sm px-4 py-2.5 min-h-[42px] gap-2": size === "md",
            "text-base px-6 py-3.5 min-h-[48px] gap-2.5 font-semibold": size === "lg",
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
