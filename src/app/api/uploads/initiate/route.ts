import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { initiateUploadSchema, BLOCKED_EXTENSIONS } from "@/lib/validations";
import { generateSecureToken, hashToken, hashPassword, hashIp } from "@/lib/crypto";
import { getPresignedUploadUrl, generateStorageKey } from "@/lib/s3";
import { sanitizeFilename } from "@/lib/utils";
import { rateLimiter, getClientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit: 30 initiate calls per hour per IP
    const rl = rateLimiter.check(`upload-initiate:${ip}`, 30, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Upload rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const body = await req.json();
    const parsed = initiateUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid upload parameters" },
        { status: 400 }
      );
    }

    const { files, expiryHours, password, maxDownloads } = parsed.data;

    // Configurable Max size check: 50MB for guests, 2GB for logged-in users
    const maxSizeBytes = userId
      ? parseInt(process.env.NEXT_PUBLIC_MAX_USER_UPLOAD_BYTES || "2147483648", 10)
      : parseInt(process.env.NEXT_PUBLIC_MAX_GUEST_UPLOAD_BYTES || "52428800", 10);

    for (const f of files) {
      if (f.sizeBytes > maxSizeBytes) {
        const readableLimit = userId ? "2GB" : "50MB";
        return NextResponse.json(
          {
            error: `File "${f.name}" exceeds the maximum allowed size of ${readableLimit}. ${
              !userId ? "Sign in to upload up to 2GB." : ""
            }`,
          },
          { status: 413 }
        );
      }

      // Security restriction: Block executable file uploads for guests
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (!userId && BLOCKED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          {
            error: `Executable and script files (.${ext}) cannot be uploaded by guests for security reasons. Please sign in or use an archive.`,
          },
          { status: 400 }
        );
      }
    }

    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    const passwordHash = password && password.trim().length > 0 ? await hashPassword(password) : null;
    const networkId = hashIp(ip);
    const guestSessionId = !userId ? (req.headers.get("x-guest-session") || networkId) : networkId;

    const results = [];

    for (const file of files) {
      const sanitized = sanitizeFilename(file.name);
      const extension = sanitized.split(".").pop() || "bin";
      const storageKey = generateStorageKey(extension);

      // Create file asset in database
      const fileAsset = await prisma.fileAsset.create({
        data: {
          originalName: file.name,
          sanitizedName: sanitized,
          mimeType: file.mimeType || "application/octet-stream",
          sizeBytes: BigInt(file.sizeBytes),
          storageKey,
          storageBucket: process.env.S3_BUCKET || "dropza-files",
          status: "UPLOAD_PENDING",
          userId,
          guestSessionId,
          expiresAt,
        },
      });

      // Generate secure unpredictable share token
      const token = generateSecureToken(20);
      const tokenHash = hashToken(token);

      const shareLink = await prisma.shareLink.create({
        data: {
          token,
          tokenHash,
          fileAssetId: fileAsset.id,
          userId,
          guestSessionId,
          passwordHash,
          maxDownloads: maxDownloads || null,
          expiresAt,
        },
      });

      // Generate presigned PUT URL (15 min validity)
      const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const presigned = await getPresignedUploadUrl(storageKey, file.mimeType, 900, origin);

      results.push({
        fileAssetId: fileAsset.id,
        storageKey,
        originalName: file.name,
        sizeBytes: file.sizeBytes,
        uploadUrl: presigned.uploadUrl,
        uploadMethod: presigned.method,
        uploadHeaders: presigned.headers,
        token: shareLink.token,
        shareUrl: `${origin}/s/${shareLink.token}`,
        expiresAt: expiresAt.toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      guestSessionId,
      uploads: results,
    });
  } catch (err: any) {
    console.error("Initiate upload error:", err);
    return NextResponse.json(
      { error: "Internal server error while preparing upload" },
      { status: 500 }
    );
  }
}
