"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Link as LinkIcon,
  Copy,
  Check,
  Lock,
  Clock,
  Eye,
  QrCode,
  Flame,
  ExternalLink,
  ShieldAlert,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { formatTimeRemaining } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

function TextShareContent() {
  const searchParams = useSearchParams();
  const lookupToken = searchParams.get("t");
  const { toast } = useToast();

  // Create Mode state
  const [content, setContent] = useState("");
  const [expiryHours, setExpiryHours] = useState("24");
  const [password, setPassword] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdShare, setCreatedShare] = useState<{ url: string; token: string } | null>(null);
  const [recentTexts, setRecentTexts] = useState<Array<{ token: string; url: string; preview: string; createdAt: number }>>([]);

  // View Mode state (when viewing an existing snippet)
  const [viewSnippet, setViewSnippet] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [inputPassword, setInputPassword] = useState("");

  const [copied, setCopied] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);

  // Abuse report modal state
  const [showAbuseModal, setShowAbuseModal] = useState(false);
  const [abuseReason, setAbuseReason] = useState("phishing_or_scam");
  const [abuseDetails, setAbuseDetails] = useState("");
  const [abuseSubmitting, setAbuseSubmitting] = useState(false);

  const isUrlDetected = content.trim().startsWith("http://") || content.trim().startsWith("https://");

  useEffect(() => {
    // Load default expiry preference & restore draft or recent snippets from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dropza_default_expiry");
      if (saved && ["1", "24", "168"].includes(saved)) {
        setExpiryHours(saved);
      }

      const savedDraft = localStorage.getItem("dropza_text_draft");
      if (savedDraft && !content) {
        setContent(savedDraft);
      }

      const savedRecent = localStorage.getItem("dropza_recent_texts");
      if (savedRecent) {
        try {
          setRecentTexts(JSON.parse(savedRecent));
        } catch {}
      }
    }
  }, []);

  const handleContentChange = (text: string) => {
    setContent(text);
    if (typeof window !== "undefined") {
      if (text.trim()) {
        localStorage.setItem("dropza_text_draft", text);
      } else {
        localStorage.removeItem("dropza_text_draft");
      }
    }
  };

  useEffect(() => {
    if (lookupToken) {
      loadSnippet(lookupToken);
    }
  }, [lookupToken]);

  const loadSnippet = async (token: string, pwd?: string) => {
    setViewLoading(true);
    setViewError(null);

    try {
      const headers: Record<string, string> = {};
      if (pwd) headers["x-share-password"] = pwd;

      const res = await fetch(`/api/text/${token}`, { headers });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresPassword) {
          setPasswordPrompt(true);
          setViewError("Passphrase required to read this snippet");
        } else {
          setViewError(data.error || "Snippet unavailable");
        }
        setViewLoading(false);
        return;
      }

      setPasswordPrompt(false);
      setViewSnippet(data);
    } catch {
      setViewError("Failed to fetch text snippet");
    } finally {
      setViewLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          isUrl: isUrlDetected,
          expiryHours,
          password: password.trim() || undefined,
          maxViews: maxViews ? parseInt(maxViews, 10) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error("Sharing failed", data.error || "Could not publish text");
        setSubmitting(false);
        return;
      }

      setCreatedShare(data);
      if (typeof window !== "undefined") {
        localStorage.removeItem("dropza_text_draft");
        const updatedRecent = [
          {
            token: data.token,
            url: data.url,
            preview: content.slice(0, 60),
            createdAt: Date.now(),
          },
          ...recentTexts.filter((item) => item.token !== data.token),
        ].slice(0, 10);
        setRecentTexts(updatedRecent);
        localStorage.setItem("dropza_recent_texts", JSON.stringify(updatedRecent));
      }
      toast.success("Text snippet published!");
    } catch {
      toast.error("Network error while creating snippet");
    } finally {
      setSubmitting(false);
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const revokeSnippet = async (token: string) => {
    try {
      const res = await fetch(`/api/text/${token}/revoke`, { method: "POST" });
      if (res.ok) {
        toast.info("Snippet revoked and deleted.");
        setViewSnippet(null);
        setViewError("This snippet has been deleted.");
      } else {
        const d = await res.json();
        toast.error("Failed to revoke", d.error);
      }
    } catch {
      toast.error("Failed to revoke snippet");
    }
  };

  const handleReportAbuse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupToken) return;
    setAbuseSubmitting(true);

    try {
      const res = await fetch("/api/abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "text",
          targetId: lookupToken,
          reason: abuseReason,
          details: abuseDetails,
        }),
      });

      if (res.ok) {
        toast.success("Report submitted. Our moderation team will inspect this snippet.");
        setShowAbuseModal(false);
        setAbuseDetails("");
      } else {
        const d = await res.json();
        toast.error("Report failed", d.error);
      }
    } catch {
      toast.error("Network error submitting report");
    } finally {
      setAbuseSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8 w-full">
      {/* Header */}
      <div className="space-y-2 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-[#16261D] text-[#059669] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold">
          <FileText className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Cross-Device Clipboard</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight">
          Share Text & URLs
        </h1>
        <p className="text-[#536E5A] dark:text-[#8EA895] text-xs sm:text-sm">
          Instantly beam snippets, passwords, Wi-Fi keys, or web links across your mobile and desktop devices.
        </p>
      </div>

      {/* View Existing Snippet Card (if opened via token) */}
      {lookupToken && (
        <Card className="border-[#DCE8DE] dark:border-[#1D3325] shadow-xl">
          <CardHeader className="pb-3 border-b border-[#DCE8DE] dark:border-[#1D3325]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="emerald" className="gap-1">
                <Eye className="w-3.5 h-3.5" /> Received Snippet
              </Badge>
              <div className="flex items-center gap-2 text-xs text-[#536E5A] dark:text-[#8EA895] font-medium">
                {viewSnippet?.expiresAt && (
                  <span>{formatTimeRemaining(viewSnippet.expiresAt)}</span>
                )}
                {viewSnippet && (
                  <button
                    onClick={() => setShowAbuseModal(true)}
                    className="flex items-center gap-1 text-xs text-[#536E5A] dark:text-[#8EA895] hover:text-rose-500 ml-2"
                    title="Report malicious content"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 text-left">
            {viewLoading ? (
              <div className="py-8 text-center text-sm text-[#536E5A] dark:text-[#8EA895] animate-pulse">
                Decrypting snippet...
              </div>
            ) : passwordPrompt ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadSnippet(lookupToken, inputPassword);
                }}
                className="space-y-3 max-w-sm mx-auto py-4"
              >
                <div className="text-center space-y-1">
                  <Lock className="w-8 h-8 text-[#10B981] mx-auto" />
                  <h3 className="font-bold text-[#0E1B13] dark:text-[#F0FDF4]">Protected Snippet</h3>
                  <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">Enter the passphrase set by the sender</p>
                </div>
                <Input
                  type="password"
                  placeholder="Enter passphrase"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" className="w-full">
                  Unlock
                </Button>
              </form>
            ) : viewError ? (
              <div className="py-6 text-center text-rose-500 text-sm">{viewError}</div>
            ) : viewSnippet ? (
              <div className="space-y-4">
                {viewSnippet.isUrl ? (
                  <div className="p-4 rounded-xl bg-[#EFF6F0] dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-[#536E5A]/80 dark:text-[#8EA895]/80 font-bold uppercase tracking-wider">Shared URL</p>
                      <a
                        href={viewSnippet.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm sm:text-base font-bold text-[#10B981] hover:underline break-all block mt-1"
                      >
                        {viewSnippet.content}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => copyContent(viewSnippet.content)}
                      >
                        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                      <a href={viewSnippet.content} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-4 h-4 mr-1" /> Open
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <pre className="w-full p-4 rounded-xl bg-[#EFF6F0] dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-xs sm:text-sm font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto text-[#0E1B13] dark:text-[#F0FDF4]">
                        {viewSnippet.content}
                      </pre>
                      <button
                        onClick={() => copyContent(viewSnippet.content)}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-white/80 dark:bg-[#16261D]/80 backdrop-blur-sm border border-[#DCE8DE] dark:border-[#1D3325] text-[#536E5A] dark:text-[#F0FDF4] hover:text-[#10B981]"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeSnippet(lookupToken)}
                        className="text-xs text-rose-500 hover:bg-rose-500/10"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" /> Revoke Snippet
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Create / Share Form */}
      <Card className="border-[#DCE8DE] dark:border-[#1D3325] shadow-lg">
        <CardHeader className="pb-4 border-b border-[#DCE8DE] dark:border-[#1D3325]">
          <CardTitle className="text-base flex items-center justify-between text-[#0E1B13] dark:text-[#F0FDF4]">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#10B981]" />
              <span>Compose Snippet</span>
            </span>
            {isUrlDetected && (
              <Badge variant="emerald" className="gap-1">
                <LinkIcon className="w-3 h-3" /> URL Detected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Type or paste any text or link below. Maximum 50,000 characters.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5 text-left">
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-1.5">
              <textarea
                rows={7}
                placeholder="Paste code snippet, temporary password, note, or URL here..."
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                maxLength={50000}
                required
                className="w-full p-4 rounded-2xl bg-[#EFF6F0] dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] text-xs sm:text-sm font-mono placeholder:text-slate-400 dark:placeholder:text-[#8EA895]/60 outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25 resize-y"
              />
              <div className="flex flex-wrap justify-between gap-1 text-[11px] text-[#536E5A] dark:text-[#8EA895] px-1">
                <span>{content.length.toLocaleString()} / 50,000 characters</span>
                <span>Plain text sanitized against XSS</span>
              </div>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Expiration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Expiration</span>
                </label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] outline-none focus:border-[#10B981]"
                >
                  <option value="1">1 Hour</option>
                  <option value="24">24 Hours</option>
                  <option value="168">7 Days</option>
                </select>
              </div>

              {/* Password Protection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Passphrase (Optional)</span>
                </label>
                <input
                  type="password"
                  placeholder="Lock snippet"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] outline-none focus:border-[#10B981]"
                />
              </div>

              {/* View Limits (Burn after reading) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Burn Limit (Optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="e.g. 1 view"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={submitting}
              disabled={!content.trim()}
            >
              Generate Share Link & QR
            </Button>
          </form>

          {/* Generated Share Result */}
          {createdShare && (
            <div className="mt-6 p-4 rounded-2xl bg-[#EFF6F0] dark:bg-[#16261D] border border-[#DCE8DE] dark:border-[#1D3325] space-y-3 animate-slide-up">
              <div className="flex items-center justify-between text-xs font-bold text-[#10B981] dark:text-[#34D399]">
                <span>Snippet Ready to Share:</span>
                <span className="text-[11px] text-[#536E5A] dark:text-[#8EA895]">Self-destruct active</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdShare.url}
                  className="flex-1 min-w-0 px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] select-all truncate"
                />
                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => copyContent(createdShare.url)}
                    className="px-3 flex-1 sm:flex-none"
                  >
                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setQrModalUrl(createdShare.url)}
                    className="px-3"
                    title="Show QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Text Snippets on this Device */}
      {recentTexts.length > 0 && (
        <Card className="border-[#DCE8DE] dark:border-[#1D3325]">
          <CardHeader className="pb-3 border-b border-[#DCE8DE] dark:border-[#1D3325]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#10B981]" />
                  <span>Recent Snippets on this Device</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Active text links created from this browser
                </CardDescription>
              </div>
              <Badge variant="outline">{recentTexts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-[#DCE8DE] dark:divide-[#1D3325]">
            {recentTexts.map((item) => (
              <div key={item.token} className="p-4 flex items-center justify-between gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono font-medium text-[#0E1B13] dark:text-[#F0FDF4] truncate">
                    {item.preview || "Text snippet"}...
                  </p>
                  <p className="text-[11px] text-[#536E5A] dark:text-[#8EA895] font-mono mt-0.5 truncate">
                    {item.url}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyContent(item.url)}
                    className="px-2.5 py-1 text-xs"
                    title="Copy share link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setQrModalUrl(item.url)}
                    className="px-2 py-1 text-xs"
                    title="Show QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </Button>
                  <Link href={item.url} target="_blank">
                    <Button size="sm" variant="outline" className="px-2 py-1 text-xs" title="Open snippet">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <button
                    onClick={() => {
                      const updated = recentTexts.filter((t) => t.token !== item.token);
                      setRecentTexts(updated);
                      localStorage.setItem("dropza_recent_texts", JSON.stringify(updated));
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors ml-1"
                    title="Dismiss snippet"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* QR Modal */}
      <Modal
        isOpen={Boolean(qrModalUrl)}
        onClose={() => setQrModalUrl(null)}
        title="Scan to View Snippet"
        description="Scan this QR code from any smartphone to view and copy this snippet directly."
      >
        {qrModalUrl && <QrCodeDisplay value={qrModalUrl} label="Dropza Snippet Link" />}
      </Modal>

      {/* Abuse Report Modal */}
      <Modal
        isOpen={showAbuseModal}
        onClose={() => setShowAbuseModal(false)}
        title="Report Content Abuse"
        description="Help us keep Dropza safe and compliant with community safety standards."
      >
        <form onSubmit={handleReportAbuse} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">
              Reason for Report
            </label>
            <select
              value={abuseReason}
              onChange={(e) => setAbuseReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] outline-none"
            >
              <option value="phishing_or_scam">Phishing, Scam, or Fraud</option>
              <option value="malware_or_virus">Malware, Spyware, or Exploit</option>
              <option value="copyright_infringement">Copyright Infringement</option>
              <option value="illegal_content">Illegal or Dangerous Content</option>
              <option value="harassment">Harassment or Hate Speech</option>
              <option value="other">Other Violation</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">
              Additional Context (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Explain why this content violates safety guidelines..."
              value={abuseDetails}
              onChange={(e) => setAbuseDetails(e.target.value)}
              maxLength={1000}
              className="w-full p-3 rounded-xl bg-white dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-xs text-[#0E1B13] dark:text-[#F0FDF4] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAbuseModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={abuseSubmitting}>
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function TextSharePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-[#536E5A] dark:text-[#8EA895]">Loading editor...</div>}>
      <TextShareContent />
    </Suspense>
  );
}
