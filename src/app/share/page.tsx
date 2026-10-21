"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CloudUpload,
  File as FileIcon,
  X,
  Lock,
  Clock,
  Shield,
  Copy,
  Check,
  QrCode,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Ban,
  RotateCw,
  Plus,
  Download,
  Eye,
  Wifi,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  FileText,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Modal } from "@/components/ui/Modal";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { formatBytes, formatTimeRemaining } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  saveStagedFiles,
  getStagedFiles,
  removeStagedFile,
  clearStagedFiles,
  saveRecentShare,
  getRecentShares,
  removeRecentShare,
  RecentShareItem,
} from "@/lib/client-cache";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "idle" | "uploading" | "completed" | "error" | "cancelled";
  errorMessage?: string;
  shareUrl?: string;
  token?: string;
  expiresAt?: string;
  previewUrl?: string;
  xhr?: XMLHttpRequest;
}

interface NetworkFileItem {
  token: string;
  fileName: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  expiresAt: string;
  hasPassword: boolean;
  downloadCount: number;
  maxDownloads: number | null;
  shareUrl: string;
  previewUrl: string | null;
}

function SharePageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<UploadItem[]>([]);
  const [networkFiles, setNetworkFiles] = useState<NetworkFileItem[]>([]);
  const [recentShares, setRecentShares] = useState<RecentShareItem[]>([]);
  const [expiryHours, setExpiryHours] = useState<string>("24");
  const [password, setPassword] = useState("");
  const [maxDownloads, setMaxDownloads] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSyncingNetwork, setIsSyncingNetwork] = useState(false);

  // Lightbox Modal for Full Previews
  const [lightboxItem, setLightboxItem] = useState<{
    url: string;
    name: string;
    sizeBytes?: number;
    mimeType?: string;
    token?: string;
    shareUrl?: string;
  } | null>(null);

  // QR Modal
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Load saved preferences, staged files, network files, and recent shares
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dropza_default_expiry");
      if (saved && ["1", "24", "168"].includes(saved)) {
        setExpiryHours(saved);
      }
    }

    // Restore staged files from IndexedDB
    getStagedFiles().then((staged) => {
      if (staged && staged.length > 0) {
        setFiles((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const restored: UploadItem[] = staged
            .filter((s) => !existingIds.has(s.id))
            .map((s) => {
              let previewUrl: string | undefined = undefined;
              if (s.file.type.startsWith("image/") || s.file.type.startsWith("video/")) {
                try {
                  previewUrl = URL.createObjectURL(s.file);
                } catch {
                  // Fallback
                }
              }
              return {
                id: s.id,
                file: s.file,
                progress: 0,
                status: "idle",
                previewUrl,
              };
            });
          return [...prev, ...restored];
        });
      }
    });

    // Load recent shares & network files
    loadRecentShares();
    fetchNetworkFiles(false);

    // Auto-sync with network every 10 seconds and on window focus
    const interval = setInterval(() => {
      fetchNetworkFiles(true);
    }, 10000);

    const onFocus = () => {
      fetchNetworkFiles(true);
    };
    window.addEventListener("focus", onFocus);

    // Auto-open file browser if requested in query param
    if (searchParams.get("action") === "browse") {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [searchParams]);

  const loadRecentShares = async () => {
    const list = await getRecentShares();
    setRecentShares(list);
  };

  const fetchNetworkFiles = async (quiet: boolean = false) => {
    if (!quiet) setIsSyncingNetwork(true);
    try {
      const res = await fetch("/api/share/network");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.files)) {
          setNetworkFiles(data.files);
        }
      }
    } catch (e) {
      console.warn("Failed to sync network files", e);
    } finally {
      if (!quiet) setIsSyncingNetwork(false);
    }
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newItems: UploadItem[] = Array.from(selectedFiles).map((file) => {
      let previewUrl: string | undefined = undefined;
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        try {
          previewUrl = URL.createObjectURL(file);
        } catch {
          // Fallback
        }
      }
      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        progress: 0,
        status: "idle",
        previewUrl,
      };
    });

    setFiles((prev) => [...prev, ...newItems]);
    await saveStagedFiles(newItems.map((item) => ({ id: item.id, file: item.file })));
  };

  const removeFile = async (id: string) => {
    setFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.xhr && target.status === "uploading") {
        target.xhr.abort();
      }
      if (target?.previewUrl && target.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });

    await removeStagedFile(id);
  };

  const cancelUpload = (id: string) => {
    setFiles((prev) =>
      prev.map((item) => {
        if (item.id === id && item.xhr) {
          item.xhr.abort();
          return { ...item, status: "cancelled", errorMessage: "Upload cancelled" };
        }
        return item;
      })
    );
  };

  const startUploadPipeline = async () => {
    const idleFiles = files.filter(
      (f) => f.status === "idle" || f.status === "error" || f.status === "cancelled"
    );
    if (idleFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Step 1: Request presigned URLs from backend
      const initiatePayload = {
        files: idleFiles.map((f) => ({
          name: f.file.name,
          sizeBytes: f.file.size,
          mimeType: f.file.type || "application/octet-stream",
        })),
        expiryHours,
        password: password.trim() || undefined,
        maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : undefined,
      };

      const initRes = await fetch("/api/uploads/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initiatePayload),
      });

      const initData = await initRes.json();

      if (!initRes.ok) {
        toast.error("Upload failed", initData.error || "Could not initialize upload");
        setIsUploading(false);
        return;
      }

      // Step 2: Upload each file directly to the presigned storage URL
      const uploadsMap = new Map();
      initData.uploads.forEach((u: any, idx: number) => {
        if (idleFiles[idx]) {
          uploadsMap.set(idleFiles[idx].id, u);
        }
      });

      for (const item of idleFiles) {
        const uploadMeta = uploadsMap.get(item.id);
        if (!uploadMeta) continue;

        await uploadSingleFile(item, uploadMeta);
      }

      // Re-fetch network files to guarantee new uploads appear on the local Wi-Fi board
      await fetchNetworkFiles(true);
    } catch (err: any) {
      console.error("Upload error", err);
      toast.error("Upload Error", err?.message || "Failed to process files");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSingleFile = (item: UploadItem, meta: any) => {
    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();

      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", xhr } : f))
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress } : f))
          );
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const compRes = await fetch("/api/uploads/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileAssetId: meta.fileAssetId,
                storageKey: meta.storageKey,
              }),
            });

            if (compRes.ok) {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === item.id
                    ? {
                        ...f,
                        status: "completed",
                        progress: 100,
                        shareUrl: meta.shareUrl,
                        token: meta.token,
                        expiresAt: meta.expiresAt,
                      }
                    : f
                )
              );

              await removeStagedFile(item.id);
              await saveRecentShare({
                id: item.id,
                name: item.file.name,
                sizeBytes: item.file.size,
                mimeType: item.file.type || "application/octet-stream",
                shareUrl: meta.shareUrl,
                token: meta.token,
                expiresAt: meta.expiresAt,
                previewUrl: item.previewUrl,
              });
              await loadRecentShares();

              toast.success(`"${item.file.name}" uploaded successfully!`);
            } else {
              const compErr = await compRes.json();
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === item.id
                    ? { ...f, status: "error", errorMessage: compErr.error || "Verification failed" }
                    : f
                )
              );
            }
          } catch {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id ? { ...f, status: "error", errorMessage: "Completion failed" } : f
              )
            );
          }
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, status: "error", errorMessage: `Storage error (${xhr.status})` }
                : f
            )
          );
        }
        resolve();
      };

      xhr.onerror = () => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "error", errorMessage: "Network error during upload" }
              : f
          )
        );
        resolve();
      };

      xhr.onabort = () => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "cancelled", errorMessage: "Upload cancelled" }
              : f
          )
        );
        resolve();
      };

      xhr.open(meta.uploadMethod || "PUT", meta.uploadUrl, true);
      if (meta.uploadHeaders) {
        Object.entries(meta.uploadHeaders).forEach(([k, v]) => {
          xhr.setRequestHeader(k, v as string);
        });
      }
      xhr.send(item.file);
    });
  };

  const copyToClipboard = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleDirectDownload = async (token: string, fallbackName: string) => {
    try {
      const res = await fetch(`/api/share/${token}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresPassword) {
          window.open(`/s/${token}`, "_blank");
          return;
        }
        toast.error("Download failed", data.error || "Unable to download");
        return;
      }

      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = data.fileName || fallbackName;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 150);
        toast.success("Download started!");
      }
    } catch (err: any) {
      toast.error("Download Error", err?.message || "Failed to download file");
    }
  };

  const revokeNetworkFile = async (token: string) => {
    try {
      const res = await fetch(`/api/share/${token}/revoke`, { method: "POST" });
      if (res.ok) {
        toast.info("File removed from network.");
        setNetworkFiles((prev) => prev.filter((f) => f.token !== token));
        await removeRecentShare(token);
        await loadRecentShares();
      } else {
        const d = await res.json();
        toast.error("Failed to revoke", d.error);
      }
    } catch {
      toast.error("Failed to revoke file");
    }
  };

  const handleClearAllNetwork = async () => {
    if (!confirm("Are you sure you want to remove all files shared on this Wi-Fi network?")) {
      return;
    }
    try {
      const res = await fetch("/api/share/network", { method: "DELETE" });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message || "All files removed from this network");
        setNetworkFiles([]);
      } else {
        toast.error("Clear failed", d.error);
      }
    } catch {
      toast.error("Failed to clear network files");
    }
  };

  const handleDismissRecentShare = async (token: string) => {
    await removeRecentShare(token);
    await loadRecentShares();
    toast.info("Removed from recent list");
  };

  const idleFilesCount = files.filter(
    (f) => f.status === "idle" || f.status === "error" || f.status === "cancelled"
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 w-full">
      {/* Header with Wi-Fi Network Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-[#16261D] text-[#059669] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Wifi className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Wi-Fi Network Sync Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight">
            Files & Gallery
          </h1>
          <p className="text-[#536E5A] dark:text-[#8EA895] text-xs sm:text-sm">
            Files uploaded from any device on your Wi-Fi appear here automatically with visual previews.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchNetworkFiles(false)}
            isLoading={isSyncingNetwork}
            title="Refresh files on this Wi-Fi"
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncingNetwork ? "animate-spin" : ""}`} />
            <span>Sync Wi-Fi</span>
          </Button>

          {networkFiles.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearAllNetwork}
              title="Delete all files on this Wi-Fi"
              className="text-xs text-rose-500 hover:text-rose-600 hover:border-rose-500/40"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Delete All</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Main Files Gallery (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {/* AirForShare-Style Visual Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4]">
                  Shared Files
                </h2>
                <Badge variant="emerald" className="text-xs">
                  {networkFiles.length + files.length} item(s)
                </Badge>
              </div>

              {idleFilesCount > 0 && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={startUploadPipeline}
                  isLoading={isUploading}
                  className="text-xs px-3 py-1.5 shadow-sm"
                >
                  <CloudUpload className="w-4 h-4 mr-1.5" />
                  <span>Upload Selected ({idleFilesCount})</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 sm:gap-4">
              {/* 1. Staged / Uploading Local Files Cards */}
              {files.map((item) => {
                const isImage = item.file.type.startsWith("image/");
                const isVideo = item.file.type.startsWith("video/");
                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col rounded-2xl border border-[#DCE8DE] dark:border-[#1D3325] bg-white dark:bg-[#111C15] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {/* Thumbnail / Media Container */}
                    <div
                      className="relative w-full aspect-square bg-[#EFF6F0]/70 dark:bg-[#16261D] flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => {
                        if (item.previewUrl) {
                          setLightboxItem({
                            url: item.previewUrl,
                            name: item.file.name,
                            sizeBytes: item.file.size,
                            mimeType: item.file.type,
                            token: item.token,
                            shareUrl: item.shareUrl,
                          });
                        }
                      }}
                    >
                      {item.previewUrl && isImage ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : item.previewUrl && isVideo ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/80 text-white">
                          <video
                            src={item.previewUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Eye className="w-8 h-8 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-[#10B981] flex items-center justify-center mb-2">
                            <FileIcon className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#536E5A] dark:text-[#8EA895]">
                            {item.file.name.split(".").pop() || "FILE"}
                          </span>
                        </div>
                      )}

                      {/* Status Overlay Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        {item.status === "completed" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981] text-white shadow-sm flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" /> Ready
                          </span>
                        )}
                        {item.status === "uploading" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm animate-pulse">
                            {item.progress}%
                          </span>
                        )}
                        {item.status === "error" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                            Error
                          </span>
                        )}
                        {item.status === "idle" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 backdrop-blur-sm text-white">
                            Selected
                          </span>
                        )}
                      </div>

                      {/* Remove / Cancel Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.status === "uploading") {
                            cancelUpload(item.id);
                          } else {
                            removeFile(item.id);
                          }
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow-sm"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Progress Bar during Upload */}
                      {item.status === "uploading" && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
                          <div
                            className="h-full bg-[#10B981] transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <p
                          className="text-xs font-bold text-[#0E1B13] dark:text-[#F0FDF4] truncate"
                          title={item.file.name}
                        >
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-[#536E5A] dark:text-[#8EA895] mt-0.5">
                          {formatBytes(item.file.size)}
                        </p>
                      </div>

                      {/* Share link quick actions when completed */}
                      {item.status === "completed" && item.shareUrl && (
                        <div className="pt-1 flex items-center justify-between border-t border-[#DCE8DE] dark:border-[#1D3325]">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.shareUrl!, item.token!)}
                            className="text-xs font-semibold text-[#10B981] hover:underline flex items-center gap-1"
                            title="Copy link"
                          >
                            {copiedToken === item.token ? (
                              <>
                                <Check className="w-3 h-3" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setQrModalUrl(item.shareUrl!)}
                            className="p-1 text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981]"
                            title="QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <Link href={item.shareUrl} target="_blank">
                            <button
                              type="button"
                              className="p-1 text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981]"
                              title="Open download page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 2. Wi-Fi Synced Cloud Files Cards (From Same Network) */}
              {networkFiles.map((nf) => {
                const isImage = nf.mimeType.startsWith("image/");
                const isVideo = nf.mimeType.startsWith("video/");
                return (
                  <div
                    key={nf.token}
                    className="group relative flex flex-col rounded-2xl border border-[#DCE8DE] dark:border-[#1D3325] bg-white dark:bg-[#111C15] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {/* Media Thumbnail Container */}
                    <div
                      className="relative w-full aspect-square bg-[#EFF6F0]/70 dark:bg-[#16261D] flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => {
                        if (nf.previewUrl) {
                          setLightboxItem({
                            url: nf.previewUrl,
                            name: nf.fileName,
                            sizeBytes: nf.sizeBytes,
                            mimeType: nf.mimeType,
                            token: nf.token,
                            shareUrl: nf.shareUrl,
                          });
                        } else {
                          window.open(nf.shareUrl, "_blank");
                        }
                      }}
                    >
                      {nf.previewUrl && isImage ? (
                        <img
                          src={nf.previewUrl}
                          alt={nf.fileName}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : nf.previewUrl && isVideo ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/80 text-white">
                          <video
                            src={nf.previewUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Eye className="w-8 h-8 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-[#10B981] flex items-center justify-center mb-2">
                            <FileIcon className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#536E5A] dark:text-[#8EA895]">
                            {nf.fileName.split(".").pop() || "FILE"}
                          </span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981] text-white shadow-sm flex items-center gap-1">
                          <Wifi className="w-2.5 h-2.5" /> Wi-Fi
                        </span>
                        {nf.hasPassword && (
                          <span className="p-1 rounded-full bg-amber-500 text-white shadow-sm" title="Passphrase protected">
                            <Lock className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Delete / Revoke from network */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          revokeNetworkFile(nf.token);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow-sm opacity-80 group-hover:opacity-100"
                        title="Remove file from Wi-Fi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Click to Preview Hover Overlay */}
                      {nf.previewUrl && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                            <Eye className="w-3.5 h-3.5" /> Preview
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Action Bar */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <p
                          className="text-xs font-bold text-[#0E1B13] dark:text-[#F0FDF4] truncate"
                          title={nf.fileName}
                        >
                          {nf.fileName}
                        </p>
                        <p className="text-[11px] text-[#536E5A] dark:text-[#8EA895] mt-0.5 flex items-center justify-between">
                          <span>{formatBytes(nf.sizeBytes)}</span>
                          <span>{formatTimeRemaining(nf.expiresAt)}</span>
                        </p>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 flex items-center justify-between border-t border-[#DCE8DE] dark:border-[#1D3325]">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleDirectDownload(nf.token, nf.fileName)}
                          className="px-2.5 py-1 text-xs h-7 flex-1 mr-1.5"
                          title="Download file"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          <span>Download</span>
                        </Button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(nf.shareUrl, nf.token)}
                          className="p-1.5 rounded-lg text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] hover:bg-[#EFF6F0] dark:hover:bg-[#16261D]"
                          title="Copy share link"
                        >
                          {copiedToken === nf.token ? (
                            <Check className="w-3.5 h-3.5 text-[#10B981]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setQrModalUrl(nf.shareUrl)}
                          className="p-1.5 rounded-lg text-[#536E5A] dark:text-[#8EA895] hover:text-[#10B981] hover:bg-[#EFF6F0] dark:hover:bg-[#16261D]"
                          title="Show QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 3. AirForShare-Style "+ Add File" Card */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelect(e.dataTransfer.files);
                }}
                className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-200 group text-center select-none ${
                  isDragging
                    ? "border-[#10B981] bg-emerald-500/10 scale-[1.02] shadow-glow"
                    : "border-[#DCE8DE] dark:border-[#1D3325] bg-emerald-500/5 dark:bg-[#111C15]/50 hover:border-[#10B981] hover:bg-emerald-500/10"
                }`}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/20 text-[#10B981] flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
                  <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
                </div>
                <p className="text-sm font-bold text-[#0E1B13] dark:text-[#F0FDF4] group-hover:text-[#10B981] transition-colors">
                  Add File
                </p>
                <p className="text-[11px] text-[#536E5A] dark:text-[#8EA895] mt-0.5">
                  (up to 50MB)
                </p>
              </div>
            </div>
          </div>

          {/* Fallback Empty State if 0 files */}
          {files.length === 0 && networkFiles.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 sm:p-12 rounded-3xl border border-dashed border-[#DCE8DE] dark:border-[#1D3325] text-center bg-white dark:bg-[#111C15] cursor-pointer hover:border-[#10B981]/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-[#10B981] flex items-center justify-center mx-auto mb-3">
                <CloudUpload className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#0E1B13] dark:text-[#F0FDF4]">
                No files shared on this Wi-Fi yet
              </h3>
              <p className="text-xs text-[#536E5A] dark:text-[#8EA895] mt-1 max-w-sm mx-auto">
                Click "+ Add File" above or drag files here. Anyone on your Wi-Fi network will see them instantly.
              </p>
            </div>
          )}

          {/* Recent Shares on this Device (Persistent across refreshes) */}
          {recentShares.length > 0 && (
            <Card className="border-[#DCE8DE] dark:border-[#1D3325]">
              <CardHeader className="pb-3 border-b border-[#DCE8DE] dark:border-[#1D3325]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>Recent Shares on this Device</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Active links created from this browser
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{recentShares.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-[#DCE8DE] dark:divide-[#1D3325]">
                {recentShares.map((rs) => (
                  <div key={rs.token} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {rs.previewUrl && rs.mimeType.startsWith("image/") ? (
                          <img
                            src={rs.previewUrl}
                            alt={rs.name}
                            className="w-10 h-10 rounded-lg object-cover border border-[#DCE8DE] dark:border-[#1D3325] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#EFF6F0] dark:bg-[#16261D] border border-[#DCE8DE] dark:border-[#1D3325] flex items-center justify-center text-[#10B981] shrink-0">
                            <FileIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0E1B13] dark:text-[#F0FDF4] truncate">
                            {rs.name}
                          </p>
                          <p className="text-[11px] text-[#536E5A] dark:text-[#8EA895]">
                            {formatBytes(rs.sizeBytes)} • {rs.expiresAt ? formatTimeRemaining(rs.expiresAt) : "Active"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard(rs.shareUrl, rs.token)}
                          className="px-2.5 py-1 text-xs"
                        >
                          {copiedToken === rs.token ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setQrModalUrl(rs.shareUrl)}
                          className="px-2 py-1 text-xs"
                          title="Show QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </Button>
                        <Link href={rs.shareUrl} target="_blank">
                          <Button size="sm" variant="outline" className="px-2 py-1 text-xs" title="Open share link">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <button
                          onClick={() => handleDismissRecentShare(rs.token)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors ml-1"
                          title="Dismiss from list"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Share Settings Panel (Right 1 col) */}
        <div className="space-y-6">
          <Card className="border-[#DCE8DE] dark:border-[#1D3325]">
            <CardHeader className="pb-4 border-b border-[#DCE8DE] dark:border-[#1D3325]">
              <CardTitle className="text-base flex items-center gap-2 text-[#0E1B13] dark:text-[#F0FDF4]">
                <Shield className="w-4 h-4 text-[#10B981]" />
                <span>Security & Expiry</span>
              </CardTitle>
              <CardDescription>
                Access rules applied to new uploads
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5 text-left">
              {/* Expiry Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Self-Destruct Expiration</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {[
                    { value: "1", label: "1 Hour" },
                    { value: "24", label: "24 Hours" },
                    { value: "168", label: "7 Days" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExpiryHours(opt.value)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        expiryHours === opt.value
                          ? "bg-[#10B981] text-white font-semibold border-[#10B981] shadow-sm"
                          : "bg-white dark:bg-[#0B120E] border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] hover:border-[#10B981]/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#536E5A] dark:text-[#8EA895] mt-1">
                  Files and share links are purged when expired.
                </p>
              </div>

              {/* Password Protection */}
              <div className="space-y-1.5">
                <Input
                  label="Password Protection (Optional)"
                  type="password"
                  placeholder="Set secret passphrase"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Recipients must enter this passphrase to download"
                />
              </div>

              {/* Download Limit */}
              <div className="space-y-1.5">
                <Input
                  label="Download Limit (Optional)"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="e.g. 5 downloads"
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(e.target.value)}
                  helperText="Link self-destructs after this number of downloads"
                />
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  variant="primary"
                  onClick={startUploadPipeline}
                  disabled={idleFilesCount === 0 || isUploading}
                  isLoading={isUploading}
                >
                  <CloudUpload className="w-4 h-4 mr-2" />
                  Upload Selected ({idleFilesCount})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Wi-Fi Sharing Explainer */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-[#111C15] border border-emerald-500/20 text-xs text-[#536E5A] dark:text-[#8EA895] space-y-2">
            <p className="font-semibold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
              How AirForShare Sync Works:
            </p>
            <p className="leading-relaxed">
              Open <strong>dropza-six.vercel.app</strong> on your mobile and PC while on the same Wi-Fi. Files uploaded from your mobile appear automatically on your PC without needing to type links!
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {lightboxItem && (
        <Modal
          isOpen={Boolean(lightboxItem)}
          onClose={() => setLightboxItem(null)}
          title={lightboxItem.name}
          description={`${lightboxItem.sizeBytes ? formatBytes(lightboxItem.sizeBytes) : ""} ${
            lightboxItem.mimeType ? "• " + lightboxItem.mimeType : ""
          }`}
        >
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl overflow-hidden border border-[#DCE8DE] dark:border-[#1D3325] bg-black/90 flex items-center justify-center p-2 max-h-[60vh]">
              {lightboxItem.mimeType?.startsWith("image/") ? (
                <img
                  src={lightboxItem.url}
                  alt={lightboxItem.name}
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded-xl"
                />
              ) : lightboxItem.mimeType?.startsWith("video/") ? (
                <video
                  src={lightboxItem.url}
                  controls
                  autoPlay
                  className="max-h-[55vh] w-full rounded-xl"
                />
              ) : (
                <div className="p-8 text-white text-center">
                  <FileIcon className="w-12 h-12 mx-auto mb-2 text-[#10B981]" />
                  <p className="text-sm font-semibold">{lightboxItem.name}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {lightboxItem.token ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleDirectDownload(lightboxItem.token!, lightboxItem.name)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>Download File</span>
                </Button>
              ) : (
                <a
                  href={lightboxItem.url}
                  download={lightboxItem.name}
                  className="flex-1"
                >
                  <Button variant="primary" size="sm" className="w-full">
                    <Download className="w-4 h-4 mr-1.5" />
                    <span>Download File</span>
                  </Button>
                </a>
              )}

              {lightboxItem.shareUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(lightboxItem.shareUrl!);
                    toast.success("Share link copied!");
                  }}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-1.5" />
                  <span>Copy Link</span>
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* QR Code Modal */}
      <Modal
        isOpen={Boolean(qrModalUrl)}
        onClose={() => setQrModalUrl(null)}
        title="Scan to Download"
        description="Scan this QR code with any smartphone camera to open and download the file directly."
      >
        {qrModalUrl && <QrCodeDisplay value={qrModalUrl} label="Dropza Secure Link" />}
      </Modal>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SharePageContent />
    </Suspense>
  );
}
