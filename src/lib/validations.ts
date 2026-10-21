import { z } from "zod";

export const BLOCKED_EXTENSIONS = [
  "exe", "bat", "cmd", "vbs", "msi", "ps1", "scr", "pif", "com", "jar", "hta"
];

export const uploadFileItemSchema = z.object({
  name: z.string().min(1).max(255),
  sizeBytes: z.number().positive(),
  mimeType: z.string().min(1).max(128).default("application/octet-stream"),
});

export const initiateUploadSchema = z.object({
  files: z.array(uploadFileItemSchema).min(1).max(20),
  expiryHours: z.enum(["1", "24", "168"]).transform((val) => parseInt(val, 10)),
  password: z.string().max(100).optional(),
  maxDownloads: z.number().int().min(1).max(10000).optional(),
});

export const completeUploadSchema = z.object({
  fileAssetId: z.string().uuid(),
  storageKey: z.string().min(5),
  checksumSha256: z.string().length(64).optional(),
});

export const createShareLinkSchema = z.object({
  fileAssetId: z.string().uuid(),
  expiryHours: z.number().int().min(1).max(168).default(24),
  password: z.string().min(4).max(100).optional(),
  maxDownloads: z.number().int().min(1).max(10000).optional(),
});

export const verifySharePasswordSchema = z.object({
  password: z.string().min(1).max(100),
});

export const createTextShareSchema = z.object({
  content: z.string().min(1, "Text content is required").max(50000, "Maximum 50,000 characters allowed"),
  isUrl: z.boolean().default(false),
  expiryHours: z.enum(["1", "24", "168"]).transform((val) => parseInt(val, 10)).default("24"),
  password: z.string().min(4).max(100).optional(),
  maxViews: z.number().int().min(1).max(10000).optional(),
});

export const reportAbuseSchema = z.union([
  z.object({
    targetType: z.enum(["share", "file", "text"]),
    targetId: z.string().min(1),
    reason: z.enum([
      "malware_or_virus",
      "phishing_or_scam",
      "copyright_infringement",
      "illegal_content",
      "harassment",
      "other",
    ]),
    details: z.string().max(1000).optional(),
  }),
  z.object({
    shareToken: z.string().min(1),
    reason: z.enum([
      "malware_or_virus",
      "phishing_or_scam",
      "copyright_infringement",
      "illegal_content",
      "harassment",
      "other",
    ]),
    details: z.string().max(1000).optional(),
  }).transform((val) => ({
    targetType: "share" as const,
    targetId: val.shareToken,
    reason: val.reason,
    details: val.details,
  })),
]);

export const createTransferRoomSchema = z.object({
  roomCode: z.string().min(4).max(10).optional(),
  hostPeerId: z.string().min(4).max(64),
  pin: z.string().length(4).regex(/^\d+$/, "PIN must be 4 digits").optional(),
});

export const joinTransferRoomSchema = z.object({
  roomCode: z.string().min(4).max(10),
  peerId: z.string().min(4).max(64),
  pin: z.string().length(4).regex(/^\d+$/, "PIN must be 4 digits").optional(),
});

export const authRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  name: z.string().min(2).max(50).optional(),
});

export const authLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
