import { CHUNK_SIZE, BUFFER_THRESHOLD, FileMetadata, ChunkAssembler, getFileChunks } from "./chunker";

export type PeerConnectionState =
  | "disconnected"
  | "signaling_connecting"
  | "waiting_for_peer"
  | "peer_found"
  | "webrtc_connecting"
  | "connected"
  | "transferring"
  | "transfer_complete"
  | "failed";

export interface WebRTCClientOptions {
  roomCode: string;
  isHost: boolean;
  peerId?: string;
  pin?: string;
  onStateChange: (state: PeerConnectionState) => void;
  onLog?: (msg: string) => void;
  onFileProposal?: (meta: FileMetadata, accept: () => void, reject: () => void) => void;
  onProgress?: (progress: number, bytesTransferred: number, totalBytes: number) => void;
  onFileReceived?: (blob: Blob, fileName: string) => void;
  onError?: (err: string) => void;
}

export class WebRTCClient {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private peerId: string;
  private options: WebRTCClientOptions;
  private state: PeerConnectionState = "disconnected";
  private assembler: ChunkAssembler | null = null;
  private isCancelled = false;

  constructor(options: WebRTCClientOptions) {
    this.options = options;
    this.peerId = options.peerId || Math.random().toString(36).substring(2, 10);
  }

  private setState(state: PeerConnectionState) {
    this.state = state;
    this.options.onStateChange(state);
  }

  private log(msg: string) {
    if (this.options.onLog) this.options.onLog(msg);
  }

