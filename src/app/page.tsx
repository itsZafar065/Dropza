"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveStagedFiles } from "@/lib/client-cache";
import {
  CloudUpload,
  Radio,
  FileText,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  QrCode,
  Smartphone,
  Laptop,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const items = Array.from(e.dataTransfer.files).map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
      }));
      await saveStagedFiles(items);
      router.push("/share");
    }
  };

  const handleBrowseFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const items = Array.from(e.target.files).map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
      }));
      await saveStagedFiles(items);
      router.push("/share");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 md:pt-20 md:pb-28">
        {/* Modern Emerald Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] md:w-[600px] h-[320px] sm:h-[500px] md:h-[600px] bg-emerald-500/15 dark:bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10 max-w-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 dark:bg-[#16261D] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold text-[#059669] dark:text-[#34D399] animate-fade-in shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Drop it. Share it. Done.</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-[#0E1B13] dark:text-[#F0FDF4] leading-[1.1] break-words">
            Share files.{" "}
            <span className="bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] dark:from-[#34D399] dark:via-[#10B981] dark:to-[#6EE7B7] bg-clip-text text-transparent">
              Your way.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-[#536E5A] dark:text-[#8EA895] font-normal leading-relaxed">
            Send files between devices or create a link to share anywhere. Direct peer-to-peer WebRTC transfers, encrypted cloud links, and instant clipboard sync.
          </p>

          {/* Quick Drop Area */}
          <div className="max-w-2xl mx-auto pt-2 sm:pt-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleBrowseFiles}
            />
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer group rounded-3xl border-2 border-dashed p-6 sm:p-10 md:p-12 transition-all duration-300 text-center ${
                isDragging
                  ? "border-[#10B981] bg-emerald-500/10 scale-[1.02] shadow-glow"
                  : "border-[#DCE8DE] dark:border-[#1D3325] bg-white dark:bg-[#111C15] hover:border-[#10B981]/60 hover:bg-[#F0F6F1] dark:hover:bg-[#16261D] shadow-sm"
              }`}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 dark:bg-[#16261D] border border-emerald-500/20 dark:border-[#1D3325] flex items-center justify-center text-[#10B981] dark:text-[#34D399] group-hover:scale-110 transition-transform">
                <CloudUpload className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>

              <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4]">
                Drag & drop files here to upload
              </h2>
              <p className="text-xs text-[#536E5A] dark:text-[#8EA895] mt-1.5">
                or click to browse from your device • No registration required
              </p>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-[11px] font-medium text-[#536E5A]/80 dark:text-[#8EA895]/80">
                  Up to 50MB for guests • Up to 2GB for accounts
                </span>
              </div>
            </div>
          </div>

          {/* 3 Main Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto pt-6 sm:pt-8 text-left">
            {/* Action 1: Cloud Share */}
            <Link href="/share" className="group">
              <Card className="h-full border border-[#DCE8DE] dark:border-[#1D3325] hover:border-[#10B981]/50 hover:shadow-glow transition-all duration-300">
                <CardContent className="p-5 sm:p-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-[#16261D] flex items-center justify-center text-[#10B981] dark:text-[#34D399] group-hover:bg-[#10B981] group-hover:text-white transition-colors">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] group-hover:text-[#10B981] transition-colors">
                    Cloud Share
                  </h3>
                  <p className="text-xs text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
                    Upload to private encrypted storage, generate short-lived share links, set passwords, and track downloads.
                  </p>
                  <div className="pt-2 flex items-center text-xs font-semibold text-[#10B981]">
                    <span>Upload & Share</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Action 2: Direct Transfer */}
            <Link href="/transfer" className="group">
              <Card className="h-full border border-[#DCE8DE] dark:border-[#1D3325] hover:border-[#10B981]/50 hover:shadow-glow transition-all duration-300">
                <CardContent className="p-5 sm:p-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-[#16261D] flex items-center justify-center text-[#10B981] dark:text-[#34D399] group-hover:bg-[#10B981] group-hover:text-white transition-colors">
                    <Radio className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] group-hover:text-[#10B981] transition-colors">
                    Direct Transfer
                  </h3>
                  <p className="text-xs text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
                    Peer-to-peer WebRTC file streaming between devices in seconds. 0 cloud storage, zero file limits.
                  </p>
                  <div className="pt-2 flex items-center text-xs font-semibold text-[#10B981]">
                    <span>Start Room</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Action 3: Share Text */}
            <Link href="/text" className="group sm:col-span-2 md:col-span-1">
              <Card className="h-full border border-[#DCE8DE] dark:border-[#1D3325] hover:border-[#10B981]/50 hover:shadow-glow transition-all duration-300">
                <CardContent className="p-5 sm:p-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-[#16261D] flex items-center justify-center text-[#10B981] dark:text-[#34D399] group-hover:bg-[#10B981] group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] group-hover:text-[#10B981] transition-colors">
                    Share Text
                  </h3>
                  <p className="text-xs text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
                    Share clipboard snippets, passwords, Wi-Fi keys, or URLs securely across nearby phones and computers.
                  </p>
                  <div className="pt-2 flex items-center text-xs font-semibold text-[#10B981]">
                    <span>Send Snippet</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Cross-Device Demonstration Section */}
      <section className="w-full py-12 sm:py-16 md:py-20 bg-[#EFF6F0]/60 dark:bg-[#111C15]/40 border-y border-[#DCE8DE] dark:border-[#1D3325]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-5 text-left">
              <Badge variant="emerald">Direct WebRTC Streaming</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight leading-tight">
                Transfer directly between your phone and laptop
              </h2>
              <p className="text-[#536E5A] dark:text-[#8EA895] text-sm sm:text-base leading-relaxed">
                No cables, no account signup, and no cloud uploads required. Simply create a room, scan the QR code with your mobile camera or enter the 6-character room code, and files stream directly across your local network or WebRTC DataChannels.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-[#0E1B13] dark:text-[#F0FDF4]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>End-to-end encrypted WebRTC DataChannels</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-[#0E1B13] dark:text-[#F0FDF4]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Zero intermediate cloud file retention</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-[#0E1B13] dark:text-[#F0FDF4]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Receiver preview & accept prompt before bytes stream</span>
                </div>
              </div>

              <div className="pt-3">
                <Link href="/transfer">
                  <Button size="lg" className="w-full sm:w-auto">
                    Try Direct Transfer Now
                  </Button>
                </Link>
              </div>
            </div>

            {/* Visual device connectivity card */}
            <div className="relative rounded-3xl border border-[#DCE8DE] dark:border-[#1D3325] bg-white dark:bg-[#0B120E] p-5 sm:p-8 shadow-md">
              <div className="flex items-center justify-between pb-5 border-b border-[#DCE8DE] dark:border-[#1D3325]">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-xs font-bold text-[#0E1B13] dark:text-[#F0FDF4]">
                    ROOM: <span className="font-mono text-[#10B981] tracking-wider font-extrabold">K7N9XP</span>
                  </span>
                </div>
                <Badge variant="emerald">P2P Connected</Badge>
              </div>

              <div className="py-6 sm:py-8 flex items-center justify-around gap-2">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EFF6F0] dark:bg-[#111C15] border border-[#DCE8DE] dark:border-[#1D3325] flex items-center justify-center text-[#0E1B13] dark:text-[#F0FDF4] shadow-sm">
                    <Laptop className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-xs font-semibold text-[#536E5A] dark:text-[#8EA895]">Sender (PC)</span>
                </div>

                <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[130px] px-1 sm:px-2">
                  <div className="w-full flex items-center gap-1">
                    <span className="h-0.5 flex-1 bg-gradient-to-r from-[#10B981] to-[#34D399]" />
                    <Radio className="w-4 h-4 text-[#10B981] animate-pulse shrink-0" />
                    <span className="h-0.5 flex-1 bg-gradient-to-r from-[#34D399] to-[#10B981]" />
                  </div>
                  <span className="text-[10px] font-mono text-[#10B981] font-semibold text-center">WebRTC</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EFF6F0] dark:bg-[#111C15] border border-[#DCE8DE] dark:border-[#1D3325] flex items-center justify-center text-[#0E1B13] dark:text-[#F0FDF4] shadow-sm">
                    <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <span className="text-xs font-semibold text-[#536E5A] dark:text-[#8EA895]">Receiver (Phone)</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#EFF6F0] dark:bg-[#111C15] border border-[#DCE8DE] dark:border-[#1D3325] p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#0E1B13] dark:text-[#F0FDF4]">
                  <span className="font-semibold truncate max-w-[170px] sm:max-w-[220px]">raw_video_footage_4k.mov</span>
                  <span className="font-mono text-[#10B981] font-bold">84%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white dark:bg-[#0B120E] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399] w-[84%] rounded-full transition-all" />
                </div>
                <div className="flex justify-between text-[10px] text-[#536E5A] dark:text-[#8EA895]">
                  <span>Chunk 21,504 / 25,600</span>
                  <span>14.8 MB/s (Direct Wi-Fi)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Core Architecture Highlights */}
      <section className="w-full py-14 sm:py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0E1B13] dark:text-[#F0FDF4]">
              Engineered with Enterprise-Grade Security
            </h2>
            <p className="text-xs sm:text-sm text-[#536E5A] dark:text-[#8EA895]">
              Dropza doesn't treat privacy as an afterthought. Every layer uses strict cryptographic primitives.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 text-left">
            <Card className="border border-[#DCE8DE] dark:border-[#1D3325]">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#10B981] flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#0E1B13] dark:text-[#F0FDF4]">Presigned Zero-Knowledge Storage</h3>
                <p className="text-xs text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
                  Uploads stream directly to private storage using restricted 15-minute presigned URLs. Internal storage credentials are never exposed to browser bundles.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-[#DCE8DE] dark:border-[#1D3325]">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#10B981] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#0E1B13] dark:text-[#F0FDF4]">Unpredictable Tokens & Passkeys</h3>
                <p className="text-xs text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
                  Cryptographically generated tokens with SHA-256 database lookups, optional bcrypt password hashing, and configurable self-destruct expiry schedules (1h, 24h, 7d).
                </p>
              </CardContent>
            </Card>

            <Card className="border border-[#DCE8DE] dark:border-[#1D3325] sm:col-span-2 md:col-span-1">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#10B981] flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#0E1B13] dark:text-[#F0FDF4]">Instant QR & Mobile Pairing</h3>
                <p className="text-xs text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
                  Seamless QR code generation for every share link and transfer room. Scan to download on iOS and Android instantly without typing complex URLs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
