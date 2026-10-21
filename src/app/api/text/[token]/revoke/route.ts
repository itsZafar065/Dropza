import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const guestSessionHeader = req.headers.get("x-guest-session");

    const textShare = await prisma.textShare.findUnique({
      where: { token },
    });

    if (!textShare) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }

    // Verify ownership if recorded
    const isOwner =
      (userId && textShare.userId === userId) ||
      (guestSessionHeader && textShare.guestSessionId === guestSessionHeader) ||
      !textShare.userId; // If unauthenticated creation without guest id, allow revocation with token possession

    if (!isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: You do not own this text snippet" },
        { status: 403 }
      );
    }

    const updated = await prisma.textShare.update({
      where: { id: textShare.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Text snippet revoked immediately",
      revokedAt: updated.revokedAt,
    });
  } catch (err: any) {
    console.error("Revoke text share error:", err);
    return NextResponse.json(
      { error: "Internal server error revoking snippet" },
      { status: 500 }
    );
  }
}
