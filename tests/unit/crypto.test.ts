import { describe, it, expect } from "vitest";
import { generateSecureToken, hashToken, generateRoomCode, hashPassword, verifyPassword } from "@/lib/crypto";

describe("Cryptographic Utilities", () => {
  it("should generate unpredictable tokens with correct length", () => {
    const token1 = generateSecureToken(16);
    const token2 = generateSecureToken(16);
    expect(token1).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(token2).toHaveLength(32);
    expect(token1).not.toBe(token2);
  });

  it("should generate deterministic SHA-256 token hashes", () => {
    const token = "dropza-secure-token-test-123";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hashToken("different-token")).not.toBe(hash1);
  });

  it("should generate valid 6-character room codes without confusing chars", () => {
    const code = generateRoomCode(6);
    expect(code).toHaveLength(6);
    // Should only contain unambiguous characters: 2-9 and A-Z (excluding 0, 1, I, O)
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  it("should hash and verify passwords using bcrypt", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2")).toBe(true);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword("WrongPassword!", hash);
    expect(isWrongMatch).toBe(false);
  });
});
