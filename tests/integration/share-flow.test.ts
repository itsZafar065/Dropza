import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "../../src/lib/prisma";
import { generateSecureToken, hashToken, hashPassword, verifyPassword, hashIp } from "../../src/lib/crypto";

describe("Share Link Flow & Persistence", () => {
  let createdAssetId: string;
  let createdShareId: string;

  beforeEach(async () => {
    // Create real test FileAsset in DB
    const asset = await prisma.fileAsset.create({
      data: {
        originalName: "contract.pdf",
        sanitizedName: "contract.pdf",
        mimeType: "application/pdf",
        sizeBytes: BigInt(2048),
        storageKey: "uploads/test/contract.pdf",
        storageBucket: "dropza-files",
        status: "UPLOAD_COMPLETED",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    createdAssetId = asset.id;
  });

  afterEach(async () => {
    if (createdShareId) {
      await prisma.shareLink.deleteMany({ where: { id: createdShareId } });
    }
    if (createdAssetId) {
      await prisma.fileAsset.deleteMany({ where: { id: createdAssetId } });
    }
  });

  it("should create a share link and resolve it by tokenHash", async () => {
    const rawToken = generateSecureToken(20);
    const tokenHash = hashToken(rawToken);

    const share = await prisma.shareLink.create({
      data: {
        token: rawToken,
        tokenHash,
        fileAssetId: createdAssetId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        maxDownloads: 5,
        downloadCount: 0,
      },
    });
    createdShareId = share.id;

    const resolved = await prisma.shareLink.findUnique({
      where: { tokenHash },
      include: { fileAsset: true },
    });

    expect(resolved).not.toBeNull();
    expect(resolved?.token).toBe(rawToken);
    expect(resolved?.fileAsset.originalName).toBe("contract.pdf");
    expect(resolved?.isRevoked).toBe(false);
  });

  it("should support password hashing and verification on protected shares", async () => {
    const rawToken = generateSecureToken(20);
    const tokenHash = hashToken(rawToken);
    const secretPass = "TopSecret123!";
    const passwordHash = await hashPassword(secretPass);

    const share = await prisma.shareLink.create({
      data: {
        token: rawToken,
        tokenHash,
        fileAssetId: createdAssetId,
        passwordHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    createdShareId = share.id;

    // Correct password verification
    const isCorrect = await verifyPassword(secretPass, share.passwordHash!);
    expect(isCorrect).toBe(true);

    // Incorrect password verification
    const isWrong = await verifyPassword("WrongPassword", share.passwordHash!);
    expect(isWrong).toBe(false);
  });

  it("should enforce link revocation immediately", async () => {
    const rawToken = generateSecureToken(20);
    const tokenHash = hashToken(rawToken);

    const share = await prisma.shareLink.create({
      data: {
        token: rawToken,
        tokenHash,
        fileAssetId: createdAssetId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    createdShareId = share.id;

    // Revoke link
    const revoked = await prisma.shareLink.update({
      where: { id: share.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    expect(revoked.isRevoked).toBe(true);
    expect(revoked.revokedAt).not.toBeNull();
  });

  it("should query active files grouped by network guestSessionId and support network clearing", async () => {
    const testIp = "192.168.1.50";
    const networkId = hashIp(testIp);
    const rawToken = generateSecureToken(20);
    const tokenHash = hashToken(rawToken);

    const share = await prisma.shareLink.create({
      data: {
        token: rawToken,
        tokenHash,
        fileAssetId: createdAssetId,
        guestSessionId: networkId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    createdShareId = share.id;

    // Query active files for this network
    const networkFiles = await prisma.shareLink.findMany({
      where: {
        guestSessionId: networkId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
        fileAsset: { status: "UPLOAD_COMPLETED" },
      },
      include: { fileAsset: true },
    });

    expect(networkFiles.length).toBeGreaterThanOrEqual(1);
    const found = networkFiles.find((f) => f.token === rawToken);
    expect(found).toBeDefined();
    expect(found?.fileAsset.originalName).toBe("contract.pdf");

    // Clear network
    const batchRevoke = await prisma.shareLink.updateMany({
      where: { guestSessionId: networkId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    expect(batchRevoke.count).toBeGreaterThanOrEqual(1);

    const afterRevoke = await prisma.shareLink.findMany({
      where: { guestSessionId: networkId, isRevoked: false },
    });
    expect(afterRevoke.length).toBe(0);
  });
});
