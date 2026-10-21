import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing seed data
  await prisma.abuseReport.deleteMany({});
  await prisma.downloadEvent.deleteMany({});
  await prisma.shareLink.deleteMany({});
  await prisma.fileAsset.deleteMany({});
  await prisma.textShare.deleteMany({});
  await prisma.transferRoom.deleteMany({});
  await prisma.user.deleteMany({});

  const userPasswordHash = await bcrypt.hash("Password123!", 10);
  const adminPasswordHash = await bcrypt.hash("AdminPass123!", 10);

  const demoUser = await prisma.user.create({
    data: {
      email: "user@dropza.local",
      name: "Demo User",
      passwordHash: userPasswordHash,
      role: "USER",
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@dropza.local",
      name: "Dropza Administrator",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  console.log("Users created:", { demoUser: demoUser.email, adminUser: adminUser.email });

  // Ensure genuine physical seed file exists in local storage
  const seedStorageDir = path.resolve(process.cwd(), ".dropza_storage", "uploads", "seed");
  if (!fs.existsSync(seedStorageDir)) {
    fs.mkdirSync(seedStorageDir, { recursive: true });
  }

  const seedFilePath = path.join(seedStorageDir, "dropza-quickstart-guide.pdf");
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 176 >>
stream
BT
/F1 24 Tf
100 700 Td
(Welcome to Dropza Quickstart Guide) Tj
0 -40 Td
/F1 12 Tf
(Dropza is a secure, private, zero-cloud peer-to-peer and cloud file sharing platform.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000473 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
555
%%EOF`;

  fs.writeFileSync(seedFilePath, pdfContent);
  const actualSizeBytes = fs.statSync(seedFilePath).size;

  const demoFile = await prisma.fileAsset.create({
    data: {
      originalName: "dropza-quickstart-guide.pdf",
      sanitizedName: "dropza-quickstart-guide.pdf",
      mimeType: "application/pdf",
      sizeBytes: BigInt(actualSizeBytes),
      storageKey: "uploads/seed/dropza-quickstart-guide.pdf",
      storageBucket: "dropza-files",
      status: "UPLOAD_COMPLETED",
      userId: demoUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  const demoToken = "demo-dropza-token-12345";
  const demoTokenHash = crypto.createHash("sha256").update(demoToken).digest("hex");

  await prisma.shareLink.create({
    data: {
      token: demoToken,
      tokenHash: demoTokenHash,
      fileAssetId: demoFile.id,
      userId: demoUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxDownloads: 50,
      downloadCount: 0,
    },
  });

  // Create demo text share
  await prisma.textShare.create({
    data: {
      token: "demo-welcome-note",
      content: "Welcome to Dropza! This is a secure text snippet shared across devices without logging in.",
      isUrl: false,
      userId: demoUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log("Database seeded successfully with genuine file assets!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
