import { describe, it, expect } from "vitest";
import {
  initiateUploadSchema,
  createTextShareSchema,
  reportAbuseSchema,
  completeUploadSchema,
} from "@/lib/validations";

describe("Input Validation Schemas", () => {
  it("should validate legitimate file upload initiation payloads", () => {
    const valid = {
      files: [
        { name: "document.pdf", sizeBytes: 1048576, mimeType: "application/pdf" },
        { name: "photo.jpg", sizeBytes: 2048000, mimeType: "image/jpeg" },
      ],
      expiryHours: "24",
      password: "optionalPassword",
      maxDownloads: 10,
    };

    const res = initiateUploadSchema.safeParse(valid);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.expiryHours).toBe(24);
      expect(res.data.files).toHaveLength(2);
    }
  });

  it("should reject initiate payloads with empty file arrays", () => {
    const invalid = {
      files: [],
      expiryHours: "24",
    };
    const res = initiateUploadSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("should validate text share payload and detect invalid length", () => {
    const validText = {
      content: "This is a test snippet",
      isUrl: false,
      expiryHours: "1",
    };
    expect(createTextShareSchema.safeParse(validText).success).toBe(true);

    const emptyText = {
      content: "",
      isUrl: false,
      expiryHours: "1",
    };
    expect(createTextShareSchema.safeParse(emptyText).success).toBe(false);

    // Over 50,000 characters
    const hugeText = {
      content: "a".repeat(50001),
      isUrl: false,
      expiryHours: "1",
    };
    expect(createTextShareSchema.safeParse(hugeText).success).toBe(false);
  });

  it("should validate abuse reporting schemas", () => {
    const validReport = {
      targetType: "share",
      targetId: "token-123456",
      reason: "malware_or_virus",
      details: "Detected trojan executable inside archive",
    };
    expect(reportAbuseSchema.safeParse(validReport).success).toBe(true);

    const invalidReason = {
      targetType: "share",
      targetId: "token-123456",
      reason: "arbitrary_unsupported_reason",
    };
    expect(reportAbuseSchema.safeParse(invalidReason).success).toBe(false);
  });
});
