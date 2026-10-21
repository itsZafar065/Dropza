"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  CloudUpload,
  Radio,
  FileText,
  LayoutDashboard,
  Moon,
  Sun,
  Menu,
  X,
  User as UserIcon,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { DropzaLogo } from "@/components/common/DropzaLogo";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/share", label: "Cloud Share", icon: CloudUpload },
    { href: "/transfer", label: "Direct Transfer", icon: Radio },
    { href: "/text", label: "Share Text", icon: FileText },
    { href: "/dashboard", label: "My Files", icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#DCE8DE] dark:border-[#1D3325] bg-white/85 dark:bg-[#0B120E]/90 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Modern Vector Brand Logo */}
        <DropzaLogo size="md" asLink href="/" />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-emerald-500/10 dark:bg-[#16261D] text-[#059669] dark:text-[#F0FDF4] border border-emerald-500/20 dark:border-[#1D3325] font-semibold shadow-sm"
                    : "text-[#536E5A] dark:text-[#8EA895] hover:text-[#0E1B13] dark:hover:text-[#F0FDF4] hover:bg-[#F0F6F1] dark:hover:bg-[#16261D]"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-[#10B981]" : "text-[#536E5A]/70 dark:text-[#8EA895]/70")} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side controls: Theme toggle & Auth */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-[#536E5A] hover:text-[#0E1B13] dark:text-[#8EA895] dark:hover:text-[#F0FDF4] hover:bg-[#F0F6F1] dark:hover:bg-[#16261D] border border-transparent hover:border-[#DCE8DE] dark:hover:border-[#1D3325] transition-colors"
            aria-label="Toggle dark/light theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {session?.user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFF6F0] dark:bg-[#16261D] text-[#0E1B13] dark:text-[#F0FDF4] border border-[#DCE8DE] dark:border-[#1D3325] hover:bg-[#E2ECE3] dark:hover:bg-[#1D3325] transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="max-w-[120px] truncate">{session.user.name || session.user.email}</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Controls */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-[#536E5A] dark:text-[#8EA895] hover:bg-[#F0F6F1] dark:hover:bg-[#16261D]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-[#0E1B13] dark:text-[#F0FDF4] hover:bg-[#F0F6F1] dark:hover:bg-[#16261D] border border-transparent dark:border-[#1D3325]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#DCE8DE] dark:border-[#1D3325] bg-white/95 dark:bg-[#0B120E]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 animate-fade-in shadow-xl">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                  isActive
                    ? "bg-emerald-500/10 dark:bg-[#16261D] text-[#059669] dark:text-[#F0FDF4] font-bold border border-emerald-500/20 dark:border-[#1D3325]"
                    : "text-[#536E5A] dark:text-[#8EA895] hover:bg-[#F0F6F1] dark:hover:bg-[#16261D] hover:text-[#0E1B13] dark:hover:text-[#F0FDF4]"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-[#10B981]" : "text-[#536E5A] dark:text-[#8EA895]")} />
                {link.label}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-[#DCE8DE] dark:border-[#1D3325] flex flex-col gap-2.5">
            {session?.user ? (
              <div className="flex items-center justify-between px-3 py-2 bg-[#EFF6F0] dark:bg-[#16261D] rounded-xl border border-[#DCE8DE] dark:border-[#1D3325]">
                <div className="flex items-center gap-2 min-w-0">
                  <UserIcon className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span className="text-sm font-medium text-[#0E1B13] dark:text-[#F0FDF4] truncate">
                    {session.user.email}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-rose-500 border-rose-500/20 hover:bg-rose-500/10 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full">
                  <Button variant="primary" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
