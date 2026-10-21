"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Settings, Shield, Moon, Sun, HardDrive, Zap, Check, Bell } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [defaultExpiry, setDefaultExpiry] = useState("24");
  const [autoCopyLink, setAutoCopyLink] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedExpiry = localStorage.getItem("dropza_default_expiry");
      if (savedExpiry) setDefaultExpiry(savedExpiry);

      const savedAutoCopy = localStorage.getItem("dropza_auto_copy");
      if (savedAutoCopy !== null) setAutoCopyLink(savedAutoCopy === "true");

      const savedSound = localStorage.getItem("dropza_sound");
      if (savedSound !== null) setSoundEnabled(savedSound === "true");
    }
  }, []);

  const savePreferences = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dropza_default_expiry", defaultExpiry);
      localStorage.setItem("dropza_auto_copy", String(autoCopyLink));
      localStorage.setItem("dropza_sound", String(soundEnabled));
    }
    toast.success("Preferences saved successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8 w-full text-left">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-[#10B981] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold">
          <Settings className="w-3.5 h-3.5 text-[#10B981]" />
          <span>System Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">Customize default transfer parameters and device behavior</p>
      </div>

      <div className="space-y-6">
        {/* Account / Quota */}
        <Card className="border-[#DCE8DE] dark:border-[#1D3325]">
          <CardHeader className="pb-4 border-b border-[#DCE8DE] dark:border-[#1D3325]">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0E1B13] dark:text-[#F0FDF4]">
              <Shield className="w-4 h-4 text-[#10B981]" /> Account & Quota
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-[#DCE8DE] dark:border-[#1D3325] gap-1">
              <span className="text-[#536E5A] dark:text-[#8EA895]">Current Session:</span>
              <span className="font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">
                {session?.user?.email || "Guest Session (Ephemeral)"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-[#DCE8DE] dark:border-[#1D3325] gap-1">
              <span className="text-[#536E5A] dark:text-[#8EA895]">Upload Size Limit:</span>
              <span className="font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">
                {session?.user ? "2 GB / file" : "50 MB / file"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
              <span className="text-[#536E5A] dark:text-[#8EA895]">WebRTC Direct Transfer Limit:</span>
              <span className="font-semibold text-[#10B981] dark:text-[#34D399]">Unlimited (Zero-Cloud P2P)</span>
            </div>
          </CardContent>
        </Card>

        {/* General Preferences */}
        <Card className="border-[#DCE8DE] dark:border-[#1D3325]">
          <CardHeader className="pb-4 border-b border-[#DCE8DE] dark:border-[#1D3325]">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#0E1B13] dark:text-[#F0FDF4]">
              <Zap className="w-4 h-4 text-[#10B981]" /> Sharing Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">Color Appearance</p>
                <p className="text-[#536E5A] dark:text-[#8EA895]">Toggle between Emerald & Obsidian Dark and Mint Light themes</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme} className="self-start sm:self-auto">
                {theme === "dark" ? <Sun className="w-4 h-4 mr-1 text-amber-400" /> : <Moon className="w-4 h-4 mr-1 text-[#536E5A]" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-[#DCE8DE] dark:border-[#1D3325] gap-3">
              <div>
                <p className="font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">Default Expiration Time</p>
                <p className="text-[#536E5A] dark:text-[#8EA895]">Default self-destruct schedule for newly uploaded files and snippets</p>
              </div>
              <select
                value={defaultExpiry}
                onChange={(e) => setDefaultExpiry(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#DCE8DE] dark:border-[#1D3325] bg-white dark:bg-[#111C15] text-[#0E1B13] dark:text-[#F0FDF4] text-xs font-semibold outline-none focus:border-[#10B981] self-start sm:self-auto"
              >
                <option value="1">1 Hour</option>
                <option value="24">24 Hours</option>
                <option value="168">7 Days</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-[#DCE8DE] dark:border-[#1D3325] gap-3">
              <div>
                <p className="font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">Auto-Copy Generated Link</p>
                <p className="text-[#536E5A] dark:text-[#8EA895]">Automatically copy link to clipboard when file upload completes</p>
              </div>
              <input
                type="checkbox"
                checked={autoCopyLink}
                onChange={(e) => setAutoCopyLink(e.target.checked)}
                className="w-4 h-4 accent-[#10B981] cursor-pointer"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button variant="primary" size="sm" onClick={savePreferences} className="w-full sm:w-auto">
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
