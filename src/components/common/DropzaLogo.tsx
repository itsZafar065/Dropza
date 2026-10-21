"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DropzaLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
  asLink?: boolean;
  href?: string;
}

export function DropzaLogo({
  size = "md",
  showText = true,
  showSubtitle = true,
  className,
  asLink = false,
  href = "/",
}: DropzaLogoProps) {
  const iconDimensions = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  }[size];

  const textSize = {
    sm: "text-base tracking-tight",
    md: "text-xl tracking-tight",
    lg: "text-2xl tracking-tight",
    xl: "text-3xl tracking-tighter",
  }[size];

  const subtitleSize = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-xs",
  }[size];

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 group select-none", className)}>
      {/* Modern Emerald Vector Brand Mark */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-2xl p-1.5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-glow",
          "bg-white dark:bg-[#111C15] border border-emerald-200/80 dark:border-[#1D3325] shadow-sm",
          iconDimensions
        )}
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
        >
          <defs>
            <linearGradient id="dropzaGradPrimary" x1="8" y1="4" x2="32" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="dropzaGradAccent" x1="14" y1="10" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F0FDF4" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>

          {/* Outer Fluid Drop Geometry */}
          <path
            d="M20 4C20 4 31 16.5 31 24.5C31 30.575 26.075 35.5 20 35.5C13.925 35.5 9 30.575 9 24.5C9 16.5 20 4 20 4Z"
            fill="url(#dropzaGradPrimary)"
          />

          {/* Sleek Aerodynamic Cut */}
          <path
            d="M20 9C20 9 27.5 18 27.5 24C27.5 28.142 24.142 31.5 20 31.5C15.858 31.5 12.5 28.142 12.5 24C12.5 18 20 9 20 9Z"
            className="fill-white dark:fill-[#111C15] transition-colors"
          />

          {/* Central Sharing Beam Arrow */}
          <path
            d="M20 14L25 21H21.5V28H18.5V21H15L20 14Z"
            fill="url(#dropzaGradPrimary)"
          />

          {/* Orbiting Sync Beacon Dot */}
          <circle cx="20" cy="11.5" r="1.5" fill="#34D399" className="animate-pulse" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "font-black font-sans leading-none text-[#0E1B13] dark:text-[#F0FDF4]",
                textSize
              )}
            >
              DROP<span className="text-[#10B981]">ZA</span>
            </span>
          </div>
          {showSubtitle && (
            <span
              className={cn(
                "font-bold uppercase tracking-widest text-[#059669] dark:text-[#34D399] mt-0.5",
                subtitleSize
              )}
            >
              File Share
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}
