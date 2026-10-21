import { SignalingRoom } from "./types";
import WebSocket from "ws";

export class RoomManager {
  private rooms: Map<string, SignalingRoom> = new Map();
  private peerSockets: Map<string, WebSocket> = new Map();
  private peerRooms: Map<string, string> = new Map();

  constructor() {
    // Clean up expired rooms every 60 seconds
    setInterval(() => this.cleanupExpiredRooms(), 60 * 1000);
  }

  public registerPeer(peerId: string, ws: WebSocket) {
    this.peerSockets.set(peerId, ws);
  }

  public unregisterPeer(peerId: string): { roomCode?: string; otherPeerId?: string } {
    this.peerSockets.delete(peerId);
    const roomCode = this.peerRooms.get(peerId);
    this.peerRooms.delete(peerId);

    if (!roomCode) return {};

    const room = this.rooms.get(roomCode);
    if (!room) return { roomCode };

    let otherPeerId: string | undefined;

    if (room.hostPeerId === peerId) {
      otherPeerId = room.guestPeerId || undefined;
      // If host leaves, terminate room
      this.rooms.delete(roomCode);
    } else if (room.guestPeerId === peerId) {
      otherPeerId = room.hostPeerId;
      room.guestPeerId = null;
    }

    return { roomCode, otherPeerId };
  }

  public createOrJoinRoom(
    roomCode: string,
    peerId: string,
    isHost: boolean,
    pin?: string
  ): { success: boolean; error?: string; role: "host" | "guest" } {
    const now = Date.now();
    let room = this.rooms.get(roomCode);

    if (isHost) {
      // Create new room (valid for 30 minutes)
      this.rooms.set(roomCode, {
        roomCode,
        hostPeerId: peerId,
        guestPeerId: null,
        pinHash: pin || undefined,
        createdAt: now,
        expiresAt: now + 30 * 60 * 1000,
      });
      this.peerRooms.set(peerId, roomCode);
      return { success: true, role: "host" };
    }

    // Joining as guest
    if (!room) {
      return { success: false, error: "Room not found or expired", role: "guest" };
    }

    if (room.expiresAt < now) {
      this.rooms.delete(roomCode);
      return { success: false, error: "Room has expired", role: "guest" };
    }

    if (room.guestPeerId && room.guestPeerId !== peerId) {
      return { success: false, error: "Room is already full with 2 connected peers", role: "guest" };
    }

    if (room.pinHash && room.pinHash !== pin) {
      return { success: false, error: "Incorrect room PIN", role: "guest" };
    }

    room.guestPeerId = peerId;
    this.peerRooms.set(peerId, roomCode);
    return { success: true, role: "guest" };
  }

  public getOtherPeerId(roomCode: string, senderPeerId: string): string | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    if (room.hostPeerId === senderPeerId) {
      return room.guestPeerId;
    }
    if (room.guestPeerId === senderPeerId) {
      return room.hostPeerId;
    }
    return null; // Sender is not authorized in this room
  }

  public getSocket(peerId: string): WebSocket | undefined {
    return this.peerSockets.get(peerId);
  }

  private cleanupExpiredRooms() {
    const now = Date.now();
    this.rooms.forEach((room, code) => {
      if (room.expiresAt < now) {
        this.rooms.delete(code);
      }
    });
  }
}
