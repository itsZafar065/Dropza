import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { DropzaLogo } from "@/components/common/DropzaLogo";

export function Footer() {
  return (
    <footer className="w-full border-t border-[#DCE8DE] dark:border-[#1D3325] bg-white dark:bg-[#0B120E] py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="space-y-3 sm:col-span-2 md:col-span-1 text-left">
            <DropzaLogo size="sm" asLink href="/" />
            <p className="text-xs text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
              Drop it. Share it. Done. Fast, privacy-conscious file sharing & peer-to-peer transfers.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-[#10B981] pt-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              All Systems Operational
            </div>
          </div>

          {/* Quick Sharing */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#536E5A]/80 dark:text-[#8EA895]/80">
              Sharing Modes
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/share"
                  className="text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] dark:hover:text-[#F0FDF4] transition-colors"
                >
                  Cloud Share
                </Link>
              </li>
              <li>
                <Link
                  href="/transfer"
                  className="text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] dark:hover:text-[#F0FDF4] transition-colors"
                >
                  Direct WebRTC Transfer
                </Link>
              </li>
              <li>
                <Link
                  href="/text"
                  className="text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] dark:hover:text-[#F0FDF4] transition-colors"
                >
                  Text & URL Sharing
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#536E5A]/80 dark:text-[#8EA895]/80">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/dashboard"
                  className="text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] dark:hover:text-[#F0FDF4] transition-colors"
                >
                  Upload History
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] dark:hover:text-[#F0FDF4] transition-colors"
                >
                  Settings & Preferences
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] dark:hover:text-[#F0FDF4] transition-colors"
                >
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#536E5A]/80 dark:text-[#8EA895]/80">
              Security & Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] dark:hover:text-[#F0FDF4] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] dark:hover:text-[#F0FDF4] transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <div className="flex items-center gap-1.5 text-xs text-[#536E5A] dark:text-[#8EA895] pt-1">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>End-to-End P2P Capable</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#DCE8DE] dark:border-[#1D3325] flex flex-col sm:flex-row items-center justify-between text-xs text-[#536E5A] dark:text-[#8EA895] gap-4 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Dropza. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for privacy, speed, and seamless file sharing.
          </p>
        </div>
      </div>
    </footer>
  );
}