  public connect() {
    this.setState("signaling_connecting");
    let wsUrl = process.env.NEXT_PUBLIC_SIGNALING_WS_URL || "ws://localhost:3001";
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (wsUrl.includes("localhost") && hostname !== "localhost") {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${proto}//${hostname}:3001`;
      }
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.log("Connected to Dropza Signaling Service");
        this.ws?.send(
          JSON.stringify({
            type: "join_room",
            roomCode: this.options.roomCode,
            senderPeerId: this.peerId,
            payload: {
              isHost: this.options.isHost,
              pin: this.options.pin,
            },
          })
        );
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this.handleSignalingMessage(msg);
        } catch (err) {
          console.error("Signaling message parse error:", err);
        }
      };

      this.ws.onerror = (err) => {
        this.log("Signaling WebSocket error. Fallback available.");
        this.options.onError?.("Signaling connection error. Please ensure the signaling service is reachable.");
        this.setState("failed");
      };

      this.ws.onclose = () => {
        this.log("Signaling connection closed");
      };
    } catch (err: any) {
      this.options.onError?.(err?.message || "Failed to initialize signaling connection");
      this.setState("failed");
    }
  }

  private async handleSignalingMessage(msg: any) {
    switch (msg.type) {
      case "joined":
        if (this.options.isHost) {
          this.setState("waiting_for_peer");
        } else {
          this.setState("peer_found");
        }
        break;

      case "peer_joined":
        this.log("Receiver joined the room. Negotiating WebRTC peer connection...");
        this.setState("peer_found");
        await this.initiateWebRTCConnection();
        break;

      case "signal":
        await this.handleWebRTCSignal(msg.payload);
        break;

      case "file_meta": {
        const meta = msg.payload as FileMetadata;
        this.assembler = new ChunkAssembler(meta);
        if (this.options.onFileProposal) {
          this.options.onFileProposal(
            meta,
            () => this.sendSignalMessage("file_decision", { decision: "accept" }),
            () => this.sendSignalMessage("file_decision", { decision: "reject" })
          );
        }
        break;
      }

      case "file_decision": {
        if (msg.payload?.decision === "accept") {
          this.log("Receiver accepted file proposal. Streaming chunks...");
          if (this.activeFileToSend) {
            this.streamFileChunks(this.activeFileToSend);
          }
        } else {
          this.log("Receiver declined incoming file transfer.");
          this.options.onError?.("Receiver declined the file transfer.");
        }
        break;
      }

      case "peer_disconnected":
        this.log("Peer disconnected from the room");
        this.setState("waiting_for_peer");
        this.cleanupWebRTC();
        break;

      case "error":
        this.options.onError?.(msg.payload?.message || "Signaling error occurred");
        this.setState("failed");
        break;
    }
  }

  private getIceServers(): RTCIceServer[] {
    try {
      const customServers = process.env.NEXT_PUBLIC_ICE_SERVERS;
      if (customServers) {
        return JSON.parse(customServers);
      }
    } catch {
      // ignore
    }
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
  }

  private async initiateWebRTCConnection() {
    this.setState("webrtc_connecting");
    this.pc = new RTCPeerConnection({ iceServers: this.getIceServers() });

    // Host creates the DataChannel
    this.dc = this.pc.createDataChannel("dropza-file-channel", {
      ordered: true,
    });
    this.setupDataChannel(this.dc);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalMessage("signal", { candidate: event.candidate });
      }
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.sendSignalMessage("signal", { sdp: this.pc.localDescription });
  }

  private async handleWebRTCSignal(payload: any) {
    if (payload.sdp) {
      if (!this.pc) {
        this.pc = new RTCPeerConnection({ iceServers: this.getIceServers() });

        this.pc.onicecandidate = (event) => {
          if (event.candidate) {
            this.sendSignalMessage("signal", { candidate: event.candidate });
          }
        };

        this.pc.ondatachannel = (event) => {
          this.dc = event.channel;
          this.setupDataChannel(this.dc);
        };
      }

      await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

      if (payload.sdp.type === "offer") {
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignalMessage("signal", { sdp: this.pc.localDescription });
      }
    } else if (payload.candidate) {
      if (this.pc) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.error("Error adding received ICE candidate", e);
        }
      }
    }
  }

  private setupDataChannel(dc: RTCDataChannel) {
    dc.binaryType = "arraybuffer";

    dc.onopen = () => {
      this.log("WebRTC DataChannel open and ready for zero-cloud file streaming");
      this.setState("connected");
    };

    dc.onclose = () => {
      this.log("DataChannel closed");
      if (this.state !== "transfer_complete") {
        this.setState("disconnected");
      }
    };

    dc.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer && this.assembler) {
        const { progress, isComplete } = this.assembler.addChunk(event.data);
        this.setState("transferring");
        this.options.onProgress?.(progress, 0, 0);

        if (isComplete) {
          const blob = this.assembler.buildBlob();
          const fileName = this.assembler.getFileName();
          this.options.onFileReceived?.(blob, fileName);
          this.setState("transfer_complete");
        }
      }
    };
  }

  private activeFileToSend: File | null = null;

  public async proposeFile(file: File) {
    this.activeFileToSend = file;
    this.isCancelled = false;

    const meta: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
    };

    this.sendSignalMessage("file_meta", meta);
  }

  private async streamFileChunks(file: File) {
    if (!this.dc || this.dc.readyState !== "open") {
      this.options.onError?.("DataChannel is not ready");
      return;
    }

    this.setState("transferring");
    let sentBytes = 0;

    for await (const chunk of getFileChunks(file)) {
      if (this.isCancelled) {
        this.log("File transfer was cancelled by user");
        return;
      }

      // Backpressure handling: wait if buffer exceeds threshold
      if (this.dc.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise<void>((resolve) => {
          const checkBuffer = () => {
            if (!this.dc || this.dc.bufferedAmount <= BUFFER_THRESHOLD / 2) {
              resolve();
            } else {
              setTimeout(checkBuffer, 10);
            }
          };
          checkBuffer();
        });
      }

      this.dc.send(chunk.data);
      sentBytes += chunk.data.byteLength;
      const progress = Math.min(100, Math.round((sentBytes / file.size) * 100));
      this.options.onProgress?.(progress, sentBytes, file.size);
    }

    this.setState("transfer_complete");
  }

  public cancelTransfer() {
    this.isCancelled = true;
    this.sendSignalMessage("transfer_cancel", {});
    this.setState("connected");
  }

  private sendSignalMessage(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          roomCode: this.options.roomCode,
          senderPeerId: this.peerId,
          payload,
        })
      );
    }
  }

  public disconnect() {
    this.cleanupWebRTC();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState("disconnected");
  }

  private cleanupWebRTC() {
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
