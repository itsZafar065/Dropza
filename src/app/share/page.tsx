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
  xhr?: XMLHttpRequest;
}

function SharePageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<UploadItem[]>([]);
  const [recentShares, setRecentShares] = useState<RecentShareItem[]>([]);
  const [expiryHours, setExpiryHours] = useState<string>("24");
  const [password, setPassword] = useState("");
  const [maxDownloads, setMaxDownloads] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // QR Modal
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Load saved preferences and restore staged files & recent shares from IndexedDB
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dropza_default_expiry");
      if (saved && ["1", "24", "168"].includes(saved)) {
        setExpiryHours(saved);
      }
    }

    // Restore staged files so refreshing the page never loses selected files
    getStagedFiles().then((staged) => {
      if (staged && staged.length > 0) {
        setFiles((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const restored: UploadItem[] = staged
            .filter((s) => !existingIds.has(s.id))
            .map((s) => ({
              id: s.id,
              file: s.file,
              progress: 0,
              status: "idle",
            }));
          if (restored.length > 0) {
            toast.info(`Restored ${restored.length} selected file(s) from your session.`);
          }
          return [...prev, ...restored];
        });
      }
    });

    // Restore recent shares generated on this device
    loadRecentShares();

    // Auto-open file browser if requested in query param (e.g. from Home page)
    if (searchParams.get("action") === "browse") {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }
  }, [searchParams]);

  const loadRecentShares = async () => {
    const list = await getRecentShares();
    setRecentShares(list);
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newItems: UploadItem[] = Array.from(selectedFiles).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      progress: 0,
      status: "idle",
    }));

    setFiles((prev) => [...prev, ...newItems]);

    // Persist to IndexedDB so page refreshes never wipe selected files
    await saveStagedFiles(newItems.map((item) => ({ id: item.id, file: item.file })));
  };

  const removeFile = async (id: string) => {
    setFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.xhr && target.status === "uploading") {
        target.xhr.abort();
      }
      return prev.filter((item) => item.id !== id);
    });

    // Remove from local persistence
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
    const idleFiles = files.filter((f) => f.status === "idle" || f.status === "error" || f.status === "cancelled");
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

      // Track XHR instance for cancellation
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
          // Step 3: Complete upload verification on backend
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

              // Remove from staged files and save to recent shares in IndexedDB
              await removeStagedFile(item.id);
              await saveRecentShare({
                id: item.id,
                name: item.file.name,
                sizeBytes: item.file.size,
                mimeType: item.file.type || "application/octet-stream",
                shareUrl: meta.shareUrl,
                token: meta.token,
                expiresAt: meta.expiresAt,
              });
              await loadRecentShares();

              toast.success(`"${item.file.name}" ready to share!`);
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
                ? { ...f, status: "error", errorMessage: `Storage responded with status ${xhr.status}` }
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

  const revokeLink = async (token: string, fileId?: string) => {
    try {
      const res = await fetch(`/api/share/${token}/revoke`, { method: "POST" });
      if (res.ok) {
        toast.info("Link revoked. It is no longer accessible.");
        if (fileId) {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, status: "cancelled", errorMessage: "Link Revoked" } : f))
          );
        }
        await removeRecentShare(token);
        await loadRecentShares();
      } else {
        const data = await res.json();
        toast.error("Revoke failed", data.error);
      }
    } catch {
      toast.error("Failed to revoke link");
    }
  };

  const handleDismissRecentShare = async (token: string) => {
    await removeRecentShare(token);
    await loadRecentShares();
    toast.info("Removed from recent list");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8 w-full">
      {/* Header */}
      <div className="space-y-2 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-[#16261D] text-[#059669] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold">
          <CloudUpload className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Private Cloud Storage</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight">
          Cloud File Sharing
        </h1>
        <p className="text-[#536E5A] dark:text-[#8EA895] text-xs sm:text-sm">
          Upload any file, configure self-destruct timers, and generate private download links with QR codes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Upload & Dropzone Area (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          <div
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
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-10 md:p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-[#10B981] bg-emerald-500/10 scale-[1.01] shadow-glow"
                : "border-[#DCE8DE] dark:border-[#1D3325] bg-white dark:bg-[#111C15] hover:border-[#10B981]/60 hover:bg-[#F0F6F1] dark:hover:bg-[#16261D]"
            }`}
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 dark:bg-[#16261D] border border-emerald-500/20 dark:border-[#1D3325] flex items-center justify-center text-[#10B981] dark:text-[#34D399]">
              <CloudUpload className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4]">
              Drag & drop your files here
            </h3>
            <p className="text-xs text-[#536E5A] dark:text-[#8EA895] mt-1">
              or click to browse from your device • Files persist across page refreshes
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[#536E5A]/80 dark:text-[#8EA895]/80">
              <span>Supports any file format</span>
              <span>•</span>
              <span>Up to 50MB (2GB logged in)</span>
            </div>
          </div>

          {/* Queued / Uploaded Files List */}
          {files.length > 0 && (
            <Card className="border-[#DCE8DE] dark:border-[#1D3325]">
              <CardHeader className="pb-3 border-b border-[#DCE8DE] dark:border-[#1D3325]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-[#0E1B13] dark:text-[#F0FDF4]">
                    Files Selected ({files.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setFiles([]);
                        await clearStagedFiles();
                        toast.info("Cleared selected files");
                      }}
                      className="text-xs text-[#536E5A] dark:text-[#8EA895] hover:text-rose-500 transition-colors px-2 py-1"
                    >
                      Clear All
                    </button>
                    {files.some((f) => f.status === "idle" || f.status === "error") && (
                      <Button
                        size="sm"
                        onClick={startUploadPipeline}
                        isLoading={isUploading}
                      >
                        <CloudUpload className="w-4 h-4 mr-1.5" />
                        Upload All
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-[#DCE8DE] dark:divide-[#1D3325]">
                {files.map((item) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EFF6F0] dark:bg-[#16261D] border border-[#DCE8DE] dark:border-[#1D3325] flex items-center justify-center text-[#10B981] shrink-0">
                          <FileIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0E1B13] dark:text-[#F0FDF4] truncate">
                            {item.file.name}
                          </p>
                          <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">
                            {formatBytes(item.file.size)} • {item.file.type || "binary"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "completed" && (
                          <Badge variant="emerald">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </Badge>
                        )}
                        {item.status === "uploading" && (
                          <Badge variant="emerald">
                            {item.progress}%
                          </Badge>
                        )}
                        {item.status === "error" && (
                          <Badge variant="rose">Error</Badge>
                        )}
                        {item.status === "cancelled" && (
                          <Badge variant="outline">Cancelled</Badge>
                        )}

                        {item.status === "uploading" ? (
                          <button
                            onClick={() => cancelUpload(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-[#F0F6F1] dark:hover:bg-[#16261D]"
                            title="Cancel upload"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => removeFile(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-[#F0F6F1] dark:hover:bg-[#16261D]"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Upload progress bar */}
                    {item.status === "uploading" && (
                      <Progress value={item.progress} />
                    )}

                    {/* Error message */}
                    {item.errorMessage && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.errorMessage}</span>
                      </p>
                    )}

                    {/* Share details upon completion */}
                    {item.status === "completed" && item.shareUrl && (
                      <div className="mt-3 p-3.5 rounded-xl bg-[#EFF6F0] dark:bg-[#16261D] border border-[#DCE8DE] dark:border-[#1D3325] space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                          <span className="font-semibold text-[#10B981] dark:text-[#34D399]">
                            Share Link Generated:
                          </span>
                          <span className="text-[#536E5A] dark:text-[#8EA895] text-[11px]">
                            {item.expiresAt ? formatTimeRemaining(item.expiresAt) : "Active"}
                          </span>
                        </div>

                        {/* Responsive Share Link Bar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={item.shareUrl}
                            className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-[#0E1B13] dark:text-[#F0FDF4] font-mono select-all truncate"
                          />
                          <div className="flex items-center gap-1.5 justify-end shrink-0">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => copyToClipboard(item.shareUrl!, item.token!)}
                              className="px-3 py-1.5 text-xs flex-1 sm:flex-none"
                            >
                              {copiedToken === item.token ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                              <span>{copiedToken === item.token ? "Copied" : "Copy"}</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setQrModalUrl(item.shareUrl!)}
                              className="px-2.5 py-1.5 text-xs"
                              title="Show QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </Button>
                            <Link href={item.shareUrl} target="_blank">
                              <Button size="sm" variant="outline" className="px-2.5 py-1.5 text-xs" title="Open share link">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => revokeLink(item.token!, item.id)}
                            className="text-[11px] text-rose-500 hover:underline flex items-center gap-1"
                          >
                            <Ban className="w-3 h-3" /> Revoke link now
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
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
                      Active links created from this browser (persists on refresh)
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{recentShares.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-[#DCE8DE] dark:divide-[#1D3325]">
                {recentShares.map((rs) => (
                  <div key={rs.token} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#EFF6F0] dark:bg-[#16261D] border border-[#DCE8DE] dark:border-[#1D3325] flex items-center justify-center text-[#10B981] shrink-0">
                          <FileIcon className="w-4 h-4" />
                        </div>
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
                Customize access rules before sharing
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
                  disabled={files.length === 0 || isUploading}
                  isLoading={isUploading}
                >
                  <CloudUpload className="w-4 h-4 mr-2" />
                  Upload & Generate Links
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
