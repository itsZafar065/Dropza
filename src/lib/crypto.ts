import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Generate a cryptographically secure random token (URL-safe hex or base64url)
 */
export function generateSecureToken(byteLength: number = 24): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Deterministic SHA-256 hash for database token lookups
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a short, human-friendly, unambiguous 6-character room code (e.g., 'K7N9XP')
 */
export function generateRoomCode(length: number = 6): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // omitted 0, 1, I, O to avoid confusion
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compare plain password against hash
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Hash IP address for privacy-conscious logging / abuse detection
 */
export function hashIp(ip: string): string {
  const salt = process.env.NEXTAUTH_SECRET || "dropza-privacy-salt";
  return crypto.createHash("sha256").update(ip + salt).digest("hex").substring(0, 32);
}
