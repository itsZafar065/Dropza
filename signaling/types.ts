export type SignalingMessageType =
  | "join_room"
  | "joined"
  | "peer_joined"
  | "peer_disconnected"
  | "signal" // WebRTC offer, answer, ice-candidate
  | "file_meta"
  | "file_decision" // accept / reject
  | "transfer_progress"
  | "transfer_cancel"
  | "error";

export interface SignalingMessage {
  type: SignalingMessageType;
  roomCode: string;
  senderPeerId: string;
  targetPeerId?: string;
  payload?: any;
}

export interface RoomPeer {
  peerId: string;
  role: "host" | "guest";
  connectedAt: number;
  lastActiveAt: number;
}

export interface SignalingRoom {
  roomCode: string;
  hostPeerId: string;
  guestPeerId: string | null;
  pinHash?: string;
  createdAt: number;
  expiresAt: number;
}
