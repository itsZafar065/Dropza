import React from "react";
import { ShieldCheck, Lock, Trash2, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8 w-full text-left">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-[#10B981] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Privacy Policy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">Last updated: October 2026</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
        <Card className="border-[#DCE8DE] dark:border-[#1D3325]">
          <CardContent className="p-5 sm:p-8 space-y-5">
            <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-[#10B981]" /> 1. Our Privacy Philosophy
            </h2>
            <p>
              Dropza was created from the ground up to minimize data collection. We believe file sharing should be fast, private, and non-intrusive. We do not sell your personal information or monetize your uploaded documents.
            </p>

            <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-2 pt-4">
              <Lock className="w-5 h-5 text-[#10B981]" /> 2. Direct WebRTC Transfers
            </h2>
            <p>
              When you use Direct Transfer, files stream directly between your devices over WebRTC DataChannels. The contents of files sent via Direct Transfer never touch our database or cloud storage. Our dedicated signaling service solely brokers the initial handshake (SDP offer/answer and ICE candidates) and never inspects file bytes.
            </p>

            <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-2 pt-4">
              <Trash2 className="w-5 h-5 text-[#10B981]" /> 3. Cloud Storage & Automated Purging
            </h2>
            <p>
              Files uploaded to Cloud Share are stored in private object storage using unpredictable, cryptographically generated keys. All shared files carry an explicit expiration time (1 hour, 24 hours, or 7 days). Once expired, files and their associated share tokens are irreversibly purged.
            </p>

            <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] pt-4">
              4. IP Addresses & Anonymization
            </h2>
            <p>
              We do not store raw IP addresses in our download logs or abuse tracking. IP addresses are salted and passed through a one-way SHA-256 cryptographic hash to prevent abuse and brute-force attacks while preserving user anonymity.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
