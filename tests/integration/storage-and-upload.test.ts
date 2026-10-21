import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  generateStorageKey,
  generateLocalSignedToken,
  verifyLocalSignedToken,
  getLocalFilePath,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  verifyObjectExists,
  deleteObject,
} from "../../src/lib/s3";
import { BLOCKED_EXTENSIONS } from "../../src/lib/validations";

describe("Storage Engine & Upload Security", () => {
  const testStorageKey = "uploads/2026/10/21/test-file-unit.txt";

  afterEach(() => {
    try {
      const fullPath = getLocalFilePath(testStorageKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch {
      // ignore
    }
  });

  it("should generate unpredictable, safe storage keys without dangerous characters", () => {
    const key1 = generateStorageKey("pdf");
    const key2 = generateStorageKey("../evil.sh");

    expect(key1).toMatch(/^uploads\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]+\.pdf$/);
    // Path traversal in extension must be stripped to safe alphanumeric
    expect(key2).not.toContain("..");
    expect(key2.endsWith(".evilsh")).toBe(true);
  });

  it("should strictly prevent path traversal attacks in getLocalFilePath", () => {
    expect(() => {
      getLocalFilePath("../../etc/passwd");
    }).toThrow(/Path traversal/);

    expect(() => {
      getLocalFilePath("uploads/../../../windows/system32/cmd.exe");
    }).toThrow(/Path traversal/);
  });

  it("should generate and verify cryptographic HMAC signatures for presigned URLs", () => {
    const expiresAt = Date.now() + 60000; // 1 min in future
    const token = generateLocalSignedToken("get", testStorageKey, expiresAt);

    // Valid signature and unexpired
    expect(verifyLocalSignedToken("get", testStorageKey, expiresAt, token)).toBe(true);

    // Tampered action
    expect(verifyLocalSignedToken("put", testStorageKey, expiresAt, token)).toBe(false);

    // Tampered key
    expect(verifyLocalSignedToken("get", "different/key.txt", expiresAt, token)).toBe(false);

    // Tampered signature
    expect(verifyLocalSignedToken("get", testStorageKey, expiresAt, "invalid-sig")).toBe(false);

    // Expired token
    const pastExpiresAt = Date.now() - 1000;
    const expiredToken = generateLocalSignedToken("get", testStorageKey, pastExpiresAt);
    expect(verifyLocalSignedToken("get", testStorageKey, pastExpiresAt, expiredToken)).toBe(false);
  });

  it("should verify existence and delete real objects accurately", async () => {
    // Write real test file
    const filePath = getLocalFilePath(testStorageKey);
    fs.writeFileSync(filePath, "Dropza real storage test data 2026");

    const check = await verifyObjectExists(testStorageKey);
    expect(check.exists).toBe(true);
    expect(check.sizeBytes).toBeGreaterThan(0);

    const deleted = await deleteObject(testStorageKey);
    expect(deleted).toBe(true);

    const checkAfter = await verifyObjectExists(testStorageKey);
    expect(checkAfter.exists).toBe(false);
  });

  it("should have BLOCKED_EXTENSIONS list containing high-risk executables", () => {
    expect(BLOCKED_EXTENSIONS).toContain("exe");
    expect(BLOCKED_EXTENSIONS).toContain("bat");
    expect(BLOCKED_EXTENSIONS).toContain("msi");
    expect(BLOCKED_EXTENSIONS).toContain("ps1");
  });
});
