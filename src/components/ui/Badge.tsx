import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "violet" | "leaf" | "emerald" | "amber" | "rose" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none",
        {
          "bg-[#EFF6F0] text-[#0E1B13] dark:bg-[#16261D] dark:text-[#F0FDF4] border border-[#DCE8DE] dark:border-[#1D3325]":
            variant === "default",
          "bg-emerald-500/10 text-emerald-700 dark:text-[#34D399] border border-emerald-500/25":
            variant === "violet" || variant === "leaf" || variant === "emerald",
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25":
            variant === "amber",
          "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25":
            variant === "rose",
          "border border-[#DCE8DE] dark:border-[#1D3325] text-[#536E5A] dark:text-[#8EA895]":
            variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
