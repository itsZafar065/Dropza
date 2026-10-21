import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteObject } from "@/lib/s3";

async function executeCleanup(req: NextRequest) {
  try {
    // Verify optional cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 1. Find all expired FileAssets that have not been deleted
    const expiredFiles = await prisma.fileAsset.findMany({
      where: {
        isDeleted: false,
        expiresAt: { lt: now },
      },
      take: 100,
    });

    let filesPurged = 0;
    for (const file of expiredFiles) {
      await deleteObject(file.storageKey);
      await prisma.fileAsset.update({
        where: { id: file.id },
        data: {
          isDeleted: true,
          status: "DELETED",
        },
      });
      filesPurged++;
    }

    // 2. Mark expired share links as revoked
    const expiredShares = await prisma.shareLink.updateMany({
      where: {
        isRevoked: false,
        expiresAt: { lt: now },
      },
      data: {
        isRevoked: true,
        revokedAt: now,
      },
    });

    // 3. Mark expired text snippets as revoked
    const expiredTexts = await prisma.textShare.updateMany({
      where: {
        isRevoked: false,
        expiresAt: { lt: now },
      },
      data: {
        isRevoked: true,
        revokedAt: now,
      },
    });

    // 4. Delete expired transfer rooms
    const expiredRooms = await prisma.transferRoom.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      purged: {
        files: filesPurged,
        sharesRevoked: expiredShares.count,
        textsRevoked: expiredTexts.count,
        roomsCleaned: expiredRooms.count,
      },
    });
  } catch (err: any) {
    console.error("Cleanup cron error:", err);
    return NextResponse.json({ error: "Internal server error during cleanup" }, { status: 500 });
  }
}

// Vercel Cron sends GET requests
export async function GET(req: NextRequest) {
  return executeCleanup(req);
}

// Support manual or webhook triggers via POST
export async function POST(req: NextRequest) {
  return executeCleanup(req);
}
