"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Radio,
  Laptop,
  Smartphone,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Copy,
  Check,
  Send,
  Download,
  Ban,
  File as FileIcon,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Modal } from "@/components/ui/Modal";
import { QrCodeDisplay } from "@/components/common/QrCodeDisplay";
import { formatBytes } from "@/lib/utils";
import { WebRTCClient, PeerConnectionState } from "@/lib/webrtc/webrtc-client";
import { FileMetadata } from "@/lib/webrtc/chunker";
import { useToast } from "@/components/ui/Toast";

function DirectTransferContent() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const { toast } = useToast();

  const [mode, setMode] = useState<"choose" | "host" | "join">("choose");
  const [roomCode, setRoomCode] = useState("");
  const [pin, setPin] = useState("");
  const [connectionState, setConnectionState] = useState<PeerConnectionState>("disconnected");
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // File sending state
  const [fileToSend, setFileToSend] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File receiving proposal state
  const [incomingFileMeta, setIncomingFileMeta] = useState<FileMetadata | null>(null);
  const [acceptCallback, setAcceptCallback] = useState<(() => void) | null>(null);
  const [rejectCallback, setRejectCallback] = useState<(() => void) | null>(null);

  // Completed received file
  const [receivedFile, setReceivedFile] = useState<{ blob: Blob; name: string } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const clientRef = useRef<WebRTCClient | null>(null);

  useEffect(() => {
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
      setMode("join");
    }
  }, [roomParam]);

  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const startAsHost = async () => {
    setCreatingRoom(true);
    try {
      const peerId = Math.random().toString(36).substring(2, 10);
      const res = await fetch("/api/transfer/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostPeerId: peerId,
          pin: pin.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to create room", data.error);
        setCreatingRoom(false);
        return;
      }
      setRoomCode(data.roomCode);
      setMode("host");
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `?room=${data.roomCode}`);
      }
      initializeClient(data.roomCode, true, peerId);
    } catch {
      toast.error("Network error creating transfer room");
    } finally {
      setCreatingRoom(false);
    }
  };

  const joinExistingRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;

    setJoiningRoom(true);
    try {
      const peerId = Math.random().toString(36).substring(2, 10);
      const res = await fetch("/api/transfer/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: code,
          peerId,
          pin: pin.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to join room", data.error);
        setJoiningRoom(false);
        return;
      }
      setMode("join");
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `?room=${code}`);
      }
      initializeClient(code, false, peerId);
    } catch {
      toast.error("Network error joining transfer room");
    } finally {
      setJoiningRoom(false);
    }
  };

  const initializeClient = (code: string, isHost: boolean, peerId?: string) => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    const client = new WebRTCClient({
      roomCode: code,
      isHost,
      peerId,
      pin: pin.trim() || undefined,
      onStateChange: (state) => setConnectionState(state),
      onLog: (msg) => addLog(msg),
      onFileProposal: (meta, accept, reject) => {
        setIncomingFileMeta(meta);
        setAcceptCallback(() => accept);
        setRejectCallback(() => reject);
      },
      onProgress: (pct) => setProgress(pct),
      onFileReceived: (blob, fileName) => {
        setReceivedFile({ blob, name: fileName });
        toast.success(`Received "${fileName}"!`);
        // Trigger auto-download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      onError: (err) => {
        toast.error("WebRTC Error", err);
        addLog(`Error: ${err}`);
      },
    });

    clientRef.current = client;
    client.connect();
  };

  const handleSendFile = () => {
    if (!fileToSend || !clientRef.current) return;
    addLog(`Proposing "${fileToSend.name}" (${formatBytes(fileToSend.size)}) to receiver...`);
    clientRef.current.proposeFile(fileToSend);
  };

  const handleAcceptIncoming = () => {
    if (acceptCallback) {
      acceptCallback();
      setIncomingFileMeta(null);
      toast.info("Transfer accepted. Receiving stream...");
    }
  };

  const handleRejectIncoming = () => {
    if (rejectCallback) {
      rejectCallback();
      setIncomingFileMeta(null);
      toast.info("Transfer rejected");
    }
  };

  const copyRoomLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/transfer?room=${roomCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedCode(true);
    toast.success("Room link copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const roomShareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/transfer?room=${roomCode}` : "";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8 w-full">
      {/* Header */}
      <div className="space-y-2 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-[#16261D] text-[#059669] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold">
          <Radio className="w-3.5 h-3.5 text-[#10B981]" />
          <span>WebRTC P2P DataChannels</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight">
          Direct Device Transfer
        </h1>
        <p className="text-[#536E5A] dark:text-[#8EA895] text-xs sm:text-sm">
          Stream files directly between two devices over encrypted WebRTC DataChannels. 0 cloud storage, zero file limits.
        </p>
      </div>

      {mode === "choose" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 pt-2 sm:pt-4 text-left">
          {/* Create Room Option */}
          <Card className="border-[#DCE8DE] dark:border-[#1D3325] hover:border-[#10B981]/50 hover:shadow-glow transition-all p-5 sm:p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-[#16261D] text-[#10B981] dark:text-[#34D399] flex items-center justify-center">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4]">Create Transfer Room</h3>
              <p className="text-xs text-[#536E5A] dark:text-[#8EA895] mt-1 leading-relaxed">
                Start a session from this device. Generates a 6-digit room code and QR code to pair with your phone or laptop.
              </p>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Optional 4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                className="text-center font-mono text-xs tracking-wider"
              />
              <Button variant="primary" className="w-full" onClick={startAsHost} isLoading={creatingRoom}>
                Create Room
              </Button>
            </div>
          </Card>

          {/* Join Room Option */}
          <Card className="border-[#DCE8DE] dark:border-[#1D3325] hover:border-[#10B981]/50 hover:shadow-glow transition-all p-5 sm:p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-[#16261D] text-[#10B981] dark:text-[#34D399] flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4]">Join Transfer Room</h3>
              <p className="text-xs text-[#536E5A] dark:text-[#8EA895] mt-1 leading-relaxed">
                Enter the 6-character room code from the other device to connect and receive files.
              </p>
            </div>
            <form onSubmit={joinExistingRoom} className="space-y-3">
              <Input
                placeholder="e.g. K7N9XP"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono uppercase tracking-widest text-center text-lg font-bold"
                required
              />
              <Input
                placeholder="Optional Room PIN (if protected)"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                className="text-center font-mono text-xs tracking-wider"
              />
              <Button type="submit" variant="secondary" className="w-full" isLoading={joiningRoom}>
                Join Room
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        /* Connected / Active Room Interface */
        <div className="space-y-6">
          <Card className="border-[#DCE8DE] dark:border-[#1D3325] shadow-xl overflow-hidden">
            {/* Room Header bar */}
            <div className="p-4 sm:p-6 bg-[#EFF6F0] dark:bg-[#0B120E] border-b border-[#DCE8DE] dark:border-[#1D3325] flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#536E5A]/80 dark:text-[#8EA895]/80 tracking-wider">
                    Transfer Room Code
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-[#10B981] dark:text-[#34D399]">
                    {roomCode}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
                  <Button size="sm" variant="outline" onClick={copyRoomLink} className="text-xs px-2.5" title="Copy room link">
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowQrModal(true)} className="text-xs px-2.5" title="Show QR">
                    <QrCode className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                {connectionState === "connected" && (
                  <Badge variant="emerald" className="gap-1.5 py-1 px-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    P2P Connected
                  </Badge>
                )}
                {connectionState === "waiting_for_peer" && (
                  <Badge variant="emerald" className="gap-1.5 py-1 px-3">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                    Waiting for Peer
                  </Badge>
                )}
                {connectionState === "transferring" && (
                  <Badge variant="emerald" className="gap-1.5 py-1 px-3">
                    Streaming {progress}%
                  </Badge>
                )}
                {connectionState === "failed" && (
                  <Badge variant="rose" className="gap-1.5 py-1 px-3">
                    Connection Issue
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 text-left">
              {/* Fallback Option if connection fails */}
              {connectionState === "failed" && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Direct WebRTC connection could not be established</span>
                  </div>
                  <p className="leading-relaxed">
                    Direct P2P connectivity may be restricted by strict corporate NAT/firewalls. You can switch to Cloud Sharing to upload encrypted files and share downloadable links instead.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2">
                    <Link href="/share">
                      <Button size="sm" variant="primary">
                        <CloudUpload className="w-3.5 h-3.5 mr-1.5" /> Switch to Cloud Share
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => initializeClient(roomCode, mode === "host")}
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1" /> Retry P2P
                    </Button>
                  </div>
                </div>
              )}

              {/* Connected Action Area */}
              {connectionState === "connected" && (
                <div className="space-y-6">
                  {/* Sender Drop File */}
                  <div className="border border-[#DCE8DE] dark:border-[#1D3325] rounded-2xl p-4 sm:p-6 bg-[#EFF6F0]/50 dark:bg-[#0B120E]/50 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h4 className="text-sm font-bold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-2">
                        <Send className="w-4 h-4 text-[#10B981]" />
                        <span>Send File to Connected Device</span>
                      </h4>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setFileToSend(e.target.files[0]);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="self-start sm:self-auto"
                      >
                        Select File
                      </Button>
                    </div>

                    {fileToSend && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-[#10B981] flex items-center justify-center shrink-0">
                            <FileIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#0E1B13] dark:text-[#F0FDF4] truncate">
                              {fileToSend.name}
                            </p>
                            <p className="text-[11px] text-[#536E5A] dark:text-[#8EA895]">
                              {formatBytes(fileToSend.size)} • Direct P2P
                            </p>
                          </div>
                        </div>

                        <Button size="sm" variant="primary" onClick={handleSendFile} className="shrink-0 w-full sm:w-auto">
                          Stream File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transfer Progress */}
              {connectionState === "transferring" && (
                <div className="p-5 sm:p-6 rounded-2xl bg-[#EFF6F0] dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#10B981] dark:text-[#34D399]">
                      Transferring via WebRTC DataChannel...
                    </span>
                    <span className="font-mono text-[#10B981] font-bold">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => clientRef.current?.cancelTransfer()}
                      className="text-xs text-rose-500 border-rose-500/20 hover:bg-rose-500/10"
                    >
                      <Ban className="w-3.5 h-3.5 mr-1" /> Cancel Transfer
                    </Button>
                  </div>
                </div>
              )}

              {/* Received File Card */}
              {receivedFile && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-[#10B981] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0E1B13] dark:text-[#F0FDF4] truncate">
                        {receivedFile.name}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-[#34D399]">
                        Transfer Complete • {formatBytes(receivedFile.blob.size)}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    className="shrink-0 w-full sm:w-auto"
                    onClick={() => {
                      const url = URL.createObjectURL(receivedFile.blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = receivedFile.name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" /> Save File
                  </Button>
                </div>
              )}

              {/* Live Session Log */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#536E5A]/80 dark:text-[#8EA895]/80">
                  Connection Diagnostic Log
                </span>
                <div className="w-full h-28 p-3 rounded-xl bg-[#EFF6F0] dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] text-[11px] font-mono text-[#536E5A] dark:text-[#8EA895] overflow-y-auto space-y-1">
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Receiver File Accept / Reject Prompt Modal */}
      <Modal
        isOpen={Boolean(incomingFileMeta)}
        onClose={handleRejectIncoming}
        title="Incoming Direct Transfer"
        description="The connected device wants to stream a file directly to your browser."
      >
        {incomingFileMeta && (
          <div className="space-y-5 text-left">
            <div className="p-4 rounded-xl bg-[#EFF6F0] dark:bg-[#0B120E] border border-[#DCE8DE] dark:border-[#1D3325] flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-[#10B981] flex items-center justify-center shrink-0">
                <FileIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#0E1B13] dark:text-[#F0FDF4] truncate">
                  {incomingFileMeta.name}
                </p>
                <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">
                  {formatBytes(incomingFileMeta.size)} • {incomingFileMeta.type || "file"}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
              Accepting will establish an in-memory DataChannel stream and save the file directly to your downloads without storing it on any cloud server.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleRejectIncoming}>
                Decline
              </Button>
              <Button variant="primary" size="sm" onClick={handleAcceptIncoming}>
                Accept & Receive
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* QR Code Modal for Mobile Pairing */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Scan to Join Transfer Room"
        description="Open your camera app on your phone to instantly pair with this device."
      >
        <QrCodeDisplay value={roomShareUrl} label={`Room: ${roomCode}`} />
      </Modal>
    </div>
  );
}

export default function DirectTransferPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-[#536E5A] dark:text-[#8EA895]">Connecting room...</div>}>
      <DirectTransferContent />
    </Suspense>
  );
}
