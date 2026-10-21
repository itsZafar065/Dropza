import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { RoomManager } from "./room-manager";
import { SignalingMessage } from "./types";

const PORT = parseInt(process.env.PORT || process.env.SIGNALING_PORT || "3001", 10);
const configuredOrigins = (process.env.SIGNALING_ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim());

if (process.env.NEXT_PUBLIC_APP_URL && !configuredOrigins.includes(process.env.NEXT_PUBLIC_APP_URL)) {
  configuredOrigins.push(process.env.NEXT_PUBLIC_APP_URL);
}

const ALLOWED_ORIGINS = configuredOrigins;

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "Dropza WebRTC Signaling Service", timestamp: new Date() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({
  server,
  verifyClient: (info, callback) => {
    const origin = info.origin || (info.req.headers.origin as string) || "";
    const isLocalOrPrivate =
      !origin ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("192.168.") ||
      origin.includes("10.") ||
      origin.includes("172.");

    if (isLocalOrPrivate || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) {
      callback(true);
    } else {
      console.warn(`[Signaling] Blocked connection attempt from unauthorized origin: ${origin}`);
      callback(false, 403, "Origin Not Allowed");
    }
  },
});

const roomManager = new RoomManager();

wss.on("connection", (ws: WebSocket, req) => {
  let peerId: string | null = null;
  let isAlive = true;
  let messageTimestamps: number[] = [];

  ws.on("pong", () => {
    isAlive = true;
  });

  ws.on("message", (rawMessage: string) => {
    try {
      const now = Date.now();
      // Rate limiting: max 120 signaling messages per 10 seconds per connection
      messageTimestamps = messageTimestamps.filter((t) => now - t < 10000);
      if (messageTimestamps.length >= 120) {
        ws.send(JSON.stringify({ type: "error", payload: { message: "Signaling rate limit exceeded" } }));
        return;
      }
      messageTimestamps.push(now);

      const msg: SignalingMessage = JSON.parse(rawMessage.toString());

      if (!msg.type || !msg.roomCode || !msg.senderPeerId) {
        ws.send(JSON.stringify({ type: "error", payload: { message: "Malformed message schema" } }));
        return;
      }

      peerId = msg.senderPeerId;
      roomManager.registerPeer(peerId, ws);

      switch (msg.type) {
        case "join_room": {
          const { isHost, pin } = msg.payload || {};
          const result = roomManager.createOrJoinRoom(msg.roomCode, peerId, Boolean(isHost), pin);

          if (!result.success) {
            ws.send(
              JSON.stringify({
                type: "error",
                roomCode: msg.roomCode,
                senderPeerId: peerId,
                payload: { code: "JOIN_FAILED", message: result.error },
              })
            );
            return;
          }

          ws.send(
            JSON.stringify({
              type: "joined",
              roomCode: msg.roomCode,
              senderPeerId: peerId,
              payload: { role: result.role },
            })
          );

          // If guest joined, notify the host
          if (result.role === "guest") {
            const hostPeerId = roomManager.getOtherPeerId(msg.roomCode, peerId);
            if (hostPeerId) {
              const hostWs = roomManager.getSocket(hostPeerId);
              if (hostWs && hostWs.readyState === WebSocket.OPEN) {
                hostWs.send(
                  JSON.stringify({
                    type: "peer_joined",
                    roomCode: msg.roomCode,
                    senderPeerId: peerId,
                    payload: { peerId },
                  })
                );
              }
            }
          }
          break;
        }

        // WebRTC Signaling: relay offer, answer, ice-candidate
        case "signal":
        case "file_meta":
        case "file_decision":
        case "transfer_progress":
        case "transfer_cancel": {
          const recipientId = roomManager.getOtherPeerId(msg.roomCode, peerId);
          if (!recipientId) {
            ws.send(
              JSON.stringify({
                type: "error",
                roomCode: msg.roomCode,
                senderPeerId: peerId,
                payload: { code: "NO_PEER", message: "Peer is not connected to this room" },
              })
            );
            return;
          }

          const recipientWs = roomManager.getSocket(recipientId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(
              JSON.stringify({
                type: msg.type,
                roomCode: msg.roomCode,
                senderPeerId: peerId,
                targetPeerId: recipientId,
                payload: msg.payload,
              })
            );
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error("[Signaling] Message error:", err);
    }
  });

  ws.on("close", () => {
    if (peerId) {
      const { roomCode, otherPeerId } = roomManager.unregisterPeer(peerId);
      if (roomCode && otherPeerId) {
        const otherWs = roomManager.getSocket(otherPeerId);
        if (otherWs && otherWs.readyState === WebSocket.OPEN) {
          otherWs.send(
            JSON.stringify({
              type: "peer_disconnected",
              roomCode,
              senderPeerId: peerId,
              payload: { peerId },
            })
          );
        }
      }
    }
  });
});

// Periodic ping/pong heartbeat to clean dead connections
const pingInterval = setInterval(() => {
  wss.clients.forEach((client: any) => {
    if (client.isAlive === false) return client.terminate();
    client.isAlive = false;
    client.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(pingInterval);
});

server.listen(PORT, () => {
  console.log(`[Dropza Signaling Service] Running on port ${PORT}`);
  console.log(`[Dropza Signaling Service] Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});
