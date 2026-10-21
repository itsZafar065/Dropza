"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Download,
  File as FileIcon,
  Lock,
  Clock,
  ShieldAlert,
  AlertCircle,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { formatBytes, formatTimeRemaining } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function ShareLinkPage() {
  const params = useParams();
  const token = params?.token as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [fileData, setFileData] = useState<any>(null);

  // Modals
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAbuseModal, setShowAbuseModal] = useState(false);
  const [abuseReason, setAbuseReason] = useState("malware_or_virus");
  const [abuseDetails, setAbuseDetails] = useState("");
  const [abuseSubmitting, setAbuseSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchShareMetadata();
  }, [token]);

  const fetchShareMetadata = async (suppliedPassword?: string) => {
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (suppliedPassword) {
        headers["x-share-password"] = suppliedPassword;
      }

      const res = await fetch(`/api/share/${token}`, { headers });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresPassword) {
          setRequiresPassword(true);
          setFileData({
            name: data.fileName,
            sizeBytes: data.sizeBytes,
            mimeType: data.mimeType,
            expiresAt: data.expiresAt,
          });
          setError(data.error || "Password required to access this file");
        } else {
          setError(data.error || "Failed to load share link");
        }
        setLoading(false);
        return;
      }

      setRequiresPassword(false);
      setFileData({
        name: data.file.name,
        sizeBytes: data.file.sizeBytes,
        mimeType: data.file.mimeType,
        expiresAt: data.expiresAt,
        downloadCount: data.downloadCount,
        maxDownloads: data.maxDownloads,
        previewUrl: data.previewUrl || null,
      });
    } catch {
      setError("Unable to connect to Dropza servers");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    fetchShareMetadata(passwordInput);
  };

  const triggerDownload = async () => {
    setDownloading(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (passwordInput) headers["x-share-password"] = passwordInput;

      const res = await fetch(`/api/share/${token}/download`, {
        method: "POST",
        headers,
        body: JSON.stringify({ password: passwordInput || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Download failed", data.error || "Unable to download file");
        setDownloading(false);
        return;
      }

      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = data.fileName;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 150);

        toast.success("Download started!");
        if (fileData) {
          setFileData({ ...fileData, downloadCount: (fileData.downloadCount || 0) + 1 });
        }
      }
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error("Error initiating download", err?.message || "Please try again");
    } finally {
      setDownloading(false);
    }
  };

  const handleReportAbuse = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbuseSubmitting(true);

    try {
      const res = await fetch("/api/abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "share",
          targetId: token,
          shareToken: token,
          reason: abuseReason,
          details: abuseDetails,
        }),
      });

      if (res.ok) {
        toast.success("Abuse report submitted. Thank you for keeping Dropza safe.");
        setShowAbuseModal(false);
        setAbuseDetails("");
      } else {
        const d = await res.json();
        toast.error("Failed to submit report", d.error);
      }
    } catch {
      toast.error("Network error submitting report");
    } finally {
      setAbuseSubmitting(false);
    }
  };

  const sharePageUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8 sm:my-12 w-full">
      <div className="w-full max-w-xl space-y-4">
        {loading ? (
          <Card className="border-[#DCE8DE] dark:border-[#1D3325] p-8 sm:p-12 text-center">
            <div className="w-10 h-10 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">
              Retrieving secure file link...
            </p>
          </Card>
        ) : error && !requiresPassword ? (
          <Card className="border-rose-500/30 dark:border-rose-500/20 shadow-xl text-center p-6 sm:p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#0E1B13] dark:text-[#F0FDF4]">Link Unavailable</h2>
              <p className="text-sm text-[#536E5A] dark:text-[#8EA895]">{error}</p>
            </div>
            <div className="pt-2">
              <Button variant="outline" onClick={() => (window.location.href = "/")}>
                Go to Dropza Home
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border-[#DCE8DE] dark:border-[#1D3325] shadow-xl overflow-hidden">
            <CardHeader className="bg-[#EFF6F0]/60 dark:bg-[#16261D]/70 border-b border-[#DCE8DE] dark:border-[#1D3325] pb-4 sm:pb-5">
              <div className="flex items-center justify-between">
                <Badge variant="emerald" className="gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>
                    {fileData?.expiresAt ? formatTimeRemaining(fileData.expiresAt) : "Active"}
                  </span>
                </Badge>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQrModal(true)}
                    className="text-xs"
                    title="QR Code"
                  >
                    <QrCode className="w-4 h-4 mr-1 text-[#10B981]" /> QR
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAbuseModal(true)}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    title="Report file"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-8 space-y-6 text-left">
              {/* File Presentation */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 text-[#10B981] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] flex items-center justify-center shrink-0">
                  <FileIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-xl font-black text-[#0E1B13] dark:text-[#F0FDF4] truncate">
                    {fileData?.name || "Shared File"}
                  </h1>
                  <p className="text-xs text-[#536E5A] dark:text-[#8EA895] mt-0.5">
                    {fileData?.sizeBytes ? formatBytes(fileData.sizeBytes) : "Unknown size"} •{" "}
                    {fileData?.mimeType || "File"}
                  </p>
                </div>
              </div>

              {/* Media Preview (Image / Video) */}
              {fileData?.previewUrl && !requiresPassword && (
                <div className="rounded-2xl overflow-hidden border border-[#DCE8DE] dark:border-[#1D3325] bg-[#EFF6F0]/40 dark:bg-[#0B120E] flex items-center justify-center p-3 sm:p-4">
                  {fileData.mimeType?.startsWith("image/") ? (
                    <a
                      href={fileData.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block cursor-zoom-in"
                      title="Click to view full image in high resolution"
                    >
                      <img
                        src={fileData.previewUrl}
                        alt={fileData.name}
                        className="max-h-80 sm:max-h-96 w-auto max-w-full rounded-xl object-contain shadow-sm hover:opacity-95 transition-opacity"
                        loading="eager"
                      />
                    </a>
                  ) : fileData.mimeType?.startsWith("video/") ? (
                    <video controls className="max-h-80 sm:max-h-96 w-full rounded-xl">
                      <source src={fileData.previewUrl} type={fileData.mimeType} />
                      Your browser does not support video playback.
                    </video>
                  ) : null}
                </div>
              )}

              {/* Password prompt if required */}
              {requiresPassword ? (
                <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-1">
                  <div className="p-3.5 rounded-xl bg-[#EFF6F0]/60 dark:bg-[#16261D]/70 border border-[#DCE8DE] dark:border-[#1D3325] flex items-start gap-3">
                    <Lock className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                    <div className="text-xs text-[#0E1B13] dark:text-[#F0FDF4]">
                      <p className="font-semibold text-[#10B981] dark:text-[#34D399]">
                        Passphrase Protected
                      </p>
                      <p className="text-[#536E5A] dark:text-[#8EA895] mt-0.5">
                        The sender has locked this download with a secret password.
                      </p>
                    </div>
                  </div>

                  <Input
                    label="Enter Passphrase"
                    type="password"
                    placeholder="Enter password to unlock"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                  />

                  <Button type="submit" variant="primary" className="w-full">
                    Unlock & Download
                  </Button>
                </form>
              ) : (
                <div className="space-y-4 pt-1">
                  <Button
                    size="lg"
                    variant="primary"
                    className="w-full text-base font-bold shadow-glow"
                    onClick={triggerDownload}
                    isLoading={downloading}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download File ({fileData?.sizeBytes ? formatBytes(fileData.sizeBytes) : "Ready"})
                  </Button>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#536E5A] dark:text-[#8EA895] px-1 pt-1">
                    <span>
                      Downloads: {fileData?.downloadCount || 0}{" "}
                      {fileData?.maxDownloads ? `/ ${fileData.maxDownloads}` : ""}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-[#34D399]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Clean
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Modal */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Share via QR Code"
        description="Scan to open this download page directly on another phone or tablet."
      >
        <QrCodeDisplay value={sharePageUrl} label={fileData?.name || "Dropza File"} />
      </Modal>

      {/* Abuse Report Modal */}
      <Modal
        isOpen={showAbuseModal}
        onClose={() => setShowAbuseModal(false)}
        title="Report Inappropriate Content"
        description="Dropza strictly prohibits malware, copyrighted material, phishing, and unlawful files."
      >
        <form onSubmit={handleReportAbuse} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">
              Reason for Report
            </label>
            <select
              value={abuseReason}
              onChange={(e) => setAbuseReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#111C15] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] outline-none"
            >
              <option value="malware_or_virus">Malware, Virus, or Ransomware</option>
              <option value="phishing_or_scam">Phishing or Fraudulent Scheme</option>
              <option value="copyright_infringement">Copyright or Trademark Infringement</option>
              <option value="illegal_content">Illegal or Harmful Content</option>
              <option value="harassment">Harassment or Defamation</option>
              <option value="other">Other Violation</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4]">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={abuseDetails}
              onChange={(e) => setAbuseDetails(e.target.value)}
              placeholder="Provide any additional context to assist moderation..."
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#111C15] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] placeholder:text-[#536E5A]/60 dark:placeholder:text-[#8EA895]/60 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAbuseModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" isLoading={abuseSubmitting}>
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
