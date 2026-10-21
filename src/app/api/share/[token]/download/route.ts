import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashToken, verifyPassword, hashIp } from "@/lib/crypto";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { rateLimiter, getClientIp } from "@/lib/ratelimit";

async function processDownloadRequest(
  req: NextRequest,
  token: string
) {
  try {
    const ip = getClientIp(req);
    // Download rate limit: 60 requests per minute
    const rl = rateLimiter.check(`download:${ip}`, 60, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many download requests. Please slow down." },
        { status: 429 }
      );
    }

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    const shareLink = await prisma.shareLink.findUnique({
      where: { tokenHash },
      include: { fileAsset: true },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    if (shareLink.isRevoked) {
      return NextResponse.json({ error: "Share link has been revoked" }, { status: 410 });
    }

    if (new Date() > new Date(shareLink.expiresAt)) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    if (shareLink.maxDownloads && shareLink.downloadCount >= shareLink.maxDownloads) {
      return NextResponse.json({ error: "Maximum download limit reached" }, { status: 410 });
    }

    // Password verification if protected
    if (shareLink.passwordHash) {
      let pwd = "";
      try {
        if (req.method === "POST") {
          const body = await req.json();
          pwd = body.password || "";
        }
      } catch {
        pwd = "";
      }
      if (!pwd) {
        pwd = req.headers.get("x-share-password") || req.nextUrl.searchParams.get("pwd") || "";
      }

      if (!pwd) {
        return NextResponse.json(
          { error: "Password required to download this file", requiresPassword: true },
          { status: 401 }
        );
      }

      // Check brute-force attempts on this share token from this IP
      const rlKey = `pwd-share:${tokenHash}:${ip}`;
      const rlCheck = rateLimiter.check(rlKey, 5, 15 * 60 * 1000);
      if (!rlCheck.success) {
        return NextResponse.json(
          { error: "Too many failed password attempts. Please wait 15 minutes before retrying.", requiresPassword: true },
          { status: 429 }
        );
      }

      const isMatch = await verifyPassword(pwd, shareLink.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Incorrect password", requiresPassword: true },
          { status: 401 }
        );
      }
    }

    // Generate restricted presigned download URL (valid for 5 minutes)
    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const downloadUrl = await getPresignedDownloadUrl(
      shareLink.fileAsset.storageKey,
      shareLink.fileAsset.sanitizedName,
      300,
      origin
    );

    // Atomically increment download count and record DownloadEvent
    const userAgent = req.headers.get("user-agent") || undefined;
    const ipHashed = hashIp(ip);

    await prisma.$transaction([
      prisma.shareLink.update({
        where: { id: shareLink.id },
        data: {
          downloadCount: { increment: 1 },
        },
      }),
      prisma.downloadEvent.create({
        data: {
          shareLinkId: shareLink.id,
          fileAssetId: shareLink.fileAsset.id,
          ipHash: ipHashed,
          userAgent: userAgent?.substring(0, 255),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      downloadUrl,
      fileName: shareLink.fileAsset.sanitizedName,
      sizeBytes: Number(shareLink.fileAsset.sizeBytes),
      expiresInSeconds: 300,
    });
  } catch (err: any) {
    console.error("Generate download URL error:", err);
    return NextResponse.json(
      { error: "Failed to generate download authorization" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  return processDownloadRequest(req, params.token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  return processDownloadRequest(req, params.token);
}
