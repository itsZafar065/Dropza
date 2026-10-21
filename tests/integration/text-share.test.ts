import { describe, it, expect, afterEach } from "vitest";
import prisma from "../../src/lib/prisma";
import { generateSecureToken, hashPassword, verifyPassword } from "../../src/lib/crypto";

describe("Text Sharing & Snippet Persistence", () => {
  let createdTextId: string | null = null;

  afterEach(async () => {
    if (createdTextId) {
      await prisma.textShare.deleteMany({ where: { id: createdTextId } });
    }
  });

  it("should persist plain text snippet with view limits and expiration", async () => {
    const token = generateSecureToken(16);
    const text = await prisma.textShare.create({
      data: {
        token,
        content: "Wi-Fi Key: DropzaOffice2026!",
        isUrl: false,
        maxViews: 3,
        viewCount: 0,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    createdTextId = text.id;

    expect(text.token).toBe(token);
    expect(text.content).toContain("Wi-Fi Key");

    // Simulate view count increment
    const updated = await prisma.textShare.update({
      where: { id: text.id },
      data: { viewCount: { increment: 1 } },
    });
    expect(updated.viewCount).toBe(1);
  });

  it("should support password protected text snippet", async () => {
    const token = generateSecureToken(16);
    const pass = "SnippetPass123!";
    const passwordHash = await hashPassword(pass);

    const text = await prisma.textShare.create({
      data: {
        token,
        content: "Confidential credentials",
        isUrl: false,
        passwordHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    createdTextId = text.id;

    const correct = await verifyPassword(pass, text.passwordHash!);
    expect(correct).toBe(true);

    const incorrect = await verifyPassword("Wrong", text.passwordHash!);
    expect(incorrect).toBe(false);
  });

  it("should record abuse reports in the database", async () => {
    const report = await prisma.abuseReport.create({
      data: {
        reporterIpHash: "test-reporter-hash",
        reason: "phishing_or_scam",
        details: "Suspicious login page link",
        status: "PENDING",
      },
    });

    expect(report.id).toBeDefined();
    expect(report.status).toBe("PENDING");

    await prisma.abuseReport.delete({ where: { id: report.id } });
  });
});
