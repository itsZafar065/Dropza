import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { completeUploadSchema } from "@/lib/validations";
import { verifyObjectExists } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = completeUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { fileAssetId, storageKey, checksumSha256 } = parsed.data;

    const fileAsset = await prisma.fileAsset.findUnique({
      where: { id: fileAssetId },
    });

    if (!fileAsset) {
      return NextResponse.json({ error: "File record not found" }, { status: 404 });
    }

    if (fileAsset.storageKey !== storageKey) {
      return NextResponse.json({ error: "Storage key mismatch" }, { status: 403 });
    }

    // Server-side verification of uploaded object directly from storage
    const storageCheck = await verifyObjectExists(storageKey);
    if (!storageCheck.exists) {
      return NextResponse.json(
        { error: "Upload verification failed: object not found in storage" },
        { status: 400 }
      );
    }

    // Update FileAsset status and verify actual stored byte size
    const updated = await prisma.fileAsset.update({
      where: { id: fileAssetId },
      data: {
        status: "UPLOAD_COMPLETED",
        sizeBytes: BigInt(storageCheck.sizeBytes),
        checksumSha256: checksumSha256 || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "File upload verified and marked ready for sharing",
      fileId: updated.id,
      verifiedSizeBytes: Number(updated.sizeBytes),
    });
  } catch (err: any) {
    console.error("Complete upload verification error:", err);
    return NextResponse.json(
      { error: "Internal error occurred while verifying upload" },
      { status: 500 }
    );
  }
}
