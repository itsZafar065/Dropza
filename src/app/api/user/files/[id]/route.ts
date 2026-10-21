import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteObject } from "@/lib/s3";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const file = await prisma.fileAsset.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.userId !== userId) {
      return NextResponse.json({ error: "Forbidden: You do not own this file" }, { status: 403 });
    }

    // Delete underlying object from storage
    await deleteObject(file.storageKey);

    // Mark as deleted in database
    await prisma.fileAsset.update({
      where: { id },
      data: {
        isDeleted: true,
        status: "DELETED",
      },
    });

    // Revoke all linked shares
    await prisma.shareLink.updateMany({
      where: { fileAssetId: id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "File deleted successfully" });
  } catch (err: any) {
    console.error("Delete file error:", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
