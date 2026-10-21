import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = "text", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none",
            "bg-white dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] placeholder:text-slate-400 dark:placeholder:text-[#8EA895]/50",
            "focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
