import { describe, it, expect, afterEach } from "vitest";
import prisma from "../../src/lib/prisma";
import { hashPassword, verifyPassword } from "../../src/lib/crypto";

describe("Direct Transfer Rooms Persistence & PIN Protection", () => {
  let createdRoomId: string | null = null;

  afterEach(async () => {
    if (createdRoomId) {
      await prisma.transferRoom.deleteMany({ where: { id: createdRoomId } });
    }
  });

  it("should create and persist a TransferRoom in the database", async () => {
    const roomCode = "RM" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const pin = "4321";
    const pinHash = await hashPassword(pin);
    const hostPeerId = "host-" + Math.random().toString(36).substring(2, 8);

    const room = await prisma.transferRoom.create({
      data: {
        roomCode,
        hostPeerId,
        pinHash,
        status: "WAITING",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    createdRoomId = room.id;

    expect(room.roomCode).toBe(roomCode);
    expect(room.status).toBe("WAITING");

    // Verify PIN
    const isValidPin = await verifyPassword("4321", room.pinHash!);
    expect(isValidPin).toBe(true);

    const isInvalidPin = await verifyPassword("0000", room.pinHash!);
    expect(isInvalidPin).toBe(false);

    // Update room status on connection
    const updated = await prisma.transferRoom.update({
      where: { id: room.id },
      data: { status: "CONNECTED" },
    });
    expect(updated.status).toBe("CONNECTED");
  });
});
