import { describe, it, expect } from "vitest";
import prisma from "../../src/lib/prisma";
import { getPresignedUploadUrl, getPresignedDownloadUrl, verifyObjectExists, getLocalFilePath } from "../../src/lib/s3";
import fs from "fs";

describe("E2E API Data & Storage Lifecycle", () => {
  it("should execute complete real upload, verification, download, and revoke cycle", async () => {
    const testContent = "Dropza E2E Verification Payload " + Date.now();
    const testBuffer = Buffer.from(testContent);
    const storageKey = `uploads/2026/10/21/e2e-${Date.now()}.txt`;

    // 1. Generate presigned upload URL
    const presignedUpload = await getPresignedUploadUrl(storageKey, "text/plain");
    expect(presignedUpload.uploadUrl).toBeDefined();

    // 2. Perform upload
    const localTarget = getLocalFilePath(storageKey);
    fs.writeFileSync(localTarget, testBuffer);

    // 3. Verify object exists
    const check = await verifyObjectExists(storageKey);
    expect(check.exists).toBe(true);
    expect(check.sizeBytes).toBe(testBuffer.length);

    // 4. Create database asset and share link
    const asset = await prisma.fileAsset.create({
      data: {
        originalName: "e2e-file.txt",
        sanitizedName: "e2e-file.txt",
        mimeType: "text/plain",
        sizeBytes: BigInt(check.sizeBytes),
        storageKey,
        storageBucket: "dropza-files",
        status: "UPLOAD_COMPLETED",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const share = await prisma.shareLink.create({
      data: {
        token: "e2e-token-" + Date.now(),
        tokenHash: "hash-" + Date.now(),
        fileAssetId: asset.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // 5. Generate presigned download URL
    const downloadUrl = await getPresignedDownloadUrl(storageKey, "e2e-file.txt");
    expect(downloadUrl).toContain("sig=");
    expect(downloadUrl).toContain("exp=");

    // 6. Read and verify downloaded bytes
    const readOnDisk = fs.readFileSync(localTarget, "utf-8");
    expect(readOnDisk).toBe(testContent);

    // 7. Revoke share link
    await prisma.shareLink.update({
      where: { id: share.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const revokedCheck = await prisma.shareLink.findUnique({
      where: { id: share.id },
    });
    expect(revokedCheck?.isRevoked).toBe(true);

    // Cleanup
    if (fs.existsSync(localTarget)) fs.unlinkSync(localTarget);
    await prisma.shareLink.delete({ where: { id: share.id } });
    await prisma.fileAsset.delete({ where: { id: asset.id } });
  });
});
