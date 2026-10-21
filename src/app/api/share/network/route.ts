import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashIp } from "@/lib/crypto";
import { getPresignedPreviewUrl } from "@/lib/s3";
import { rateLimiter, getClientIp } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit: 60 checks per min per IP
    const rl = rateLimiter.check(`network-share:${ip}`, 60, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const networkId = hashIp(ip);
    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const activeLinks = await prisma.shareLink.findMany({
      where: {
        guestSessionId: networkId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
        fileAsset: {
          status: "UPLOAD_COMPLETED",
          isDeleted: false,
        },
      },
      include: {
        fileAsset: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const files = await Promise.all(
      activeLinks.map(async (link) => {
        let previewUrl: string | null = null;

        // Only generate preview URL if the link is not password protected
        const isMedia =
          link.fileAsset.mimeType.startsWith("image/") ||
          link.fileAsset.mimeType.startsWith("video/") ||
          link.fileAsset.mimeType.startsWith("audio/") ||
          link.fileAsset.mimeType === "application/pdf";

        if (!link.passwordHash && isMedia) {
          try {
            previewUrl = await getPresignedPreviewUrl(
              link.fileAsset.storageKey,
              link.fileAsset.mimeType,
              900,
              origin
            );
          } catch (e) {
            console.warn("Failed to generate preview url for network item", link.fileAsset.id, e);
          }
        }

        return {
          token: link.token,
          fileName: link.fileAsset.sanitizedName,
          originalName: link.fileAsset.originalName,
          sizeBytes: Number(link.fileAsset.sizeBytes),
          mimeType: link.fileAsset.mimeType,
          createdAt: link.createdAt.toISOString(),
          expiresAt: link.expiresAt.toISOString(),
          hasPassword: Boolean(link.passwordHash),
          downloadCount: link.downloadCount,
          maxDownloads: link.maxDownloads,
          shareUrl: `${origin}/s/${link.token}`,
          previewUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      networkHash: networkId.substring(0, 8),
      count: files.length,
      files,
    });
  } catch (err: any) {
    console.error("Network share query error:", err);
    return NextResponse.json(
      { error: "Internal server error querying network shares" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const networkId = hashIp(ip);

    const updated = await prisma.shareLink.updateMany({
      where: {
        guestSessionId: networkId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      revokedCount: updated.count,
      message: `Revoked ${updated.count} network file(s)`,
    });
  } catch (err: any) {
    console.error("Network share delete error:", err);
    return NextResponse.json(
      { error: "Internal error revoking network files" },
      { status: 500 }
    );
  }
}
