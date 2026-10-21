import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashToken, verifyPassword } from "@/lib/crypto";
import { getPresignedPreviewUrl } from "@/lib/s3";
import { rateLimiter, getClientIp } from "@/lib/ratelimit";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    const shareLink = await prisma.shareLink.findUnique({
      where: { tokenHash },
      include: {
        fileAsset: true,
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 });
    }

    if (shareLink.isRevoked) {
      return NextResponse.json(
        { error: "This share link has been revoked by the owner" },
        { status: 410 }
      );
    }

    if (new Date() > new Date(shareLink.expiresAt)) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    if (shareLink.maxDownloads && shareLink.downloadCount >= shareLink.maxDownloads) {
      return NextResponse.json(
        { error: "Download limit reached for this share link" },
        { status: 410 }
      );
    }

    const requiresPassword = Boolean(shareLink.passwordHash);

    // If client supplied a password attempt via header or query
    const suppliedPassword = req.headers.get("x-share-password") || req.nextUrl.searchParams.get("pwd");

    if (requiresPassword) {
      if (!suppliedPassword) {
        return NextResponse.json({
          requiresPassword: true,
          fileName: shareLink.fileAsset.sanitizedName,
          sizeBytes: Number(shareLink.fileAsset.sizeBytes),
          mimeType: shareLink.fileAsset.mimeType,
          expiresAt: shareLink.expiresAt,
        });
      }

      // Brute force protection against password guessing
      const ip = getClientIp(req);
      const rlKey = `pwd-share:${tokenHash}:${ip}`;
      const rlCheck = rateLimiter.check(rlKey, 5, 15 * 60 * 1000);
      if (!rlCheck.success) {
        return NextResponse.json(
          { error: "Too many failed password attempts. Please wait 15 minutes.", requiresPassword: true },
          { status: 429 }
        );
      }

      const isMatch = await verifyPassword(suppliedPassword, shareLink.passwordHash!);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Invalid password for this protected file", requiresPassword: true },
          { status: 401 }
        );
      }
    }

    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let previewUrl: string | null = null;
    const mime = shareLink.fileAsset.mimeType || "";
    if (mime.startsWith("image/") || mime.startsWith("video/") || mime === "application/pdf") {
      try {
        previewUrl = await getPresignedPreviewUrl(
          shareLink.fileAsset.storageKey,
          mime,
          900,
          origin
        );
      } catch (e) {
        console.error("Preview URL generation error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      requiresPassword: false,
      token: shareLink.token,
      previewUrl,
      file: {
        id: shareLink.fileAsset.id,
        name: shareLink.fileAsset.sanitizedName,
        sizeBytes: Number(shareLink.fileAsset.sizeBytes),
        mimeType: shareLink.fileAsset.mimeType,
        createdAt: shareLink.fileAsset.createdAt,
      },
      expiresAt: shareLink.expiresAt,
      downloadCount: shareLink.downloadCount,
      maxDownloads: shareLink.maxDownloads,
    });
  } catch (err: any) {
    console.error("Retrieve share link error:", err);
    return NextResponse.json(
      { error: "Internal server error retrieving share link" },
      { status: 500 }
    );
  }
}
