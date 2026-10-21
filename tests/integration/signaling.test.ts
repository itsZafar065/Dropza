import { describe, it, expect, beforeEach } from "vitest";
import { RoomManager } from "../../signaling/room-manager";

describe("Signaling Room Manager", () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  it("should create a room for host and allow one guest to join", () => {
    const roomCode = "ABC123";
    const hostId = "peer-host-1";
    const guestId = "peer-guest-2";

    // Host creates room
    const hostRes = roomManager.createOrJoinRoom(roomCode, hostId, true);
    expect(hostRes.success).toBe(true);
    expect(hostRes.role).toBe("host");

    // Guest joins room
    const guestRes = roomManager.createOrJoinRoom(roomCode, guestId, false);
    expect(guestRes.success).toBe(true);
    expect(guestRes.role).toBe("guest");

    // Verify peering isolation
    expect(roomManager.getOtherPeerId(roomCode, hostId)).toBe(guestId);
    expect(roomManager.getOtherPeerId(roomCode, guestId)).toBe(hostId);
  });

  it("should reject a third peer from joining a full room", () => {
    const roomCode = "FULL99";
    const hostId = "peer-host";
    const guestId = "peer-guest-1";
    const intruderId = "peer-intruder";

    roomManager.createOrJoinRoom(roomCode, hostId, true);
    roomManager.createOrJoinRoom(roomCode, guestId, false);

    const intruderRes = roomManager.createOrJoinRoom(roomCode, intruderId, false);
    expect(intruderRes.success).toBe(false);
    expect(intruderRes.error).toContain("already full");
  });

  it("should reject non-existent room join requests", () => {
    const res = roomManager.createOrJoinRoom("NONEXIST", "some-peer", false);
    expect(res.success).toBe(false);
    expect(res.error).toContain("not found");
  });
});
