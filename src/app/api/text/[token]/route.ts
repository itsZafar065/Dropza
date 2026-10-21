import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto";
import { rateLimiter, getClientIp } from "@/lib/ratelimit";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const textShare = await prisma.textShare.findUnique({
      where: { token },
    });

    if (!textShare) {
      return NextResponse.json({ error: "Snippet not found or expired" }, { status: 404 });
    }

    if (textShare.isRevoked) {
      return NextResponse.json({ error: "This text snippet has been deleted" }, { status: 410 });
    }

    if (new Date() > new Date(textShare.expiresAt)) {
      return NextResponse.json({ error: "This text snippet has expired" }, { status: 410 });
    }

    if (textShare.maxViews && textShare.viewCount >= textShare.maxViews) {
      return NextResponse.json({ error: "View limit reached for this snippet" }, { status: 410 });
    }

    const requiresPassword = Boolean(textShare.passwordHash);
    const suppliedPassword = req.headers.get("x-share-password") || req.nextUrl.searchParams.get("pwd");

    if (requiresPassword) {
      if (!suppliedPassword) {
        return NextResponse.json({
          requiresPassword: true,
          isUrl: textShare.isUrl,
          expiresAt: textShare.expiresAt,
        });
      }

      // Brute-force protection: 5 attempts per 15 minutes per IP
      const ip = getClientIp(req);
      const rlKey = `pwd-text:${token}:${ip}`;
      const rl = rateLimiter.check(rlKey, 5, 15 * 60 * 1000);
      if (!rl.success) {
        return NextResponse.json(
          { error: "Too many failed password attempts. Please wait 15 minutes.", requiresPassword: true },
          { status: 429 }
        );
      }

      const match = await verifyPassword(suppliedPassword, textShare.passwordHash!);
      if (!match) {
        return NextResponse.json(
          { error: "Invalid password for this protected text snippet", requiresPassword: true },
          { status: 401 }
        );
      }
    }

    // Increment view count
    await prisma.textShare.update({
      where: { id: textShare.id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      requiresPassword: false,
      token: textShare.token,
      content: textShare.content,
      isUrl: textShare.isUrl,
      previewTitle: textShare.previewTitle,
      previewDesc: textShare.previewDesc,
      expiresAt: textShare.expiresAt,
      viewCount: textShare.viewCount + 1,
      maxViews: textShare.maxViews,
    });
  } catch (err: any) {
    console.error("Fetch text share error:", err);
    return NextResponse.json(
      { error: "Internal error retrieving text snippet" },
      { status: 500 }
    );
  }
}
