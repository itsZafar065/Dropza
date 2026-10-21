"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  File as FileIcon,
  Download,
  Trash2,
  Ban,
  Clock,
  Lock,
  ExternalLink,
  CloudUpload,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatBytes, formatTimeRemaining } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface UserFile {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  shareLinks: {
    token: string;
    downloadCount: number;
    maxDownloads: number | null;
    expiresAt: string;
    isRevoked: boolean;
    isPasswordProtected: boolean;
  }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchFiles();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch {
      toast.error("Failed to load upload history");
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this file and revoke all its links?")) return;

    try {
      const res = await fetch(`/api/user/files/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        toast.success("File deleted successfully");
      } else {
        toast.error("Failed to delete file");
      }
    } catch {
      toast.error("Error deleting file");
    }
  };

  const revokeLink = async (token: string) => {
    try {
      const res = await fetch(`/api/share/${token}/revoke`, { method: "POST" });
      if (res.ok) {
        toast.info("Share link revoked");
        fetchFiles();
      } else {
        toast.error("Failed to revoke link");
      }
    } catch {
      toast.error("Error revoking link");
    }
  };

  const copyUrl = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}/s/${token}`);
    setCopiedToken(token);
    toast.success("Link copied!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-10">
        <Card className="max-w-md w-full text-center p-6 sm:p-8 border-[#DCE8DE] dark:border-[#1D3325] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-[#10B981] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] flex items-center justify-center mx-auto">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#0E1B13] dark:text-[#F0FDF4]">Account Required</h2>
            <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">
              Please sign in to view your file upload history and manage active share links.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/login?callbackUrl=/dashboard" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full">Sign In</Button>
            </Link>
            <Link href="/register?callbackUrl=/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">Create Account</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8 w-full">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-[#10B981] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold">
            <LayoutDashboard className="w-3.5 h-3.5 text-[#10B981]" />
            <span>File Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight mt-1">
            My Uploaded Files
          </h1>
          <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">
            Logged in as {session?.user?.email} • 2GB upload limit active
          </p>
        </div>

        <Link href="/share" className="self-start sm:self-auto">
          <Button variant="primary" size="md">
            <CloudUpload className="w-4 h-4 mr-2" /> Upload New File
          </Button>
        </Link>
      </div>

      {/* Files Table / List */}
      {files.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-[#DCE8DE] dark:border-[#1D3325] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6F0] dark:bg-[#16261D] text-[#536E5A] dark:text-[#8EA895] flex items-center justify-center mx-auto border border-[#DCE8DE] dark:border-[#1D3325]">
            <FileIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-[#0E1B13] dark:text-[#F0FDF4]">No files uploaded yet</h3>
          <p className="text-xs text-[#536E5A] dark:text-[#8EA895] max-w-sm mx-auto">
            When you upload files while signed in, they will be listed here with download counters and revocation controls.
          </p>
          <div className="pt-2">
            <Link href="/share">
              <Button variant="outline" size="sm">
                Upload Your First File
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="border-[#DCE8DE] dark:border-[#1D3325] overflow-hidden text-left">
          <CardHeader className="p-4 sm:p-6 border-b border-[#DCE8DE] dark:border-[#1D3325]">
            <CardTitle className="text-sm font-bold text-[#0E1B13] dark:text-[#F0FDF4]">Files ({files.length})</CardTitle>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-[#DCE8DE] dark:divide-[#1D3325]">
            {files.map((file) => (
              <div key={file.id} className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#10B981] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] flex items-center justify-center shrink-0">
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#0E1B13] dark:text-[#F0FDF4] truncate">
                        {file.name}
                      </h4>
                      <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">
                        {formatBytes(file.sizeBytes)} • Uploaded {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFile(file.id)}
                      className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      title="Delete file permanently"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Linked Share Links */}
                {file.shareLinks && file.shareLinks.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#536E5A] dark:text-[#8EA895]">
                      Active Share Links:
                    </p>
                    <div className="space-y-2">
                      {file.shareLinks.map((link) => {
                        const isExpired = new Date() > new Date(link.expiresAt);
                        return (
                          <div
                            key={link.token}
                            className="p-3 rounded-xl bg-[#EFF6F0]/60 dark:bg-[#16261D]/70 border border-[#DCE8DE] dark:border-[#1D3325] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[#0E1B13] dark:text-[#F0FDF4] truncate max-w-[150px] sm:max-w-none">
                                .../s/{link.token.substring(0, 10)}...
                              </span>
                              {link.isRevoked ? (
                                <Badge variant="rose">Revoked</Badge>
                              ) : isExpired ? (
                                <Badge variant="outline">Expired</Badge>
                              ) : (
                                <Badge variant="emerald">Active</Badge>
                              )}
                              {link.isPasswordProtected && (
                                <span title="Protected by password">
                                  <Lock className="w-3.5 h-3.5 text-[#10B981]" />
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 text-[#536E5A] dark:text-[#8EA895]">
                              <span className="flex items-center gap-1">
                                <Download className="w-3.5 h-3.5 text-[#536E5A] dark:text-[#8EA895]" />
                                {link.downloadCount} {link.maxDownloads ? `/ ${link.maxDownloads}` : ""} downloads
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#536E5A] dark:text-[#8EA895]" />
                                {formatTimeRemaining(link.expiresAt)}
                              </span>

                              {!link.isRevoked && !isExpired && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => copyUrl(link.token)}
                                    className="p-1 hover:text-[#10B981] dark:hover:text-[#34D399] transition-colors"
                                    title="Copy link"
                                  >
                                    {copiedToken === link.token ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <Link href={`/s/${link.token}`} target="_blank">
                                    <button className="p-1 hover:text-[#10B981] dark:hover:text-[#34D399] transition-colors" title="Open share page">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  </Link>
                                  <button
                                    onClick={() => revokeLink(link.token)}
                                    className="p-1 text-rose-500 hover:text-rose-600 ml-1 transition-colors"
                                    title="Revoke link immediately"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
