import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const s3Endpoint = process.env.S3_ENDPOINT;
const s3Region = process.env.S3_REGION || "us-east-1";
const s3Bucket = process.env.S3_BUCKET || "dropza-files";
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

export const isS3Configured = Boolean(
  accessKeyId &&
  secretAccessKey &&
  !accessKeyId.includes("replace-with") &&
  !secretAccessKey.includes("replace-with")
);

export const s3Client = isS3Configured
  ? new S3Client({
      region: s3Region,
      endpoint: s3Endpoint,
      forcePathStyle: forcePathStyle,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : null;

/**
 * Generate a secure, unique, unpredictable storage key
 */
export function generateStorageKey(extension: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const randomHex = crypto.randomBytes(12).toString("hex");
  const cleanExt = extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  return `uploads/${dateStr}/${randomHex}.${cleanExt}`;
}

/**
 * Generate cryptographic signature for local storage presigned simulation
 */
export function generateLocalSignedToken(
  action: "get" | "put",
  storageKey: string,
  expiresAtTimestamp: number
): string {
  const secret = process.env.NEXTAUTH_SECRET || "dropza-storage-signing-secret-default";
  return crypto
    .createHmac("sha256", secret)
    .update(`${action}:${storageKey}:${expiresAtTimestamp}`)
    .digest("hex");
}

/**
 * Verify cryptographic signature for local storage presigned simulation
 */
export function verifyLocalSignedToken(
  action: "get" | "put",
  storageKey: string,
  expiresAtTimestamp: number,
  providedSignature: string
): boolean {
  if (Date.now() > expiresAtTimestamp) {
    return false;
  }
  const expected = generateLocalSignedToken(action, storageKey, expiresAtTimestamp);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(providedSignature));
  } catch {
    return false;
  }
}

/**
 * Generate short-lived presigned URL for uploading a file (PUT)
 * Lifetime: 15 minutes (900 seconds)
 */
export async function getPresignedUploadUrl(
  storageKey: string,
  contentType: string,
  expiresInSeconds: number = 900,
  baseOrigin?: string
): Promise<{ uploadUrl: string; method: string; headers: Record<string, string> }> {
  if (!isS3Configured || !s3Client) {
    const origin = (baseOrigin || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const sig = generateLocalSignedToken("put", storageKey, expiresAt);
    const uploadUrl = origin
      ? `${origin}/api/storage/local?key=${encodeURIComponent(storageKey)}&exp=${expiresAt}&sig=${sig}`
      : `/api/storage/local?key=${encodeURIComponent(storageKey)}&exp=${expiresAt}&sig=${sig}`;
    return {
      uploadUrl,
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
    };
  }

  const command = new PutObjectCommand({
    Bucket: s3Bucket,
    Key: storageKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    uploadUrl,
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
  };
}

/**
 * Generate short-lived presigned URL for downloading a file (GET)
 * Lifetime: 5 minutes (300 seconds)
 */
export async function getPresignedDownloadUrl(
  storageKey: string,
  downloadFilename: string,
  expiresInSeconds: number = 300,
  baseOrigin?: string
): Promise<string> {
  if (!isS3Configured || !s3Client) {
    const origin = (baseOrigin || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const base = origin || "";
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const sig = generateLocalSignedToken("get", storageKey, expiresAt);
    return `${base}/api/storage/local?key=${encodeURIComponent(storageKey)}&filename=${encodeURIComponent(downloadFilename)}&exp=${expiresAt}&sig=${sig}`;
  }

  const command = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: storageKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(downloadFilename)}"`,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generate short-lived presigned URL for inline preview of an image, video or PDF
 * Lifetime: 15 minutes (900 seconds)
 */
export async function getPresignedPreviewUrl(
  storageKey: string,
  contentType: string,
  expiresInSeconds: number = 900,
  baseOrigin?: string
): Promise<string> {
  if (!isS3Configured || !s3Client) {
    const origin = (baseOrigin || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const base = origin || "";
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const sig = generateLocalSignedToken("get", storageKey, expiresAt);
    return `${base}/api/storage/local?key=${encodeURIComponent(storageKey)}&exp=${expiresAt}&sig=${sig}`;
  }

  const command = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: storageKey,
    ResponseContentType: contentType,
    ResponseContentDisposition: "inline",
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Verify if object exists in storage and return its actual byte size
 */
export async function verifyObjectExists(
  storageKey: string
): Promise<{ exists: boolean; sizeBytes: number; contentType?: string }> {
  if (!isS3Configured || !s3Client) {
    try {
      const localPath = getLocalFilePath(storageKey);
      if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        return { exists: true, sizeBytes: stats.size };
      }
      return { exists: false, sizeBytes: 0 };
    } catch {
      return { exists: false, sizeBytes: 0 };
    }
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: s3Bucket,
      Key: storageKey,
    });
    const response = await s3Client.send(command);
    return {
      exists: true,
      sizeBytes: response.ContentLength || 0,
      contentType: response.ContentType,
    };
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return { exists: false, sizeBytes: 0 };
    }
    throw err;
  }
}

/**
 * Delete object from storage
 */
export async function deleteObject(storageKey: string): Promise<boolean> {
  if (!isS3Configured || !s3Client) {
    try {
      const localPath = getLocalFilePath(storageKey);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: s3Bucket,
      Key: storageKey,
    });
    await s3Client.send(command);
    return true;
  } catch (err) {
    console.error("Failed to delete object from S3:", err);
    return false;
  }
}

/**
 * Local file storage path helper (dev fallback) with strict path traversal protection
 */
export function getLocalFilePath(storageKey: string): string {
  if (
    storageKey.includes("..") ||
    storageKey.startsWith("/") ||
    storageKey.startsWith("\\")
  ) {
    throw new Error("Invalid storage key: Path traversal attempt detected");
  }

  const baseDir = path.resolve(process.cwd(), ".dropza_storage");
  const sanitized = storageKey.replace(/[^a-zA-Z0-9_\-\.\/]/g, "_");
  const fullPath = path.resolve(baseDir, sanitized);

  if (!fullPath.startsWith(baseDir)) {
    throw new Error("Invalid storage key: Path traversal attempt detected");
  }

  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return fullPath;
}
