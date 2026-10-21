import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createTransferRoomSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/crypto";
import { rateLimiter, getClientIp } from "@/lib/ratelimit";

function generateCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let res = "";
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit room creation: 20 rooms per hour per IP
    const rl = rateLimiter.check(`create-room:${ip}`, 20, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many rooms created. Please wait before creating another." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createTransferRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid room parameters" },
        { status: 400 }
      );
    }

    let roomCode = (parsed.data.roomCode || generateCode()).toUpperCase().trim();

    // Ensure unique roomCode
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.transferRoom.findUnique({ where: { roomCode } });
      if (!existing || existing.expiresAt < new Date()) {
        if (existing && existing.expiresAt < new Date()) {
          // Overwrite expired room
          await prisma.transferRoom.delete({ where: { id: existing.id } });
        }
        break;
      }
      roomCode = generateCode();
      attempts++;
    }

    const pinHash = parsed.data.pin ? await hashPassword(parsed.data.pin) : null;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lifetime

    const room = await prisma.transferRoom.create({
      data: {
        roomCode,
        hostPeerId: parsed.data.hostPeerId,
        pinHash,
        status: "WAITING",
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      roomCode: room.roomCode,
      hasPin: Boolean(pinHash),
      expiresAt: room.expiresAt,
    });
  } catch (err: any) {
    console.error("Create transfer room error:", err);
    return NextResponse.json(
      { error: "Internal error creating transfer room" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code")?.toUpperCase().trim();
    if (!code) {
      return NextResponse.json({ error: "Missing room code" }, { status: 400 });
    }

    const room = await prisma.transferRoom.findUnique({
      where: { roomCode: code },
    });

    if (!room) {
      return NextResponse.json({ error: "Transfer room not found" }, { status: 404 });
    }

    if (new Date() > new Date(room.expiresAt)) {
      return NextResponse.json({ error: "Transfer room has expired" }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      roomCode: room.roomCode,
      status: room.status,
      hasPin: Boolean(room.pinHash),
      expiresAt: room.expiresAt,
    });
  } catch (err: any) {
    console.error("Fetch transfer room error:", err);
    return NextResponse.json(
      { error: "Internal error checking transfer room" },
      { status: 500 }
    );
  }
}
