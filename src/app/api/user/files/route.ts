import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await prisma.fileAsset.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      include: {
        shareLinks: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const formatted = files.map((f) => ({
      id: f.id,
      name: f.sanitizedName,
      sizeBytes: Number(f.sizeBytes),
      mimeType: f.mimeType,
      status: f.status,
      createdAt: f.createdAt,
      expiresAt: f.expiresAt,
      shareLinks: f.shareLinks.map((sl) => ({
        token: sl.token,
        downloadCount: sl.downloadCount,
        maxDownloads: sl.maxDownloads,
        expiresAt: sl.expiresAt,
        isRevoked: sl.isRevoked,
        isPasswordProtected: Boolean(sl.passwordHash),
      })),
    }));

    return NextResponse.json({ files: formatted });
  } catch (err: any) {
    console.error("User files fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}
