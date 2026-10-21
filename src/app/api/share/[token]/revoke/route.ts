import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";

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

    const tokenHash = hashToken(token);
    const shareLink = await prisma.shareLink.findUnique({
      where: { tokenHash },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    // Verify ownership
    const isOwner =
      (userId && shareLink.userId === userId) ||
      (guestSessionHeader && shareLink.guestSessionId === guestSessionHeader);

    if (!isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: You do not own this share link" },
        { status: 403 }
      );
    }

    const updated = await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Share link has been revoked immediately",
      revokedAt: updated.revokedAt,
    });
  } catch (err: any) {
    console.error("Revoke error:", err);
    return NextResponse.json(
      { error: "Internal error revoking share link" },
      { status: 500 }
    );
  }
}
