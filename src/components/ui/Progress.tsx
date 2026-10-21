import React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0 to 100
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function Progress({ value, max = 100, className, showLabel = false }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <div className="w-full h-2.5 rounded-full bg-[#EFF6F0] dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] overflow-hidden relative shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399] transition-all duration-300 ease-out rounded-full shadow-sm shadow-[#10B981]/30"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-[#536E5A] dark:text-[#8EA895]">
          <span>Progress</span>
          <span className="font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">{percentage}%</span>
        </div>
      )}
    </div>
  );
}
