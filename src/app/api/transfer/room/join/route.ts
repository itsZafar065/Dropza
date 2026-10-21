import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { joinTransferRoomSchema } from "@/lib/validations";
import { verifyPassword } from "@/lib/crypto";
import { rateLimiter, getClientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();
    const parsed = joinTransferRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid join parameters" },
        { status: 400 }
      );
    }

    const { roomCode, peerId, pin } = parsed.data;
    const normalizedCode = roomCode.toUpperCase().trim();

    const room = await prisma.transferRoom.findUnique({
      where: { roomCode: normalizedCode },
    });

    if (!room) {
      return NextResponse.json({ error: "Transfer room not found" }, { status: 404 });
    }

    if (new Date() > new Date(room.expiresAt)) {
      return NextResponse.json({ error: "Transfer room has expired" }, { status: 410 });
    }

    // PIN verification if room is protected
    if (room.pinHash) {
      if (!pin) {
        return NextResponse.json(
          { error: "PIN required to join this room", requiresPin: true },
          { status: 401 }
        );
      }

      // Brute-force protection: max 5 attempts per room code from this IP
      const rlKey = `pin-room:${normalizedCode}:${ip}`;
      const rl = rateLimiter.check(rlKey, 5, 15 * 60 * 1000);
      if (!rl.success) {
        return NextResponse.json(
          { error: "Too many incorrect PIN attempts. Please wait 15 minutes.", requiresPin: true },
          { status: 429 }
        );
      }

      const match = await verifyPassword(pin, room.pinHash);
      if (!match) {
        return NextResponse.json(
          { error: "Incorrect room PIN", requiresPin: true },
          { status: 401 }
        );
      }
    }

    // Update room status
    await prisma.transferRoom.update({
      where: { id: room.id },
      data: { status: "CONNECTED" },
    });

    return NextResponse.json({
      success: true,
      roomCode: room.roomCode,
      role: "guest",
    });
  } catch (err: any) {
    console.error("Join transfer room error:", err);
    return NextResponse.json(
      { error: "Internal error processing room join" },
      { status: 500 }
    );
  }
}
